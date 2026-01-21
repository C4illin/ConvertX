//! GraphQL API module
//!
//! Provides GraphQL endpoints for file conversion operations.

use std::sync::Arc;

use async_graphql::{
    Context, EmptySubscription, Enum, InputObject, Object, Result as GqlResult, Schema,
    SimpleObject, Upload, ID,
};
use axum::{
    extract::State,
    http::HeaderMap,
    routing::{get, post},
    Router,
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::auth::{JwtValidator, AuthenticatedUser, Claims};
use crate::engine::EngineRegistry;
use crate::conversion::ConversionService;
use crate::config::Config;
use crate::error::ConversionSuggestion;
use crate::models::JobStatus;

/// GraphQL Schema type
pub type ApiSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

/// Create GraphQL routes
pub fn routes() -> Router<crate::AppState> {
    Router::new()
        .route("/graphql", post(graphql_handler))
        .route("/graphql", get(graphql_playground))
}

/// GraphQL handler
async fn graphql_handler(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let schema = build_schema(
        state.engine_registry.clone(),
        state.conversion_service.clone(),
        state.config.clone(),
    );

    // Extract JWT from headers and add to context
    let mut request = req.into_inner();
    
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            request = request.data(AuthHeader(auth_str.to_string()));
        }
    }

    schema.execute(request).await.into()
}

/// GraphQL Playground handler
async fn graphql_playground() -> impl axum::response::IntoResponse {
    axum::response::Html(async_graphql::http::playground_source(
        async_graphql::http::GraphQLPlaygroundConfig::new("/graphql"),
    ))
}

/// Build the GraphQL schema
pub fn build_schema(
    engine_registry: Arc<EngineRegistry>,
    conversion_service: Arc<ConversionService>,
    config: Arc<Config>,
) -> ApiSchema {
    Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(engine_registry)
        .data(conversion_service)
        .data(config)
        .finish()
}

/// Authorization header wrapper
struct AuthHeader(String);

/// Validate JWT from context
fn validate_auth(ctx: &Context<'_>) -> GqlResult<AuthenticatedUser> {
    let config = ctx.data::<Arc<Config>>()?;
    let auth_header = ctx.data::<AuthHeader>()
        .map_err(|_| async_graphql::Error::new("Missing authorization header"))?;

    let validator = JwtValidator::new(&config.jwt_secret);
    
    let token = JwtValidator::extract_token(&auth_header.0)
        .map_err(|e| async_graphql::Error::new(e.to_string()))?;
    
    let claims = validator.validate(token)
        .map_err(|e| async_graphql::Error::new(e.to_string()))?;

    Ok(AuthenticatedUser {
        user_id: claims.sub.clone(),
        email: claims.email.clone(),
        roles: claims.roles.clone(),
        claims,
    })
}

// ============ GraphQL Types ============

/// Job status enum for GraphQL
#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum GqlJobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

impl From<JobStatus> for GqlJobStatus {
    fn from(status: JobStatus) -> Self {
        match status {
            JobStatus::Pending => GqlJobStatus::Pending,
            JobStatus::Processing => GqlJobStatus::Processing,
            JobStatus::Completed => GqlJobStatus::Completed,
            JobStatus::Failed => GqlJobStatus::Failed,
        }
    }
}

/// Engine information
#[derive(SimpleObject)]
pub struct GqlEngine {
    /// Engine identifier
    pub id: ID,
    /// Human-readable name
    pub name: String,
    /// Description
    pub description: String,
    /// Supported input formats
    pub supported_input_formats: Vec<String>,
    /// Supported output formats  
    pub supported_output_formats: Vec<String>,
}

/// Conversion job
#[derive(SimpleObject)]
pub struct GqlJob {
    /// Unique job identifier
    pub id: ID,
    /// Original filename
    pub original_filename: String,
    /// Source format
    pub source_format: String,
    /// Target format
    pub target_format: String,
    /// Engine used
    pub engine: String,
    /// Current status
    pub status: GqlJobStatus,
    /// Output filename (when completed)
    pub output_filename: Option<String>,
    /// Error message (when failed)
    pub error_message: Option<String>,
    /// Download URL (when completed)
    pub download_url: Option<String>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Completion timestamp
    pub completed_at: Option<DateTime<Utc>>,
}

/// Conversion suggestion
#[derive(SimpleObject)]
pub struct GqlSuggestion {
    /// Suggested engine
    pub engine: String,
    /// Source format
    pub from: String,
    /// Target format
    pub to: String,
}

impl From<ConversionSuggestion> for GqlSuggestion {
    fn from(s: ConversionSuggestion) -> Self {
        Self {
            engine: s.engine,
            from: s.from,
            to: s.to,
        }
    }
}

