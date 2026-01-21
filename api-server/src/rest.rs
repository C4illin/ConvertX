//! REST API module
//!
//! Provides REST endpoints for file conversion operations.

use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde_json::json;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use uuid::Uuid;

use crate::auth::RequireAuth;
use crate::error::{ApiError, ApiResult};
use crate::models::{
    CreateJobResponse, HealthResponse, JobStatusResponse, ListEnginesResponse, ListJobsResponse,
};
use crate::AppState;

/// Create REST API routes
pub fn routes() -> Router<AppState> {
    Router::new()
        // Health check (no auth required)
        .route("/health", get(health_check))
        .route("/api/v1/health", get(health_check))
        // Protected routes
        .route("/api/v1/engines", get(list_engines))
        .route("/api/v1/engines/:engine_id", get(get_engine))
        .route("/api/v1/engines/:engine_id/conversions", get(get_engine_conversions))
        .route("/api/v1/convert", post(create_conversion_job))
        .route("/api/v1/jobs", get(list_jobs))
        .route("/api/v1/jobs/:job_id", get(get_job_status))
        .route("/api/v1/jobs/:job_id", delete(delete_job))
        .route("/api/v1/jobs/:job_id/download", get(download_result))
}

/// Health check endpoint
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now(),
    })
}

/// List all available conversion engines
async fn list_engines(
    State(state): State<AppState>,
    RequireAuth(_user): RequireAuth,
) -> Json<ListEnginesResponse> {
    let engines = state.engine_registry.list_info();
    Json(ListEnginesResponse { engines })
}

/// Get a specific engine's details
async fn get_engine(
    State(state): State<AppState>,
    RequireAuth(_user): RequireAuth,
    Path(engine_id): Path<String>,
) -> ApiResult<impl IntoResponse> {
    let engine = state
        .engine_registry
        .get(&engine_id)
        .ok_or_else(|| ApiError::EngineNotFound(engine_id.clone()))?;

    Ok(Json(engine.to_info()))
}

/// Get supported conversions for an engine
async fn get_engine_conversions(
    State(state): State<AppState>,
    RequireAuth(_user): RequireAuth,
    Path(engine_id): Path<String>,
) -> ApiResult<impl IntoResponse> {
    let engine = state
        .engine_registry
        .get(&engine_id)
        .ok_or_else(|| ApiError::EngineNotFound(engine_id.clone()))?;

    Ok(Json(json!({
        "engine_id": engine.id,
        "conversions": engine.conversions,
    })))
}

/// Create a new conversion job
/// 
/// Expects multipart form data with:
/// - file: The file to convert
/// - engine: The conversion engine to use
/// - target_format: The target format
/// - options: (optional) JSON string of conversion options
async fn create_conversion_job(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    mut multipart: Multipart,
) -> ApiResult<impl IntoResponse> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut engine: Option<String> = None;
    let mut target_format: Option<String> = None;
    let mut options: Option<serde_json::Value> = None;

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await
        .map_err(|e| ApiError::BadRequest(format!("Failed to read multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or_default().to_string();

        match name.as_str() {
            "file" => {
                filename = field.file_name().map(|s| s.to_string());
                let data = field.bytes().await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read file: {}", e)))?;
                
                // Check file size
                if data.len() > state.config.max_file_size {
                    return Err(ApiError::FileTooLarge {
                        max_size: state.config.max_file_size,
                    });
                }
                
                file_data = Some(data.to_vec());
            }
            "engine" => {
                let text = field.text().await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read engine: {}", e)))?;
                engine = Some(text);
            }
            "target_format" => {
                let text = field.text().await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read target_format: {}", e)))?;
                target_format = Some(text);
            }
            "options" => {
                let text = field.text().await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read options: {}", e)))?;
                if !text.is_empty() {
                    options = Some(serde_json::from_str(&text)
                        .map_err(|e| ApiError::BadRequest(format!("Invalid options JSON: {}", e)))?);
                }
            }
            _ => {
                // Ignore unknown fields
            }
        }
    }

    // Validate required fields
    let file_data = file_data.ok_or_else(|| ApiError::BadRequest("Missing file".into()))?;
    let filename = filename.ok_or_else(|| ApiError::BadRequest("Missing filename".into()))?;
    let engine = engine.ok_or_else(|| ApiError::BadRequest("Missing engine parameter".into()))?;
    let target_format = target_format
        .ok_or_else(|| ApiError::BadRequest("Missing target_format parameter".into()))?;

    // Create the conversion job
    let job = state
        .conversion_service
        .create_job(user.user_id, filename, engine, target_format, options, file_data)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateJobResponse {
            job_id: job.id,
            status: job.status,
            message: "Conversion job created successfully".to_string(),
        }),
    ))
}

/// List all jobs for the authenticated user
async fn list_jobs(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
) -> Json<ListJobsResponse> {
    let jobs = state.conversion_service.get_user_jobs(&user.user_id).await;
    let job_responses: Vec<JobStatusResponse> = jobs.iter().map(|j| j.into()).collect();
    let total = job_responses.len();
    
    Json(ListJobsResponse {
        jobs: job_responses,
        total,
    })
}

/// Get the status of a specific job
async fn get_job_status(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Path(job_id): Path<Uuid>,
) -> ApiResult<Json<JobStatusResponse>> {
    let job = state.conversion_service.get_job(job_id).await?;

    // Verify ownership
    if job.user_id != user.user_id {
        return Err(ApiError::Unauthorized("Not authorized to view this job".into()));
    }

    Ok(Json((&job).into()))
}

/// Delete a job
async fn delete_job(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Path(job_id): Path<Uuid>,
) -> ApiResult<impl IntoResponse> {
    state
        .conversion_service
        .delete_job(job_id, &user.user_id)
        .await?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Job deleted successfully",
            "job_id": job_id,
        })),
    ))
}

/// Download the converted file
async fn download_result(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Path(job_id): Path<Uuid>,
) -> ApiResult<impl IntoResponse> {
    let file_path = state
        .conversion_service
        .get_output_file(job_id, &user.user_id)
        .await?;

    // Read file
    let mut file = File::open(&file_path).await
        .map_err(|e| ApiError::InternalError(format!("Failed to open file: {}", e)))?;

    let mut contents = Vec::new();
    file.read_to_end(&mut contents).await
        .map_err(|e| ApiError::InternalError(format!("Failed to read file: {}", e)))?;

    // Determine content type
    let content_type = mime_guess::from_path(&file_path)
        .first_or_octet_stream()
        .to_string();

    let filename = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download");

    Ok((
        StatusCode::OK,
        [
            ("content-type", content_type),
            (
                "content-disposition",
                format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        contents,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_routes_are_defined() {
        // Just verify routes can be created
        let _routes = routes();
    }
}
