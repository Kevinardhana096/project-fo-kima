use axum::{routing::get, Router};

use crate::{app_state::AppState, controllers::pelanggan};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            get(pelanggan::list_pelanggan).post(pelanggan::create_pelanggan),
        )
        .route(
            "/{id}",
            get(pelanggan::get_pelanggan)
                .put(pelanggan::update_pelanggan)
                .delete(pelanggan::delete_pelanggan),
        )
}
