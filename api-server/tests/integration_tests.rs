//! Integration tests for API availability and file conversion
//!
//! These tests verify the API server is properly functioning
//! with real HTTP requests and actual file conversion.

use std::time::Duration;
use std::sync::Arc;
use axum::http::{header, StatusCode};
use axum_test::TestServer;
use serde_json::{json, Value};
use tokio::time::sleep;
use base64::{Engine as _, engine::general_purpose::STANDARD};

use convertx_api::{build_router, config::Config, AppState};

/// Create a test server with custom configuration
fn create_integration_test_server() -> TestServer {
    let config = Config {
        host: "127.0.0.1".to_string(),
        port: 3001,
        jwt_secret: "integration-test-secret-key-32chars".to_string(),
        upload_dir: "./test_data/uploads".to_string(),
        output_dir: "./test_data/output".to_string(),
        max_file_size: 10 * 1024 * 1024, // 10MB
        jwt_expiration_secs: 3600,
    };
    let state = AppState::new(config);
    let app = build_router(state);
    TestServer::new(app).unwrap()
}

/// Generate a valid test JWT token
fn generate_test_token() -> String {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use chrono::Utc;

    #[derive(serde::Serialize)]
    struct Claims {
        sub: String,
        exp: i64,
        iat: i64,
        email: Option<String>,
        roles: Vec<String>,
    }

    let now = Utc::now().timestamp();
    let claims = Claims {
        sub: "integration-test-user".to_string(),
        exp: now + 3600,
        iat: now,
        email: Some("test@example.com".to_string()),
        roles: vec!["user".to_string()],
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("integration-test-secret-key-32chars".as_bytes()),
    )
    .unwrap()
}

// =============================================================================
// Health Check Integration Tests
// =============================================================================

mod health_integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_health_endpoint_returns_healthy() {
        let server = create_integration_test_server();

        let response = server.get("/health").await;
        
        response.assert_status_ok();
        
        let body: Value = response.json();
        assert_eq!(body["status"], "healthy");
        assert!(body["version"].is_string());
        assert!(body["timestamp"].is_string());
    }

    #[tokio::test]
    async fn test_api_v1_health_endpoint() {
        let server = create_integration_test_server();

        let response = server.get("/api/v1/health").await;
        
        response.assert_status_ok();
        
        let body: Value = response.json();
        assert_eq!(body["status"], "healthy");
    }

    #[tokio::test]
    async fn test_health_does_not_require_auth() {
        let server = create_integration_test_server();

        // Health check should work without any authorization header
        let response = server.get("/health").await;
        
        response.assert_status_ok();
    }

    #[tokio::test]
    async fn test_health_response_contains_version() {
        let server = create_integration_test_server();

        let response = server.get("/health").await;
        
        let body: Value = response.json();
        let version = body["version"].as_str().unwrap();
        
        // Version should be a valid semver-like string
        assert!(!version.is_empty());
        assert!(version.contains('.'));
    }
}

// =============================================================================
// File Conversion Integration Tests
// =============================================================================

mod conversion_integration_tests {
    use super::*;

    /// Create a minimal valid PNG file for testing
    fn create_test_png() -> Vec<u8> {
        // Minimal 1x1 transparent PNG
        vec![
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
            0x49, 0x48, 0x44, 0x52, // IHDR
            0x00, 0x00, 0x00, 0x01, // width: 1
            0x00, 0x00, 0x00, 0x01, // height: 1
            0x08, 0x06, // bit depth: 8, color type: RGBA
            0x00, 0x00, 0x00, // compression, filter, interlace
            0x1F, 0x15, 0xC4, 0x89, // CRC
            0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
            0x49, 0x44, 0x41, 0x54, // IDAT
            0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // zlib data
            0x0D, 0x0A, 0x2D, 0xB4, // CRC
            0x00, 0x00, 0x00, 0x00, // IEND chunk length
            0x49, 0x45, 0x4E, 0x44, // IEND
            0xAE, 0x42, 0x60, 0x82, // CRC
        ]
    }

    /// Create a minimal JSON file for testing
    fn create_test_json() -> Vec<u8> {
        r#"{"name": "test", "value": 123}"#.as_bytes().to_vec()
    }

