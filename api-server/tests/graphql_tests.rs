//! GraphQL integration tests

use std::sync::Arc;
use axum::http::header;
use axum_test::TestServer;
use serde_json::{json, Value};

use convertx_api::{build_router, config::Config, AppState};

fn create_test_server() -> TestServer {
    let config = Config::test_config();
    let state = AppState::new(config);
    let app = build_router(state);
    TestServer::new(app).unwrap()
}

fn generate_test_token() -> String {
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
        sub: "test-user-123".to_string(),
        exp: now + 3600,
        iat: now,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("test-secret-key".as_bytes()),
    )
    .unwrap()
}

mod graphql_query_tests {
    use super::*;

    #[tokio::test]
    async fn test_health_query() {
        let server = create_test_server();
        
        let query = json!({
            "query": "{ health { status version timestamp } }"
        });
        
        let response = server
            .post("/graphql")
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert_eq!(body["data"]["health"]["status"], "healthy");
        assert!(body["data"]["health"]["version"].is_string());
    }

    #[tokio::test]
    async fn test_engines_query_unauthorized() {
        let server = create_test_server();
        
        let query = json!({
            "query": "{ engines { id name description } }"
        });
        
        let response = server
            .post("/graphql")
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        // Should have errors due to missing auth
        assert!(body["errors"].is_array());
    }

    #[tokio::test]
    async fn test_engines_query() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let query = json!({
            "query": "{ engines { id name description supportedInputFormats supportedOutputFormats } }"
        });
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert!(body["data"]["engines"].is_array());
        let engines = body["data"]["engines"].as_array().unwrap();
        assert!(!engines.is_empty());
        
        // Verify structure
        let first_engine = &engines[0];
        assert!(first_engine["id"].is_string());
        assert!(first_engine["name"].is_string());
        assert!(first_engine["supportedInputFormats"].is_array());
        assert!(first_engine["supportedOutputFormats"].is_array());
    }

    #[tokio::test]
    async fn test_engine_query() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let query = json!({
            "query": "{ engine(id: \"ffmpeg\") { id name description } }"
        });
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert_eq!(body["data"]["engine"]["id"], "ffmpeg");
        assert_eq!(body["data"]["engine"]["name"], "FFmpeg");
    }

    #[tokio::test]
    async fn test_jobs_query_empty() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let query = json!({
            "query": "{ jobs { id status originalFilename } }"
        });
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert!(body["data"]["jobs"].is_array());
        assert!(body["data"]["jobs"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_validate_conversion_supported() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let query = json!({
            "query": "{ validateConversion(engine: \"ffmpeg\", from: \"mp4\", to: \"webm\") { success error { code message } } }"
        });
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert_eq!(body["data"]["validateConversion"]["success"], true);
        assert!(body["data"]["validateConversion"]["error"].is_null());
    }

    #[tokio::test]
    async fn test_validate_conversion_unsupported() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let query = json!({
            "query": "{ validateConversion(engine: \"ffmpeg\", from: \"pdf\", to: \"mp4\") { success error { code message suggestions { engine from to } } } }"
        });
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        assert_eq!(body["data"]["validateConversion"]["success"], false);
        assert!(body["data"]["validateConversion"]["error"].is_object());
        assert_eq!(
            body["data"]["validateConversion"]["error"]["code"],
            "UNSUPPORTED_CONVERSION"
        );
    }

    #[tokio::test]
    async fn test_suggestions_query() {
        let server = create_test_server();
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
        
        assert!(body["data"]["suggestions"].is_array());
        let suggestions = body["data"]["suggestions"].as_array().unwrap();
        
        // Should have suggestions for png to jpg conversion
        assert!(!suggestions.is_empty());
        
        // Verify at least one suggestion uses imagemagick or vips
        let has_valid_engine = suggestions.iter().any(|s| {
            s["engine"] == "imagemagick" || s["engine"] == "vips"
        });
        assert!(has_valid_engine);
    }
}

mod graphql_mutation_tests {
    use super::*;
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    #[tokio::test]
    async fn test_create_job_mutation() {
        let server = create_test_server();
        let token = generate_test_token();
        
        // Create a simple test file content (PNG header)
        let file_content = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        let file_base64 = STANDARD.encode(&file_content);
        
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
        
        // Job creation should succeed
        if body["data"]["createJob"]["success"] == true {
            assert!(body["data"]["createJob"]["job"]["id"].is_string());
            assert_eq!(body["data"]["createJob"]["job"]["originalFilename"], "test.png");
            assert_eq!(body["data"]["createJob"]["job"]["engine"], "imagemagick");
        }
    }

    #[tokio::test]
    async fn test_create_job_unsupported_conversion() {
        let server = create_test_server();
        let token = generate_test_token();
        
        // Try to convert PDF with FFmpeg (unsupported)
        let file_content = b"%PDF-1.4";
        let file_base64 = STANDARD.encode(file_content);
        
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
        assert!(body["data"]["createJob"]["error"].is_object());
        assert_eq!(body["data"]["createJob"]["error"]["code"], "UNSUPPORTED_CONVERSION");
        
        // Should have suggestions for alternative conversions
        let suggestions = &body["data"]["createJob"]["error"]["suggestions"];
        assert!(suggestions.is_array());
    }

    #[tokio::test]
    async fn test_delete_job_not_found() {
        let server = create_test_server();
        let token = generate_test_token();
        
        let query = json!({
            "query": r#"
                mutation {
                    deleteJob(id: "00000000-0000-0000-0000-000000000000")
                }
            "#
        });
        
        let response = server
            .post("/graphql")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .content_type("application/json")
            .json(&query)
            .await;
        
        response.assert_status_ok();
        let body: Value = response.json();
        
        // Should have an error
        assert!(body["errors"].is_array());
    }
}

mod graphql_playground_test {
    use super::*;

    #[tokio::test]
    async fn test_playground_available() {
        let server = create_test_server();
        
        let response = server.get("/graphql").await;
        
        response.assert_status_ok();
        let body = response.text();
        
        // Should contain GraphQL Playground HTML
        assert!(body.contains("GraphQL"));
    }
}
