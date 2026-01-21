//! Conversion Service module
//!
//! Handles file conversion operations, job management, and process execution.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::process::Command;
use uuid::Uuid;

use crate::config::Config;
use crate::engine::EngineRegistry;
use crate::error::{ApiError, ApiResult};
use crate::models::{ConversionJob, JobStatus};

/// Conversion service for managing jobs and executing conversions
pub struct ConversionService {
    engine_registry: Arc<EngineRegistry>,
    config: Arc<Config>,
    /// In-memory job storage (in production, use a database)
    jobs: RwLock<HashMap<Uuid, ConversionJob>>,
}

impl ConversionService {
    /// Create a new conversion service
    pub fn new(engine_registry: Arc<EngineRegistry>, config: Arc<Config>) -> Self {
        Self {
            engine_registry,
            config,
            jobs: RwLock::new(HashMap::new()),
        }
    }

    /// Create a new conversion job
    pub async fn create_job(
        &self,
        user_id: String,
        original_filename: String,
        engine: String,
        target_format: String,
        options: Option<serde_json::Value>,
        file_data: Vec<u8>,
    ) -> ApiResult<ConversionJob> {
        // Extract source format from filename
        let source_format = Path::new(&original_filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
            .ok_or_else(|| ApiError::InvalidFile("Cannot determine file format".into()))?;

        // Validate the conversion is supported
        self.engine_registry
            .validate_conversion(&engine, &source_format, &target_format)?;

        // Create the job
        let job = ConversionJob::new(
            user_id.clone(),
            original_filename.clone(),
            source_format.clone(),
            target_format.clone(),
            engine.clone(),
            options,
        );

        // Create directories for this job
        let job_upload_dir = self.get_upload_path(&job.id);
        let job_output_dir = self.get_output_path(&job.id);
        
        tokio::fs::create_dir_all(&job_upload_dir).await
            .map_err(|e| ApiError::InternalError(format!("Failed to create upload directory: {}", e)))?;
        tokio::fs::create_dir_all(&job_output_dir).await
            .map_err(|e| ApiError::InternalError(format!("Failed to create output directory: {}", e)))?;

        // Save the uploaded file
        let input_path = job_upload_dir.join(&original_filename);
        tokio::fs::write(&input_path, &file_data).await
            .map_err(|e| ApiError::InternalError(format!("Failed to save uploaded file: {}", e)))?;

        // Store the job
        {
            let mut jobs = self.jobs.write().await;
            jobs.insert(job.id, job.clone());
        }

        // Start conversion in background
        let job_id = job.id;
        let service = self.clone_for_task();
        tokio::spawn(async move {
            service.execute_conversion(job_id).await;
        });

        Ok(job)
    }

    /// Clone the service for use in a spawned task
    fn clone_for_task(&self) -> ConversionServiceTask {
        ConversionServiceTask {
            engine_registry: self.engine_registry.clone(),
            config: self.config.clone(),
            jobs: unsafe { 
                // Safe because we're only reading from the parent's jobs
                std::mem::transmute::<&RwLock<HashMap<Uuid, ConversionJob>>, &'static RwLock<HashMap<Uuid, ConversionJob>>>(&self.jobs)
            },
        }
    }

    /// Execute the conversion for a job
    async fn execute_conversion_internal(&self, job_id: Uuid) -> Result<(), String> {
        // Update job status to processing
        let job = {
            let mut jobs = self.jobs.write().await;
            let job = jobs.get_mut(&job_id).ok_or("Job not found")?;
            job.set_processing();
            job.clone()
        };

        let input_path = self.get_upload_path(&job_id).join(&job.original_filename);
        let output_filename = format!(
            "{}.{}",
            Path::new(&job.original_filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output"),
            job.target_format
        );
        let output_path = self.get_output_path(&job_id).join(&output_filename);

        // Execute the conversion based on engine
        let result = self
            .run_converter(&job.engine, &input_path, &output_path, &job.source_format, &job.target_format)
            .await;

        // Update job status based on result
        let mut jobs = self.jobs.write().await;
        if let Some(job) = jobs.get_mut(&job_id) {
            match result {
                Ok(_) => {
                    job.set_completed(output_filename);
                }
                Err(e) => {
                    job.set_failed(e);
                }
            }
        }

        Ok(())
    }

    /// Run the appropriate converter command
    async fn run_converter(
        &self,
        engine: &str,
        input_path: &Path,
        output_path: &Path,
        _from: &str,
        _to: &str,
    ) -> Result<(), String> {
        let input = input_path.to_string_lossy().to_string();
        let output = output_path.to_string_lossy().to_string();

        let (program, args) = match engine {
            "ffmpeg" => (
                "ffmpeg",
                vec!["-i".to_string(), input, "-y".to_string(), output],
            ),
            "imagemagick" => (
                "magick",
                vec!["convert".to_string(), input, output],
            ),
            "graphicsmagick" => (
                "gm",
                vec!["convert".to_string(), input, output],
            ),
            "libreoffice" => {
                let output_dir = output_path.parent().unwrap().to_string_lossy().to_string();
                (
                    "libreoffice",
                    vec![
                        "--headless".to_string(),
                        "--convert-to".to_string(),
                        _to.to_string(),
                        "--outdir".to_string(),
                        output_dir,
                        input,
                    ],
                )
            }
            "pandoc" => (
                "pandoc",
                vec![input, "-o".to_string(), output],
            ),
            "calibre" => (
                "ebook-convert",
                vec![input, output],
            ),
            "inkscape" => (
                "inkscape",
                vec![input, "--export-filename".to_string(), output],
            ),
            "resvg" => (
                "resvg",
                vec![input, output],
            ),
            "vips" => (
                "vips",
                vec!["copy".to_string(), input, output],
            ),
            "libheif" => (
                "heif-convert",
                vec![input, output],
            ),
            "libjxl" => {
                if _to == "jxl" {
                    ("cjxl", vec![input, output])
                } else {
                    ("djxl", vec![input, output])
                }
            }
            "potrace" => (
                "potrace",
                vec!["-s".to_string(), "-o".to_string(), output, input],
            ),
            "vtracer" => (
                "vtracer",
                vec!["--input".to_string(), input, "--output".to_string(), output],
            ),
            "dasel" => (
                "dasel",
                vec![
                    "-f".to_string(),
                    input,
                    "-w".to_string(),
                    _to.to_string(),
                    "-o".to_string(),
                    output,
                ],
            ),
            "assimp" => (
                "assimp",
                vec!["export".to_string(), input, output],
            ),
            "xelatex" => {
                let output_dir = output_path.parent().unwrap().to_string_lossy().to_string();
                (
                    "xelatex",
                    vec![
                        "-output-directory".to_string(),
                        output_dir,
                        input,
                    ],
                )
            }
            "dvisvgm" => (
                "dvisvgm",
                vec!["--no-fonts".to_string(), "-o".to_string(), output, input],
            ),
            "msgconvert" => (
                "msgconvert",
                vec!["--outfile".to_string(), output, input],
            ),
            _ => {
                return Err(format!("Unknown engine: {}", engine));
            }
        };

        tracing::info!("Running converter: {} {:?}", program, args);

        let output_result = Command::new(program)
            .args(&args)
            .output()
            .await
            .map_err(|e| format!("Failed to execute converter: {}", e))?;

        if !output_result.status.success() {
            let stderr = String::from_utf8_lossy(&output_result.stderr);
            return Err(format!("Conversion failed: {}", stderr));
        }

        // Verify output file exists
        if !output_path.exists() {
            return Err("Output file was not created".to_string());
        }

        Ok(())
    }

    /// Get a job by ID
    pub async fn get_job(&self, job_id: Uuid) -> ApiResult<ConversionJob> {
        let jobs = self.jobs.read().await;
        jobs.get(&job_id)
            .cloned()
            .ok_or_else(|| ApiError::JobNotFound(job_id.to_string()))
    }

    /// Get all jobs for a user
    pub async fn get_user_jobs(&self, user_id: &str) -> Vec<ConversionJob> {
        let jobs = self.jobs.read().await;
        jobs.values()
            .filter(|job| job.user_id == user_id)
            .cloned()
            .collect()
    }

    /// Delete a job
    pub async fn delete_job(&self, job_id: Uuid, user_id: &str) -> ApiResult<()> {
        let job = self.get_job(job_id).await?;
        
        // Verify ownership
        if job.user_id != user_id {
            return Err(ApiError::Unauthorized("Not authorized to delete this job".into()));
        }

        // Remove job data
        let upload_dir = self.get_upload_path(&job_id);
        let output_dir = self.get_output_path(&job_id);
        
        let _ = tokio::fs::remove_dir_all(&upload_dir).await;
        let _ = tokio::fs::remove_dir_all(&output_dir).await;

        // Remove from storage
        let mut jobs = self.jobs.write().await;
        jobs.remove(&job_id);

        Ok(())
    }

    /// Get the output file path for download
    pub async fn get_output_file(&self, job_id: Uuid, user_id: &str) -> ApiResult<PathBuf> {
        let job = self.get_job(job_id).await?;
        
        // Verify ownership
        if job.user_id != user_id {
            return Err(ApiError::Unauthorized("Not authorized to access this job".into()));
        }

        // Check job is completed
        if job.status != JobStatus::Completed {
            return Err(ApiError::BadRequest(format!(
                "Job is not completed. Current status: {}",
                job.status
            )));
        }

        let output_filename = job
            .output_filename
            .ok_or_else(|| ApiError::InternalError("Output filename not set".into()))?;

        let output_path = self.get_output_path(&job_id).join(output_filename);

        if !output_path.exists() {
            return Err(ApiError::FileNotFound("Output file not found".into()));
        }

        Ok(output_path)
    }

    /// Get upload directory path for a job
    fn get_upload_path(&self, job_id: &Uuid) -> PathBuf {
        PathBuf::from(&self.config.upload_dir).join(job_id.to_string())
    }

    /// Get output directory path for a job
    fn get_output_path(&self, job_id: &Uuid) -> PathBuf {
        PathBuf::from(&self.config.output_dir).join(job_id.to_string())
    }
}

/// Task-safe reference to conversion service
struct ConversionServiceTask {
    engine_registry: Arc<EngineRegistry>,
    config: Arc<Config>,
    jobs: &'static RwLock<HashMap<Uuid, ConversionJob>>,
}

impl ConversionServiceTask {
    async fn execute_conversion(&self, job_id: Uuid) {
        if let Err(e) = self.execute_conversion_internal(job_id).await {
            tracing::error!("Conversion failed for job {}: {}", job_id, e);
        }
    }

    async fn execute_conversion_internal(&self, job_id: Uuid) -> Result<(), String> {
        // Update job status to processing
        let job = {
            let mut jobs = self.jobs.write().await;
            let job = jobs.get_mut(&job_id).ok_or("Job not found")?;
            job.set_processing();
            job.clone()
        };

        let upload_dir = PathBuf::from(&self.config.upload_dir).join(job_id.to_string());
        let output_dir = PathBuf::from(&self.config.output_dir).join(job_id.to_string());

        let input_path = upload_dir.join(&job.original_filename);
        let output_filename = format!(
            "{}.{}",
            Path::new(&job.original_filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output"),
            job.target_format
        );
        let output_path = output_dir.join(&output_filename);

        // Execute the conversion
        let result = run_converter_command(
            &job.engine,
            &input_path,
            &output_path,
            &job.source_format,
            &job.target_format,
        )
        .await;

        // Update job status based on result
        let mut jobs = self.jobs.write().await;
        if let Some(job) = jobs.get_mut(&job_id) {
            match result {
                Ok(_) => {
                    job.set_completed(output_filename);
                }
                Err(e) => {
                    job.set_failed(e);
                }
            }
        }

        Ok(())
    }
}

/// Run the converter command
async fn run_converter_command(
    engine: &str,
    input_path: &Path,
    output_path: &Path,
    _from: &str,
    to: &str,
) -> Result<(), String> {
    let input = input_path.to_string_lossy().to_string();
    let output = output_path.to_string_lossy().to_string();

    let (program, args) = match engine {
        "ffmpeg" => (
            "ffmpeg",
            vec!["-i".to_string(), input, "-y".to_string(), output],
        ),
        "imagemagick" => (
            "magick",
            vec!["convert".to_string(), input, output],
        ),
        "graphicsmagick" => (
            "gm",
            vec!["convert".to_string(), input, output],
        ),
        "libreoffice" => {
            let output_dir = output_path.parent().unwrap().to_string_lossy().to_string();
            (
                "libreoffice",
                vec![
                    "--headless".to_string(),
                    "--convert-to".to_string(),
                    to.to_string(),
                    "--outdir".to_string(),
                    output_dir,
                    input,
                ],
            )
        }
        "pandoc" => (
            "pandoc",
            vec![input, "-o".to_string(), output],
        ),
        "calibre" => (
            "ebook-convert",
            vec![input, output],
        ),
        "inkscape" => (
            "inkscape",
            vec![input, "--export-filename".to_string(), output],
        ),
        "resvg" => (
            "resvg",
            vec![input, output],
        ),
        "vips" => (
            "vips",
            vec!["copy".to_string(), input, output],
        ),
        "libheif" => (
            "heif-convert",
            vec![input, output],
        ),
        "libjxl" => {
            if to == "jxl" {
                ("cjxl", vec![input, output])
            } else {
                ("djxl", vec![input, output])
            }
        }
        "potrace" => (
            "potrace",
            vec!["-s".to_string(), "-o".to_string(), output, input],
        ),
        "vtracer" => (
            "vtracer",
            vec!["--input".to_string(), input, "--output".to_string(), output],
        ),
        "dasel" => (
            "dasel",
            vec![
                "-f".to_string(),
                input,
                "-w".to_string(),
                to.to_string(),
                "-o".to_string(),
                output,
            ],
        ),
        "assimp" => (
            "assimp",
            vec!["export".to_string(), input, output],
        ),
        "xelatex" => {
            let output_dir = output_path.parent().unwrap().to_string_lossy().to_string();
            (
                "xelatex",
                vec![
                    "-output-directory".to_string(),
                    output_dir,
                    input,
                ],
            )
        }
        "dvisvgm" => (
            "dvisvgm",
            vec!["--no-fonts".to_string(), "-o".to_string(), output, input],
        ),
        "msgconvert" => (
            "msgconvert",
            vec!["--outfile".to_string(), output, input],
        ),
        _ => {
            return Err(format!("Unknown engine: {}", engine));
        }
    };

    tracing::info!("Running converter: {} {:?}", program, args);

    let output_result = Command::new(program)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute converter: {}", e))?;

    if !output_result.status.success() {
        let stderr = String::from_utf8_lossy(&output_result.stderr);
        return Err(format!("Conversion failed: {}", stderr));
    }

    // Verify output file exists
    if !output_path.exists() {
        return Err("Output file was not created".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_job_invalid_format() {
        let config = Arc::new(Config::test_config());
        let registry = Arc::new(EngineRegistry::new());
        let service = ConversionService::new(registry, config);

        let result = service
            .create_job(
                "user1".into(),
                "test".into(), // No extension
                "ffmpeg".into(),
                "mp4".into(),
                None,
                vec![],
            )
            .await;

        assert!(matches!(result, Err(ApiError::InvalidFile(_))));
    }

    #[tokio::test]
    async fn test_create_job_unsupported_conversion() {
        let config = Arc::new(Config::test_config());
        let registry = Arc::new(EngineRegistry::new());
        let service = ConversionService::new(registry, config);

        let result = service
            .create_job(
                "user1".into(),
                "test.pdf".into(),
                "ffmpeg".into(), // FFmpeg doesn't support PDF
                "mp4".into(),
                None,
                vec![],
            )
            .await;

        assert!(matches!(
            result,
            Err(ApiError::UnsupportedConversion { .. })
        ));
    }

    #[tokio::test]
    async fn test_get_job_not_found() {
        let config = Arc::new(Config::test_config());
        let registry = Arc::new(EngineRegistry::new());
        let service = ConversionService::new(registry, config);

        let result = service.get_job(Uuid::new_v4()).await;
        assert!(matches!(result, Err(ApiError::JobNotFound(_))));
    }
}