/// Conversion error with suggestions
#[derive(SimpleObject)]
pub struct GqlConversionError {
    /// Error code
    pub code: String,
    /// Error message
    pub message: String,
    /// Suggestions for alternative conversions
    pub suggestions: Vec<GqlSuggestion>,
}

/// Result of creating a job
#[derive(SimpleObject)]
pub struct CreateJobResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// The created job (if successful)
    pub job: Option<GqlJob>,
    /// Error information (if failed)
    pub error: Option<GqlConversionError>,
}

/// Input for creating a conversion job
#[derive(InputObject)]
pub struct CreateJobInput {
    /// Engine to use for conversion
    pub engine: String,
    /// Target format
    pub target_format: String,
    /// Conversion options (JSON)
    pub options: Option<String>,
}

/// Health status
#[derive(SimpleObject)]
pub struct GqlHealth {
    pub status: String,
    pub version: String,
    pub timestamp: DateTime<Utc>,
}

// ============ Query Root ============

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Health check
    async fn health(&self) -> GqlHealth {
        GqlHealth {
            status: "healthy".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            timestamp: Utc::now(),
        }
    }

    /// List all available conversion engines
    async fn engines(&self, ctx: &Context<'_>) -> GqlResult<Vec<GqlEngine>> {
        let _user = validate_auth(ctx)?;
        let registry = ctx.data::<Arc<EngineRegistry>>()?;

        let engines: Vec<GqlEngine> = registry
            .list_info()
            .into_iter()
            .map(|e| GqlEngine {
                id: ID(e.id),
                name: e.name,
                description: e.description,
                supported_input_formats: e.supported_input_formats,
                supported_output_formats: e.supported_output_formats,
            })
            .collect();

        Ok(engines)
    }

    /// Get a specific engine
    async fn engine(&self, ctx: &Context<'_>, id: ID) -> GqlResult<Option<GqlEngine>> {
        let _user = validate_auth(ctx)?;
        let registry = ctx.data::<Arc<EngineRegistry>>()?;

        Ok(registry.get(&id.0).map(|e| GqlEngine {
            id: ID(e.id.clone()),
            name: e.name.clone(),
            description: e.description.clone(),
            supported_input_formats: e.input_formats(),
            supported_output_formats: e.output_formats(),
        }))
    }

    /// Get all jobs for the authenticated user
    async fn jobs(&self, ctx: &Context<'_>) -> GqlResult<Vec<GqlJob>> {
        let user = validate_auth(ctx)?;
        let service = ctx.data::<Arc<ConversionService>>()?;

        let jobs = service.get_user_jobs(&user.user_id).await;

        Ok(jobs
            .into_iter()
            .map(|j| GqlJob {
                id: ID(j.id.to_string()),
                original_filename: j.original_filename,
                source_format: j.source_format,
                target_format: j.target_format,
                engine: j.engine,
                status: j.status.into(),
                output_filename: j.output_filename,
                error_message: j.error_message,
                download_url: if j.status == JobStatus::Completed {
                    Some(format!("/api/v1/jobs/{}/download", j.id))
                } else {
                    None
                },
                created_at: j.created_at,
                completed_at: j.completed_at,
            })
            .collect())
    }

    /// Get a specific job
    async fn job(&self, ctx: &Context<'_>, id: ID) -> GqlResult<Option<GqlJob>> {
        let user = validate_auth(ctx)?;
        let service = ctx.data::<Arc<ConversionService>>()?;

        let job_id = Uuid::parse_str(&id.0)
            .map_err(|_| async_graphql::Error::new("Invalid job ID format"))?;

        match service.get_job(job_id).await {
            Ok(job) => {
                if job.user_id != user.user_id {
                    return Err(async_graphql::Error::new("Not authorized to view this job"));
                }
                Ok(Some(GqlJob {
                    id: ID(job.id.to_string()),
                    original_filename: job.original_filename,
                    source_format: job.source_format,
                    target_format: job.target_format,
                    engine: job.engine,
                    status: job.status.into(),
                    output_filename: job.output_filename,
                    error_message: job.error_message,
                    download_url: if job.status == JobStatus::Completed {
                        Some(format!("/api/v1/jobs/{}/download", job.id))
                    } else {
                        None
                    },
                    created_at: job.created_at,
                    completed_at: job.completed_at,
                }))
            }
            Err(_) => Ok(None),
        }
    }

    /// Validate if a conversion is supported
    async fn validate_conversion(
        &self,
        ctx: &Context<'_>,
        engine: String,
        from: String,
        to: String,
    ) -> GqlResult<CreateJobResult> {
        let _user = validate_auth(ctx)?;
        let registry = ctx.data::<Arc<EngineRegistry>>()?;

        match registry.validate_conversion(&engine, &from, &to) {
            Ok(_) => Ok(CreateJobResult {
                success: true,
                job: None,
                error: None,
            }),
            Err(crate::error::ApiError::UnsupportedConversion {
                engine,
                from,
                to,
                suggestions,
            }) => Ok(CreateJobResult {
                success: false,
                job: None,
                error: Some(GqlConversionError {
                    code: "UNSUPPORTED_CONVERSION".to_string(),
                    message: format!(
                        "Conversion from {} to {} is not supported by engine {}",
                        from, to, engine
                    ),
                    suggestions: suggestions.into_iter().map(Into::into).collect(),
                }),
            }),
            Err(e) => Err(async_graphql::Error::new(e.to_string())),
        }
    }

    /// Get suggestions for a conversion
    async fn suggestions(
        &self,
        ctx: &Context<'_>,
        from: String,
        to: String,
    ) -> GqlResult<Vec<GqlSuggestion>> {
        let _user = validate_auth(ctx)?;
        let registry = ctx.data::<Arc<EngineRegistry>>()?;

        let suggestions = registry.find_suggestions(&from, &to);
        Ok(suggestions.into_iter().map(Into::into).collect())
    }
}