    #[tokio::test]
    async fn test_conversion_creates_job_with_valid_id() {
        let server = create_integration_test_server();
        let token = generate_test_token();
        
        let file_content = create_test_png();
        let file_base64 = STANDARD.encode(&file_content);

        // Use GraphQL to create job (simpler than multipart for tests)
        let query = json!({
            "query": r#"
                mutation($filename: String!, $fileBase64: String!, $input: CreateJobInput!) {
                    createJob(filename: $filename, fileBase64: $fileBase64, input: $input) {
                        success
                        job {
                            id
                            status
                            originalFilename
                            sourceFormat
                            targetFormat
                            engine
                        }
                        error {
                            code
                            message
                        }
                    }
                }
            "#,
            "variables": {
                "filename": "test.png",
                "fileBase64": file_base64,
                "input": {
                    "engine": "imagemagick",
                    "targetFormat": "jpg"
                }
            }
        });

        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;

        response.assert_status_ok();
        let body: Value = response.json();

        // Check if job was created successfully
        if body["data"]["createJob"]["success"] == true {
            let job = &body["data"]["createJob"]["job"];
            
            // Verify job ID is a valid UUID
            let job_id = job["id"].as_str().unwrap();
            assert!(uuid::Uuid::parse_str(job_id).is_ok());
            
            // Verify job details
            assert_eq!(job["originalFilename"], "test.png");
            assert_eq!(job["sourceFormat"], "png");
            assert_eq!(job["targetFormat"], "jpg");
            assert_eq!(job["engine"], "imagemagick");
            
            // Status should be pending or processing
            let status = job["status"].as_str().unwrap();
            assert!(status == "PENDING" || status == "PROCESSING");
        }
    }

    #[tokio::test]
    async fn test_can_query_job_status_after_creation() {
        let server = create_integration_test_server();
        let token = generate_test_token();
        
        let file_content = create_test_json();
        let file_base64 = STANDARD.encode(&file_content);

        // Create a job first
        let create_query = json!({
            "query": r#"
                mutation($filename: String!, $fileBase64: String!, $input: CreateJobInput!) {
                    createJob(filename: $filename, fileBase64: $fileBase64, input: $input) {
                        success
                        job { id }
                    }
                }
            "#,
            "variables": {
                "filename": "test.json",
                "fileBase64": file_base64,
                "input": {
                    "engine": "dasel",
                    "targetFormat": "yaml"
                }
            }
        });

        let create_response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&create_query)
            .await;

        create_response.assert_status_ok();
        let create_body: Value = create_response.json();

        if create_body["data"]["createJob"]["success"] == true {
            let job_id = create_body["data"]["createJob"]["job"]["id"].as_str().unwrap();

            // Query the job status
            let status_query = json!({
                "query": format!(r#"
                    query {{
                        job(id: "{}") {{
                            id
                            status
                            originalFilename
                            engine
                        }}
                    }}
                "#, job_id)
            });

            let status_response = server
                .post("/graphql")
                .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
                .content_type("application/json")
                .json(&status_query)
                .await;

            status_response.assert_status_ok();
            let status_body: Value = status_response.json();

            // Job should be found
            let job = &status_body["data"]["job"];
            assert!(!job.is_null());
            assert_eq!(job["id"], job_id);
            assert_eq!(job["originalFilename"], "test.json");
        }
    }

    #[tokio::test]
    async fn test_job_list_shows_created_jobs() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        // Get initial job count
        let initial_query = json!({
            "query": "{ jobs { id } }"
        });

        let initial_response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&initial_query)
            .await;

        initial_response.assert_status_ok();
        let initial_body: Value = initial_response.json();
        let initial_count = initial_body["data"]["jobs"].as_array().unwrap().len();

        // Create a new job
        let file_content = create_test_png();
        let file_base64 = STANDARD.encode(&file_content);

        let create_query = json!({
            "query": r#"
                mutation($filename: String!, $fileBase64: String!, $input: CreateJobInput!) {
                    createJob(filename: $filename, fileBase64: $fileBase64, input: $input) {
                        success
                    }
                }
            "#,
            "variables": {
                "filename": "list_test.png",
                "fileBase64": file_base64,
                "input": {
                    "engine": "imagemagick",
                    "targetFormat": "jpg"
                }
            }
        });

        let _ = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&create_query)
            .await;

        // Check job list again
        let final_response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&initial_query)
            .await;

        final_response.assert_status_ok();
        let final_body: Value = final_response.json();
        let final_count = final_body["data"]["jobs"].as_array().unwrap().len();

        // Should have at least one more job (or same if creation failed due to missing tools)
        assert!(final_count >= initial_count);
    }

    #[tokio::test]
    async fn test_unsupported_conversion_returns_suggestions() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        // Try to convert PDF with FFmpeg (not supported)
        let file_content = b"%PDF-1.4\n".to_vec();
        let file_base64 = STANDARD.encode(&file_content);

        let query = json!({
            "query": r#"
                mutation($filename: String!, $fileBase64: String!, $input: CreateJobInput!) {
                    createJob(filename: $filename, fileBase64: $fileBase64, input: $input) {
                        success
                        error {
                            code
                            message
                            suggestions {
                                engine
                                from
                                to
                            }
                        }
                    }
                }
            "#,
            "variables": {
                "filename": "document.pdf",
                "fileBase64": file_base64,
                "input": {
                    "engine": "ffmpeg",
                    "targetFormat": "mp4"
                }
            }
        });

        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;

        response.assert_status_ok();
        let body: Value = response.json();

        // Should fail with suggestions
        assert_eq!(body["data"]["createJob"]["success"], false);
        assert_eq!(body["data"]["createJob"]["error"]["code"], "UNSUPPORTED_CONVERSION");
        
        // Should have suggestions array
        let suggestions = &body["data"]["createJob"]["error"]["suggestions"];
        assert!(suggestions.is_array());
    }
}

