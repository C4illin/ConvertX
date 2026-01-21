//! Error handling module with structured error responses and suggestions

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Suggestion for alternative conversion options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionSuggestion {
    /// Suggested engine to use
    pub engine: String,
    /// Source format
    pub from: String,
    /// Target format
    pub to: String,
}

/// Structured error response
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

/// Error detail with code, message, and optional suggestions
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorDetail {
    /// Error code for programmatic handling
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Optional suggestions for resolving the error
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestions: Option<Vec<ConversionSuggestion>>,
}

/// API Error types
#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Invalid token: {0}")]
    InvalidToken(String),

    #[error("Token expired")]
    TokenExpired,

    #[error("Missing authorization header")]
    MissingAuthHeader,

    #[error("Invalid file: {0}")]
    InvalidFile(String),

    #[error("Engine not found: {0}")]
    EngineNotFound(String),

    #[error("Unsupported conversion from {from} to {to} using engine {engine}")]
    UnsupportedConversion {
        engine: String,
        from: String,
        to: String,
        suggestions: Vec<ConversionSuggestion>,
    },

    #[error("Conversion failed: {0}")]
    ConversionFailed(String),

    #[error("Job not found: {0}")]
    JobNotFound(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error("File too large: max size is {max_size} bytes")]
    FileTooLarge { max_size: usize },
}

impl ApiError {
    /// Get the error code string
    pub fn code(&self) -> &'static str {
        match self {
            ApiError::Unauthorized(_) => "UNAUTHORIZED",
            ApiError::InvalidToken(_) => "INVALID_TOKEN",
            ApiError::TokenExpired => "TOKEN_EXPIRED",
            ApiError::MissingAuthHeader => "MISSING_AUTH_HEADER",
            ApiError::InvalidFile(_) => "INVALID_FILE",
            ApiError::EngineNotFound(_) => "ENGINE_NOT_FOUND",
            ApiError::UnsupportedConversion { .. } => "UNSUPPORTED_CONVERSION",
            ApiError::ConversionFailed(_) => "CONVERSION_FAILED",
            ApiError::JobNotFound(_) => "JOB_NOT_FOUND",
            ApiError::FileNotFound(_) => "FILE_NOT_FOUND",
            ApiError::BadRequest(_) => "BAD_REQUEST",
            ApiError::InternalError(_) => "INTERNAL_ERROR",
            ApiError::FileTooLarge { .. } => "FILE_TOO_LARGE",
        }
    }

    /// Get HTTP status code
    pub fn status_code(&self) -> StatusCode {
        match self {
            ApiError::Unauthorized(_)
            | ApiError::InvalidToken(_)
            | ApiError::TokenExpired
            | ApiError::MissingAuthHeader => StatusCode::UNAUTHORIZED,
            
            ApiError::InvalidFile(_)
            | ApiError::BadRequest(_)
            | ApiError::FileTooLarge { .. } => StatusCode::BAD_REQUEST,
            
            ApiError::EngineNotFound(_)
            | ApiError::JobNotFound(_)
            | ApiError::FileNotFound(_) => StatusCode::NOT_FOUND,
            
            ApiError::UnsupportedConversion { .. } => StatusCode::UNPROCESSABLE_ENTITY,
            
            ApiError::ConversionFailed(_)
            | ApiError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    /// Get suggestions if available
    pub fn suggestions(&self) -> Option<Vec<ConversionSuggestion>> {
        match self {
            ApiError::UnsupportedConversion { suggestions, .. } => Some(suggestions.clone()),
            _ => None,
        }
    }

    /// Convert to ErrorResponse
    pub fn to_error_response(&self) -> ErrorResponse {
        ErrorResponse {
            error: ErrorDetail {
                code: self.code().to_string(),
                message: self.to_string(),
                suggestions: self.suggestions(),
            },
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = Json(self.to_error_response());
        (status, body).into_response()
    }
}

/// Result type alias for API operations
pub type ApiResult<T> = Result<T, ApiError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(ApiError::Unauthorized("test".into()).code(), "UNAUTHORIZED");
        assert_eq!(ApiError::TokenExpired.code(), "TOKEN_EXPIRED");
        assert_eq!(
            ApiError::UnsupportedConversion {
                engine: "test".into(),
                from: "pdf".into(),
                to: "xyz".into(),
                suggestions: vec![],
            }
            .code(),
            "UNSUPPORTED_CONVERSION"
        );
    }

    #[test]
    fn test_error_response_serialization() {
        let error = ApiError::UnsupportedConversion {
            engine: "ffmpeg".into(),
            from: "pdf".into(),
            to: "mp4".into(),
            suggestions: vec![ConversionSuggestion {
                engine: "libreoffice".into(),
                from: "pdf".into(),
                to: "docx".into(),
            }],
        };

        let response = error.to_error_response();
        let json = serde_json::to_string(&response).unwrap();
        
        assert!(json.contains("UNSUPPORTED_CONVERSION"));
        assert!(json.contains("suggestions"));
        assert!(json.contains("libreoffice"));
    }
}
