//! JWT Authentication module
//!
//! Handles JWT token validation for API requests.

use axum::{
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json, RequestPartsExt,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use crate::error::{ApiError, ErrorResponse};

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: String,
    /// Expiration time (Unix timestamp)
    pub exp: i64,
    /// Issued at (Unix timestamp)
    pub iat: i64,
    /// Optional user email
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// Optional user roles
    #[serde(default)]
    pub roles: Vec<String>,
}

impl Claims {
    /// Create new claims for a user
    pub fn new(user_id: String, expiration_secs: i64) -> Self {
        let now = Utc::now().timestamp();
        Self {
            sub: user_id,
            exp: now + expiration_secs,
            iat: now,
            email: None,
            roles: vec![],
        }
    }

    /// Check if the token is expired
    pub fn is_expired(&self) -> bool {
        let now = Utc::now().timestamp();
        self.exp < now
    }

    /// Get expiration as DateTime
    pub fn expiration(&self) -> Option<DateTime<Utc>> {
        DateTime::from_timestamp(self.exp, 0)
    }
}

/// Authenticated user extracted from JWT
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub claims: Claims,
}

impl AuthenticatedUser {
    /// Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }
}

/// JWT Validator
pub struct JwtValidator {
    decoding_key: DecodingKey,
    validation: Validation,
}

impl JwtValidator {
    /// Create a new JWT validator with the given secret
    pub fn new(secret: &str) -> Self {
        let decoding_key = DecodingKey::from_secret(secret.as_bytes());
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        validation.validate_aud = false;

        Self {
            decoding_key,
            validation,
        }
    }

    /// Validate a JWT token and return the claims
    pub fn validate(&self, token: &str) -> Result<Claims, ApiError> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => ApiError::TokenExpired,
                jsonwebtoken::errors::ErrorKind::InvalidToken => {
                    ApiError::InvalidToken("Token format is invalid".into())
                }
                jsonwebtoken::errors::ErrorKind::InvalidSignature => {
                    ApiError::InvalidToken("Token signature is invalid".into())
                }
                _ => ApiError::InvalidToken(e.to_string()),
            })?;

        Ok(token_data.claims)
    }

    /// Extract token from Authorization header
    pub fn extract_token(auth_header: &str) -> Result<&str, ApiError> {
        if !auth_header.starts_with("Bearer ") {
            return Err(ApiError::InvalidToken(
                "Authorization header must use Bearer scheme".into(),
            ));
        }

        let token = auth_header.trim_start_matches("Bearer ").trim();
        if token.is_empty() {
            return Err(ApiError::InvalidToken("Token is empty".into()));
        }

        Ok(token)
    }
}

/// Extractor for authenticated requests
/// Use this in route handlers to require authentication
#[derive(Debug, Clone)]
pub struct RequireAuth(pub AuthenticatedUser);

impl<S> FromRequestParts<S> for RequireAuth
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Get the JWT secret from environment or use default
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "your-super-secret-jwt-key-change-in-production".to_string());

        let validator = JwtValidator::new(&jwt_secret);

        // Extract Authorization header
        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or(AuthError(ApiError::MissingAuthHeader))?;

        // Extract and validate token
        let token = JwtValidator::extract_token(auth_header).map_err(AuthError)?;
        let claims = validator.validate(token).map_err(AuthError)?;

        let user = AuthenticatedUser {
            user_id: claims.sub.clone(),
            email: claims.email.clone(),
            roles: claims.roles.clone(),
            claims,
        };

        Ok(RequireAuth(user))
    }
}

/// Auth error wrapper for proper response formatting
pub struct AuthError(pub ApiError);

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let status = self.0.status_code();
        let body = Json(self.0.to_error_response());
        (status, body).into_response()
    }
}

/// Generate a JWT token for testing purposes
/// 
/// Note: The API server does NOT generate tokens in production.
/// This is only for testing and development.
#[cfg(any(test, feature = "dev-utils"))]
pub fn generate_test_token(secret: &str, user_id: &str, expiration_secs: i64) -> String {
    use jsonwebtoken::{encode, EncodingKey, Header};
    
    let claims = Claims::new(user_id.to_string(), expiration_secs);
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to generate test token")
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-key-for-testing";

    fn create_test_token(user_id: &str, exp_offset: i64) -> String {
        use jsonwebtoken::{encode, EncodingKey, Header};
        
        let now = Utc::now().timestamp();
        let claims = Claims {
            sub: user_id.to_string(),
            exp: now + exp_offset,
            iat: now,
            email: Some("test@example.com".into()),
            roles: vec!["user".into()],
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(TEST_SECRET.as_bytes()),
        )
        .unwrap()
    }

    #[test]
    fn test_valid_token() {
        let validator = JwtValidator::new(TEST_SECRET);
        let token = create_test_token("user123", 3600);

        let claims = validator.validate(&token).unwrap();
        assert_eq!(claims.sub, "user123");
        assert_eq!(claims.email, Some("test@example.com".into()));
    }

    #[test]
    fn test_expired_token() {
        let validator = JwtValidator::new(TEST_SECRET);
        let token = create_test_token("user123", -3600); // Expired 1 hour ago

        let result = validator.validate(&token);
        assert!(matches!(result, Err(ApiError::TokenExpired)));
    }

    #[test]
    fn test_invalid_signature() {
        let validator = JwtValidator::new("different-secret");
        let token = create_test_token("user123", 3600);

        let result = validator.validate(&token);
        assert!(matches!(result, Err(ApiError::InvalidToken(_))));
    }

    #[test]
    fn test_extract_token() {
        let header = "Bearer eyJhbGciOiJIUzI1NiJ9.test.signature";
        let token = JwtValidator::extract_token(header).unwrap();
        assert_eq!(token, "eyJhbGciOiJIUzI1NiJ9.test.signature");
    }

    #[test]
    fn test_extract_token_invalid_scheme() {
        let header = "Basic dXNlcjpwYXNz";
        let result = JwtValidator::extract_token(header);
        assert!(matches!(result, Err(ApiError::InvalidToken(_))));
    }

    #[test]
    fn test_claims_is_expired() {
        let now = Utc::now().timestamp();
        
        let valid_claims = Claims {
            sub: "user".into(),
            exp: now + 3600,
            iat: now,
            email: None,
            roles: vec![],
        };
        assert!(!valid_claims.is_expired());

        let expired_claims = Claims {
            sub: "user".into(),
            exp: now - 3600,
            iat: now - 7200,
            email: None,
            roles: vec![],
        };
        assert!(expired_claims.is_expired());
    }
}
