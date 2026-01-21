//! ConvertX API Server - A REST and GraphQL file conversion API
//! 
//! This module provides the main entry point for the API server.

pub mod auth;
pub mod config;
pub mod error;
pub mod engine;
pub mod conversion;
pub mod rest;
pub mod graphql;
pub mod models;

use std::sync::Arc;
use axum::Router;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;

use crate::config::Config;
use crate::engine::EngineRegistry;
use crate::conversion::ConversionService;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub engine_registry: Arc<EngineRegistry>,
    pub conversion_service: Arc<ConversionService>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        let config = Arc::new(config);
        let engine_registry = Arc::new(EngineRegistry::new());
        let conversion_service = Arc::new(ConversionService::new(
            engine_registry.clone(),
            config.clone(),
        ));

        Self {
            config,
            engine_registry,
            conversion_service,
        }
    }
}

/// Build the application router with all routes
pub fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .merge(rest::routes())
        .merge(graphql::routes())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
