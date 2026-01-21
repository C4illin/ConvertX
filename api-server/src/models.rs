//! Models module - Data structures for API requests and responses

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Job status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

impl std::fmt::Display for JobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JobStatus::Pending => write!(f, "pending"),
            JobStatus::Processing => write!(f, "processing"),
            JobStatus::Completed => write!(f, "completed"),
            JobStatus::Failed => write!(f, "failed"),
        }
    }
}

/// Conversion job representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionJob {
    /// Unique job identifier
    pub id: Uuid,
    /// User who created the job
    pub user_id: String,
    /// Original filename
    pub original_filename: String,
    /// Source file format
    pub source_format: String,
    /// Target file format
    pub target_format: String,
    /// Engine used for conversion
    pub engine: String,
    /// Current job status
    pub status: JobStatus,
    /// Output filename (when completed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_filename: Option<String>,
    /// Error message (when failed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    /// Job creation timestamp
    pub created_at: DateTime<Utc>,
    /// Job completion timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,
    /// Conversion options
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<serde_json::Value>,
}

impl ConversionJob {
    /// Create a new pending conversion job
    pub fn new(
        user_id: String,
        original_filename: String,
        source_format: String,
        target_format: String,
        engine: String,
        options: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            user_id,
            original_filename,
            source_format,
            target_format,
            engine,
            status: JobStatus::Pending,
            output_filename: None,
            error_message: None,
            created_at: Utc::now(),
            completed_at: None,
            options,
        }
    }

    /// Mark job as processing
    pub fn set_processing(&mut self) {
        self.status = JobStatus::Processing;
    }

    /// Mark job as completed
    pub fn set_completed(&mut self, output_filename: String) {
        self.status = JobStatus::Completed;
        self.output_filename = Some(output_filename);
        self.completed_at = Some(Utc::now());
    }

    /// Mark job as failed
    pub fn set_failed(&mut self, error_message: String) {
        self.status = JobStatus::Failed;
        self.error_message = Some(error_message);
        self.completed_at = Some(Utc::now());
    }
}

/// Request to create a conversion job
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateJobRequest {
    /// Engine to use for conversion (required)
    pub engine: String,
    /// Target format (required)
    pub target_format: String,
    /// Optional conversion options
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<serde_json::Value>,
}

/// Response after creating a conversion job
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateJobResponse {
    /// Job ID
    pub job_id: Uuid,
    /// Current status
    pub status: JobStatus,
    /// Message
    pub message: String,
}

/// Job status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStatusResponse {
    /// Job ID
    pub job_id: Uuid,
    /// Current status
    pub status: JobStatus,
    /// Original filename
    pub original_filename: String,
    /// Source format
    pub source_format: String,
    /// Target format
    pub target_format: String,
    /// Engine used
    pub engine: String,
    /// Download URL (when completed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    /// Error message (when failed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    /// Creation time
    pub created_at: DateTime<Utc>,
    /// Completion time
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,
}

impl From<&ConversionJob> for JobStatusResponse {
    fn from(job: &ConversionJob) -> Self {
        let download_url = if job.status == JobStatus::Completed {
            Some(format!("/api/v1/jobs/{}/download", job.id))
        } else {
            None
        };

        Self {
            job_id: job.id,
            status: job.status,
            original_filename: job.original_filename.clone(),
            source_format: job.source_format.clone(),
            target_format: job.target_format.clone(),
            engine: job.engine.clone(),
            download_url,
            error_message: job.error_message.clone(),
            created_at: job.created_at,
            completed_at: job.completed_at,
        }
    }
}

/// Engine information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineInfo {
    /// Engine identifier
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Description
    pub description: String,
    /// Supported input formats
    pub supported_input_formats: Vec<String>,
    /// Supported output formats
    pub supported_output_formats: Vec<String>,
}

/// List engines response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListEnginesResponse {
    pub engines: Vec<EngineInfo>,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: DateTime<Utc>,
}

/// List jobs response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListJobsResponse {
    pub jobs: Vec<JobStatusResponse>,
    pub total: usize,
}
