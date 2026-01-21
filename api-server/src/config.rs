//! Configuration module for the API server

use std::env;
use anyhow::Result;

/// Server configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Server host address
    pub host: String,
    /// Server port
    pub port: u16,
    /// JWT secret key for token validation
    pub jwt_secret: String,
    /// Directory for uploaded files
    pub upload_dir: String,
    /// Directory for converted output files
    pub output_dir: String,
    /// Maximum file size in bytes (default: 100MB)
    pub max_file_size: usize,
    /// JWT token expiration time in seconds (for validation reference)
    pub jwt_expiration_secs: i64,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            host: env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("API_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()?,
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "your-super-secret-jwt-key-change-in-production".to_string()),
            upload_dir: env::var("UPLOAD_DIR")
                .unwrap_or_else(|_| "./data/uploads".to_string()),
            output_dir: env::var("OUTPUT_DIR")
                .unwrap_or_else(|_| "./data/output".to_string()),
            max_file_size: env::var("MAX_FILE_SIZE")
                .unwrap_or_else(|_| "104857600".to_string()) // 100MB
                .parse()?,
            jwt_expiration_secs: env::var("JWT_EXPIRATION_SECS")
                .unwrap_or_else(|_| "86400".to_string()) // 24 hours
                .parse()?,
        })
    }

    /// Create a configuration for testing
    #[cfg(test)]
    pub fn test_config() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3001,
            jwt_secret: "test-secret-key".to_string(),
            upload_dir: "./test_data/uploads".to_string(),
            output_dir: "./test_data/output".to_string(),
            max_file_size: 10 * 1024 * 1024, // 10MB for tests
            jwt_expiration_secs: 3600,
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 3001,
            jwt_secret: "default-secret-change-me".to_string(),
            upload_dir: "./data/uploads".to_string(),
            output_dir: "./data/output".to_string(),
            max_file_size: 100 * 1024 * 1024,
            jwt_expiration_secs: 86400,
        }
    }
}
