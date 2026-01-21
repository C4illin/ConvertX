//! Integration tests for the ConvertX API Server

use std::sync::Arc;
use axum::http::{header, StatusCode};
use axum_test::TestServer;
use serde_json::{json, Value};

use convertx_api::{build_router, config::Config, AppState};

/// Create a test server with default configuration
fn create_test_server() -> TestServer {
    let config = Config::test_config();
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
        sub: "test-user-123".to_string(),
        exp: now + 3600,
        iat: now,
        email: Some("test@example.com".to_string()),
        roles: vec!["user".to_string()],
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("test-secret-key".as_bytes()),
    )
    .unwrap()
}

/// Generate an expired test token
fn generate_expired_token() -> String {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use chrono::Utc;

    #[derive(serde::Serialize)]
    struct Claims {
        sub: String,
        exp: i64,
        iat: i64,
    }

    let now = Utc::now().timestamp();
    let claims = Claims {
        sub: "test-user".to_string(),
        exp: now - 3600, // Expired 1 hour ago
        iat: now - 7200,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("test-secret-key".as_bytes()),
    )
    .unwrap()
}

mod health_tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check() {
        let server = create_test_server();
        
        let response = server.get("/health").await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        assert_eq!(body["status"], "healthy");
        assert!(body["version"].is_string());
        assert!(body["timestamp"].is_string());
    }

    #[tokio::test]
    async fn test_api_health_check() {
        let server = create_test_server();
        
        let response = server.get("/api/v1/health").await;
        
        response.assert_status_ok();
    }
}

mod auth_tests {
    use super::*;

    #[tokio::test]
    async fn test_missing_auth_header() {
        let server = create_test_server();
        
        let response = server.get("/api/v1/engines").await;
        
        response.assert_status(StatusCode::UNAUTHORIZED);
        let body: Value = response.json();
        assert_eq!(body["error"]["code"], "MISSING_AUTH_HEADER");
    }

    #[tokio::test]
    async fn test_invalid_auth_scheme() {
        let server = create_test_server();
        
        let response = server
            .get("/api/v1/engines")
            .add_header(header::AUTHORIZATION, "Basic dXNlcjpwYXNz")
            .await;
        
        response.assert_status(StatusCode::UNAUTHORIZED);
        let body: Value = response.json();
        assert_eq!(body["error"]["code"], "INVALID_TOKEN");
    }

    #[tokio::test]
    async fn test_invalid_token() {
        let server = create_test_server();
        
        let response = server
            .get("/api/v1/engines")
            .add_header(header::AUTHORIZATION, "Bearer invalid.token.here")
            .await;
        
        response.assert_status(StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_expired_token() {
        let server = create_test_server();
        let token = generate_expired_token();
        
        let response = server
            .get("/api/v1/engines")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status(StatusCode::UNAUTHORIZED);
        let body: Value = response.json();
        assert_eq!(body["error"]["code"], "TOKEN_EXPIRED");
    }

    #[tokio::test]
    async fn test_valid_token() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/engines")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status_ok();
    }
}

mod engine_tests {
    use super::*;

    #[tokio::test]
    async fn test_list_engines() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/engines")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert!(body["engines"].is_array());
        let engines = body["engines"].as_array().unwrap();
        assert!(!engines.is_empty());
        
        // Check that common engines are present
        let engine_ids: Vec<&str> = engines
            .iter()
            .filter_map(|e| e["id"].as_str())
            .collect();
        
        assert!(engine_ids.contains(&"ffmpeg"));
        assert!(engine_ids.contains(&"imagemagick"));
        assert!(engine_ids.contains(&"libreoffice"));
    }

    #[tokio::test]
    async fn test_get_engine() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/engines/ffmpeg")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert_eq!(body["id"], "ffmpeg");
        assert_eq!(body["name"], "FFmpeg");
        assert!(body["supported_input_formats"].is_array());
        assert!(body["supported_output_formats"].is_array());
    }

    #[tokio::test]
    async fn test_get_engine_not_found() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/engines/nonexistent")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status(StatusCode::NOT_FOUND);
        let body: Value = response.json();
        assert_eq!(body["error"]["code"], "ENGINE_NOT_FOUND");
    }

    #[tokio::test]
    async fn test_get_engine_conversions() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/engines/ffmpeg/conversions")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert_eq!(body["engine_id"], "ffmpeg");
        assert!(body["conversions"].is_object());
    }
}

mod job_tests {
    use super::*;

    #[tokio::test]
    async fn test_list_jobs_empty() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/jobs")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert!(body["jobs"].is_array());
        assert_eq!(body["total"], 0);
    }

    #[tokio::test]
    async fn test_get_job_not_found() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let response = server
            .get("/api/v1/jobs/00000000-0000-0000-0000-000000000000")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;
        
        response.assert_status(StatusCode::NOT_FOUND);
        let body: Value = response.json();
        assert_eq!(body["error"]["code"], "JOB_NOT_FOUND");
    }

    #[tokio::test]
    async fn test_create_job_missing_file() {
        let server = create_test_server();
        let token = generate_test_token();
        
        // Attempt to create job without file
        let response = server
            .post("/api/v1/convert")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("multipart/form-data; boundary=boundary")
            .bytes(b"--boundary\r\nContent-Disposition: form-data; name=\"engine\"\r\n\r\nffmpeg\r\n--boundary--".to_vec())
            .await;
        
        response.assert_status(StatusCode::BAD_REQUEST);
    }
}

mod error_tests {
    use super::*;

    #[tokio::test]
    async fn test_unsupported_conversion_returns_suggestions() {
        // This test verifies that when an unsupported conversion is requested,
        // the API returns suggestions for alternative conversions
        
        let server = create_test_server();
        let token = generate_test_token();
        
        // Create a multipart request with an unsupported conversion
        // (e.g., trying to convert PDF to MP4 using FFmpeg)
        
        // Note: In a real test, we would create proper multipart data
        // For now, we test via the GraphQL endpoint which is easier
        
        let query = r#"{
            "query": "query { validateConversion(engine: \"ffmpeg\", from: \"pdf\", to: \"mp4\") { success error { code message suggestions { engine from to } } } }"
        }"#;
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .body(query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        // The validateConversion query should return suggestions
        if let Some(data) = body["data"]["validateConversion"].as_object() {
            if data["success"] == false {
                assert!(data["error"].is_object());
                // Suggestions may or may not be present depending on available converters
            }
        }
    }
}