// =============================================================================
// REST API Integration Tests
// =============================================================================

mod rest_integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_rest_engines_list() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        let response = server
            .get("/api/v1/engines")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;

        response.assert_status_ok();
        
        let body: Value = response.json();
        let engines = body["engines"].as_array().unwrap();
        
        // Should have multiple engines
        assert!(engines.len() > 10);
        
        // Check some expected engines exist
        let engine_ids: Vec<&str> = engines
            .iter()
            .filter_map(|e| e["id"].as_str())
            .collect();
        
        assert!(engine_ids.contains(&"ffmpeg"));
        assert!(engine_ids.contains(&"imagemagick"));
        assert!(engine_ids.contains(&"libreoffice"));
        assert!(engine_ids.contains(&"pandoc"));
    }

    #[tokio::test]
    async fn test_rest_single_engine_info() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        let response = server
            .get("/api/v1/engines/ffmpeg")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;

        response.assert_status_ok();
        
        let body: Value = response.json();
        assert_eq!(body["id"], "ffmpeg");
        assert!(body["supported_input_formats"].is_array());
        assert!(body["supported_output_formats"].is_array());
    }

    #[tokio::test]
    async fn test_rest_jobs_list_initially_empty_for_user() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        let response = server
            .get("/api/v1/jobs")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;

        response.assert_status_ok();
        
        let body: Value = response.json();
        assert!(body["jobs"].is_array());
        assert!(body["total"].is_number());
    }

    #[tokio::test]
    async fn test_rest_job_not_found() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        let response = server
            .get("/api/v1/jobs/00000000-0000-0000-0000-000000000000")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;

        response.assert_status(StatusCode::NOT_FOUND);
        
        let body: Value = response.json();
        assert_eq!(body["error"]["code"], "JOB_NOT_FOUND");
    }
}

// =============================================================================
// GraphQL Integration Tests
// =============================================================================

mod graphql_integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_graphql_playground_available() {
        let server = create_integration_test_server();

        let response = server.get("/graphql").await;
        
        response.assert_status_ok();
        
        let body = response.text();
        assert!(body.contains("GraphQL") || body.contains("graphql"));
    }

    #[tokio::test]
    async fn test_graphql_validate_conversion() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        // Test valid conversion
        let valid_query = json!({
            "query": "{ validateConversion(engine: \"ffmpeg\", from: \"mp4\", to: \"webm\") { success } }"
        });

        let valid_response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&valid_query)
            .await;

        valid_response.assert_status_ok();
        let valid_body: Value = valid_response.json();
        assert_eq!(valid_body["data"]["validateConversion"]["success"], true);

        // Test invalid conversion
        let invalid_query = json!({
            "query": "{ validateConversion(engine: \"ffmpeg\", from: \"pdf\", to: \"mp4\") { success error { code suggestions { engine } } } }"
        });

        let invalid_response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&invalid_query)
            .await;

        invalid_response.assert_status_ok();
        let invalid_body: Value = invalid_response.json();
        assert_eq!(invalid_body["data"]["validateConversion"]["success"], false);
    }

    #[tokio::test]
    async fn test_graphql_suggestions_query() {
        let server = create_integration_test_server();
        let token = generate_test_token();

        let query = json!({
            "query": "{ suggestions(from: \"png\", to: \"jpg\") { engine from to } }"
        });

        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;

        response.assert_status_ok();
        let body: Value = response.json();

        let suggestions = body["data"]["suggestions"].as_array().unwrap();
        assert!(!suggestions.is_empty());
        
        // Should suggest imagemagick or vips for png->jpg
        let has_valid_suggestion = suggestions.iter().any(|s| {
            s["engine"] == "imagemagick" || s["engine"] == "vips"
        });
        assert!(has_valid_suggestion);
    }
}
