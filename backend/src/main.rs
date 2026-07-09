mod app_state;
mod config;
mod controllers;
mod models;
mod routes;
mod services;

use std::net::SocketAddr;

use axum::Router;
use sqlx::mysql::MySqlPoolOptions;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{app_state::AppState, config::Config};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "fo_kima_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect_lazy(&config.database_url)?;

    let state = AppState { pool };
    let app = build_app(state);
    let addr = SocketAddr::from((config.host, config.port));

    tracing::info!("backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_app(state: AppState) -> Router {
    Router::new()
        .nest("/api/pelanggan", routes::pelanggan::router())
        .nest("/api/kontrak-lengkap", routes::lokasi::router())
        .nest("/api/lokasi", routes::lokasi::router())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
