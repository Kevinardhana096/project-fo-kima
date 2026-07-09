use axum::{routing::get, Router};

use crate::{app_state::AppState, controllers::lokasi};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(lokasi::list_lokasi).post(lokasi::create_lokasi))
        .route(
            "/{id}",
            get(lokasi::get_lokasi)
                .put(lokasi::update_lokasi)
                .delete(lokasi::delete_lokasi),
        )
        .route(
            "/{id}/perpanjang",
            axum::routing::post(lokasi::perpanjang_lokasi),
        )
        .route("/{id}/upgrade", axum::routing::post(lokasi::upgrade_lokasi))
}
