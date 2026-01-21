//! ConvertX API Server - Main entry point
//!
//! A REST and GraphQL API server for file conversion operations.

use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use convertx_api::{build_router, config::Config, AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "convertx_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    tracing::info!("Starting ConvertX API Server");
    tracing::info!("REST API: http://{}:{}/api/v1", config.host, config.port);
    tracing::info!("GraphQL Playground: http://{}:{}/graphql", config.host, config.port);

    // Build application state
    let state = AppState::new(config.clone());

    // Build router
    let app = build_router(state);

    // Start server
    let addr = SocketAddr::new(config.host.parse()?, config.port);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    tracing::info!("Server listening on {}", addr);
    
    axum::serve(listener, app).await?;

    Ok(())
}