// ============ Mutation Root ============

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Create a new conversion job
    /// 
    /// Note: File upload via GraphQL requires multipart form handling.
    /// For file uploads, the REST API endpoint is recommended.
    /// This mutation accepts base64-encoded file data for simpler integration.
    async fn create_job(
        &self,
        ctx: &Context<'_>,
        /// Original filename
        filename: String,
        /// Base64-encoded file content
        file_base64: String,
        /// Conversion input parameters
        input: CreateJobInput,
    ) -> GqlResult<CreateJobResult> {
        let user = validate_auth(ctx)?;
        let service = ctx.data::<Arc<ConversionService>>()?;

        // Decode base64 file content
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        let file_data = STANDARD.decode(&file_base64)
            .map_err(|e| async_graphql::Error::new(format!("Invalid base64 encoding: {}", e)))?;

        // Parse options if provided
        let options = if let Some(opts_str) = input.options {
            Some(serde_json::from_str(&opts_str)
                .map_err(|e| async_graphql::Error::new(format!("Invalid options JSON: {}", e)))?)
        } else {
            None
        };

        match service
            .create_job(
                user.user_id,
                filename,
                input.engine,
                input.target_format,
                options,
                file_data,
            )
            .await
        {
            Ok(job) => Ok(CreateJobResult {
                success: true,
                job: Some(GqlJob {
                    id: ID(job.id.to_string()),
                    original_filename: job.original_filename,
                    source_format: job.source_format,
                    target_format: job.target_format,
                    engine: job.engine,
                    status: job.status.into(),
                    output_filename: job.output_filename,
                    error_message: job.error_message,
                    download_url: None,
                    created_at: job.created_at,
                    completed_at: job.completed_at,
                }),
                error: None,
            }),
            Err(crate::error::ApiError::UnsupportedConversion {
                engine,
                from,
                to,
                suggestions,
            }) => Ok(CreateJobResult {
                success: false,
                job: None,
                error: Some(GqlConversionError {
                    code: "UNSUPPORTED_CONVERSION".to_string(),
                    message: format!(
                        "Conversion from {} to {} is not supported by engine {}",
                        from, to, engine
                    ),
                    suggestions: suggestions.into_iter().map(Into::into).collect(),
                }),
            }),
            Err(e) => Ok(CreateJobResult {
                success: false,
                job: None,
                error: Some(GqlConversionError {
                    code: "ERROR".to_string(),
                    message: e.to_string(),
                    suggestions: vec![],
                }),
            }),
        }
    }

    /// Delete a job
    async fn delete_job(&self, ctx: &Context<'_>, id: ID) -> GqlResult<bool> {
        let user = validate_auth(ctx)?;
        let service = ctx.data::<Arc<ConversionService>>()?;

        let job_id = Uuid::parse_str(&id.0)
            .map_err(|_| async_graphql::Error::new("Invalid job ID format"))?;

        service
            .delete_job(job_id, &user.user_id)
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_job_status_conversion() {
        assert_eq!(GqlJobStatus::from(JobStatus::Pending), GqlJobStatus::Pending);
        assert_eq!(GqlJobStatus::from(JobStatus::Processing), GqlJobStatus::Processing);
        assert_eq!(GqlJobStatus::from(JobStatus::Completed), GqlJobStatus::Completed);
        assert_eq!(GqlJobStatus::from(JobStatus::Failed), GqlJobStatus::Failed);
    }

    #[test]
    fn test_routes_are_defined() {
        let _routes = routes();
    }
}
