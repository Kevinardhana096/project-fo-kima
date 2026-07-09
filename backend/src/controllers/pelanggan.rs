use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use sqlx::{MySqlPool, QueryBuilder, Row};

use crate::{
    app_state::AppState,
    models::{
        api::{ApiError, DetailResponse, ListMeta, ListResponse},
        pelanggan::{PelangganPayload, PelangganQuery, PelangganResponse},
    },
};

pub async fn list_pelanggan(
    State(state): State<AppState>,
    Query(query): Query<PelangganQuery>,
) -> Result<Json<ListResponse<PelangganResponse>>, ApiError> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let sort_by = sanitize_sort_by(query.sort_by.as_deref());
    let sort_order = sanitize_sort_order(query.sort_order.as_deref());

    let mut count_builder =
        QueryBuilder::new("SELECT COUNT(*) AS total FROM pelanggan p WHERE 1 = 1");
    append_search_filter(&mut count_builder, query.search.as_deref());

    let total = count_builder
        .build_query_scalar::<i64>()
        .fetch_one(&state.pool)
        .await
        .map_err(map_sqlx_error)?;

    let mut list_builder = QueryBuilder::new(
        "SELECT \
            p.id, \
            p.kode_pelanggan, \
            p.nama_pelanggan, \
            p.pic, \
            p.telepon, \
            p.email, \
            p.link_folder_berkas, \
            p.keterangan, \
            COUNT(CASE WHEN l.status_kontrak = 'Aktif' THEN 1 END) AS kontrak_aktif, \
            p.created_at, \
            p.updated_at \
        FROM pelanggan p \
        LEFT JOIN lokasi l ON l.pelanggan_id = p.id \
        WHERE 1 = 1",
    );
    append_search_filter(&mut list_builder, query.search.as_deref());
    list_builder.push(" GROUP BY p.id");
    list_builder
        .push(" ORDER BY ")
        .push(sort_by)
        .push(" ")
        .push(sort_order);
    list_builder
        .push(" LIMIT ")
        .push_bind(page_size as i64)
        .push(" OFFSET ")
        .push_bind(offset as i64);

    let rows = list_builder
        .build()
        .fetch_all(&state.pool)
        .await
        .map_err(map_sqlx_error)?;

    let data = rows
        .into_iter()
        .map(map_pelanggan_row)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Json(ListResponse {
        data,
        meta: ListMeta {
            page,
            page_size,
            total: total as u64,
        },
    }))
}

pub async fn get_pelanggan(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<DetailResponse<PelangganResponse>>, ApiError> {
    let mut pelanggan = fetch_pelanggan_by_id(&state.pool, id).await?;

    if let Some(ref folder_url) = pelanggan.link_folder_berkas {
        if !folder_url.trim().is_empty() {
            match crate::services::google_drive::list_pelanggan_files(folder_url).await {
                Ok(files) => pelanggan.existing_files = Some(files),
                Err(e) => tracing::warn!("Failed to list drive files for pelanggan {}: {}", id, e),
            }
        }
    }

    Ok(Json(DetailResponse { data: pelanggan }))
}

pub async fn create_pelanggan(
    State(state): State<AppState>,
    Json(payload): Json<PelangganPayload>,
) -> Result<(StatusCode, Json<DetailResponse<PelangganResponse>>), ApiError> {
    payload.validate()?;
    ensure_kode_pelanggan_unique(&state.pool, payload.kode_pelanggan.as_deref(), None).await?;

    let mut tx = state.pool.begin().await.map_err(map_sqlx_error)?;

    let result = sqlx::query(
        "INSERT INTO pelanggan \
        (kode_pelanggan, nama_pelanggan, pic, telepon, email, link_folder_berkas, keterangan) \
        VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(clean_optional(payload.kode_pelanggan.as_deref()))
    .bind(payload.nama_pelanggan.trim())
    .bind(clean_optional(payload.pic.as_deref()))
    .bind(clean_optional(payload.telepon.as_deref()))
    .bind(clean_optional(payload.email.as_deref()))
    .bind(clean_optional(payload.link_folder_berkas.as_deref()))
    .bind(clean_optional(payload.keterangan.as_deref()))
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    let pelanggan_id = result.last_insert_id();

    // Handle File Deletions & Uploads
    if let Some(ref ids) = payload.delete_file_ids {
        for file_id in ids {
            if let Err(e) = crate::services::google_drive::delete_file(file_id).await {
                return Err(ApiError::internal(format!(
                    "Gagal menghapus berkas pelanggan dari Google Drive: {e}"
                )));
            }
        }
    }

    let mut final_link_folder_berkas = clean_optional(payload.link_folder_berkas.as_deref());

    // Always ensure folder exists
    let folder_url = match final_link_folder_berkas {
        Some(ref url) if !url.trim().is_empty() => url.clone(),
        _ => {
            let kode = payload.kode_pelanggan.as_deref().unwrap_or("");
            match crate::services::google_drive::create_pelanggan_folder(
                kode,
                payload.nama_pelanggan.trim(),
            )
            .await
            {
                Ok((_, url)) => {
                    // Update database with new link_folder_berkas
                    sqlx::query("UPDATE pelanggan SET link_folder_berkas = ? WHERE id = ?")
                        .bind(&url)
                        .bind(pelanggan_id)
                        .execute(&mut *tx)
                        .await
                        .map_err(map_sqlx_error)?;
                    url
                }
                Err(e) => {
                    return Err(ApiError::internal(format!(
                        "Gagal membuat folder pelanggan di Google Drive: {e}"
                    )));
                }
            }
        }
    };

    final_link_folder_berkas = Some(folder_url.clone());

    if let Some(ref items) = payload.upload_items {
        if !items.is_empty() && !folder_url.is_empty() {
            for item in items {
                if let Err(e) = crate::services::google_drive::upload_file(
                    &folder_url,
                    &item.jenis_berkas,
                    &item.nama_file,
                    &item.mime_type,
                    &item.base64_data,
                )
                .await
                {
                    return Err(ApiError::internal(format!(
                        "Gagal upload berkas `{}` ke Google Drive: {e}",
                        item.nama_file
                    )));
                }
            }
        }
    }

    tx.commit().await.map_err(map_sqlx_error)?;

    let mut pelanggan = fetch_pelanggan_by_id(&state.pool, pelanggan_id).await?;
    pelanggan.link_folder_berkas = final_link_folder_berkas;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_pelanggan_to_sheets(&pool_clone).await
        {
            tracing::error!("Failed to sync pelanggan to sheets: {}", e);
        }
    });

    Ok((
        StatusCode::CREATED,
        Json(DetailResponse { data: pelanggan }),
    ))
}

pub async fn update_pelanggan(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(payload): Json<PelangganPayload>,
) -> Result<Json<DetailResponse<PelangganResponse>>, ApiError> {
    payload.validate()?;
    ensure_pelanggan_exists(&state.pool, id).await?;
    ensure_kode_pelanggan_unique(&state.pool, payload.kode_pelanggan.as_deref(), Some(id)).await?;

    let mut tx = state.pool.begin().await.map_err(map_sqlx_error)?;

    sqlx::query(
        "UPDATE pelanggan \
        SET kode_pelanggan = ?, nama_pelanggan = ?, pic = ?, telepon = ?, email = ?, \
            link_folder_berkas = ?, keterangan = ? \
        WHERE id = ?",
    )
    .bind(clean_optional(payload.kode_pelanggan.as_deref()))
    .bind(payload.nama_pelanggan.trim())
    .bind(clean_optional(payload.pic.as_deref()))
    .bind(clean_optional(payload.telepon.as_deref()))
    .bind(clean_optional(payload.email.as_deref()))
    .bind(clean_optional(payload.link_folder_berkas.as_deref()))
    .bind(clean_optional(payload.keterangan.as_deref()))
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    // Handle File Deletions & Uploads
    if let Some(ref ids) = payload.delete_file_ids {
        for file_id in ids {
            if let Err(e) = crate::services::google_drive::delete_file(file_id).await {
                return Err(ApiError::internal(format!(
                    "Gagal menghapus berkas pelanggan dari Google Drive: {e}"
                )));
            }
        }
    }

    let mut final_link_folder_berkas = clean_optional(payload.link_folder_berkas.as_deref());

    // Always ensure folder exists
    let folder_url = match final_link_folder_berkas {
        Some(ref url) if !url.trim().is_empty() => url.clone(),
        _ => {
            let kode = payload.kode_pelanggan.as_deref().unwrap_or("");
            match crate::services::google_drive::create_pelanggan_folder(
                kode,
                payload.nama_pelanggan.trim(),
            )
            .await
            {
                Ok((_, url)) => {
                    // Update database with new link_folder_berkas
                    sqlx::query("UPDATE pelanggan SET link_folder_berkas = ? WHERE id = ?")
                        .bind(&url)
                        .bind(id)
                        .execute(&mut *tx)
                        .await
                        .map_err(map_sqlx_error)?;
                    url
                }
                Err(e) => {
                    return Err(ApiError::internal(format!(
                        "Gagal membuat folder pelanggan di Google Drive: {e}"
                    )));
                }
            }
        }
    };

    final_link_folder_berkas = Some(folder_url.clone());

    if let Some(ref items) = payload.upload_items {
        if !items.is_empty() && !folder_url.is_empty() {
            for item in items {
                if let Err(e) = crate::services::google_drive::upload_file(
                    &folder_url,
                    &item.jenis_berkas,
                    &item.nama_file,
                    &item.mime_type,
                    &item.base64_data,
                )
                .await
                {
                    return Err(ApiError::internal(format!(
                        "Gagal upload berkas `{}` ke Google Drive: {e}",
                        item.nama_file
                    )));
                }
            }
        }
    }

    tx.commit().await.map_err(map_sqlx_error)?;

    let mut pelanggan = fetch_pelanggan_by_id(&state.pool, id).await?;
    pelanggan.link_folder_berkas = final_link_folder_berkas;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_pelanggan_to_sheets(&pool_clone).await
        {
            tracing::error!("Failed to sync pelanggan to sheets: {}", e);
        }
    });

    Ok(Json(DetailResponse { data: pelanggan }))
}

pub async fn delete_pelanggan(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<StatusCode, ApiError> {
    ensure_pelanggan_exists(&state.pool, id).await?;

    let lokasi_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lokasi WHERE pelanggan_id = ?")
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(map_sqlx_error)?;

    if lokasi_count > 0 {
        return Err(ApiError::conflict(format!(
            "Pelanggan {id} tidak bisa dihapus karena masih memiliki data lokasi."
        )));
    }

    sqlx::query("DELETE FROM pelanggan WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(map_sqlx_error)?;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_pelanggan_to_sheets(&pool_clone).await
        {
            tracing::error!("Failed to sync pelanggan to sheets: {}", e);
        }
    });

    Ok(StatusCode::NO_CONTENT)
}

fn append_search_filter(builder: &mut QueryBuilder<'_, sqlx::MySql>, search: Option<&str>) {
    if let Some(search) = clean_optional(search) {
        let pattern = format!("%{search}%");
        builder
            .push(" AND (p.nama_pelanggan LIKE ")
            .push_bind(pattern.clone())
            .push(" OR p.kode_pelanggan LIKE ")
            .push_bind(pattern.clone())
            .push(" OR p.pic LIKE ")
            .push_bind(pattern.clone())
            .push(" OR p.email LIKE ")
            .push_bind(pattern.clone())
            .push(" OR p.telepon LIKE ")
            .push_bind(pattern.clone())
            .push(" OR p.keterangan LIKE ")
            .push_bind(pattern)
            .push(")");
    }
}

fn sanitize_sort_by(input: Option<&str>) -> &'static str {
    match input.unwrap_or("created_at") {
        "nama_pelanggan" => "p.nama_pelanggan",
        "kode_pelanggan" => "p.kode_pelanggan",
        "updated_at" => "p.updated_at",
        _ => "p.created_at",
    }
}

fn sanitize_sort_order(input: Option<&str>) -> &'static str {
    match input.unwrap_or("desc").to_ascii_lowercase().as_str() {
        "asc" => "ASC",
        _ => "DESC",
    }
}

async fn ensure_kode_pelanggan_unique(
    pool: &MySqlPool,
    kode_pelanggan: Option<&str>,
    except_id: Option<u64>,
) -> Result<(), ApiError> {
    let Some(kode_pelanggan) = clean_optional(kode_pelanggan) else {
        return Ok(());
    };

    let existing_id =
        sqlx::query_scalar::<_, u64>("SELECT id FROM pelanggan WHERE kode_pelanggan = ? LIMIT 1")
            .bind(&kode_pelanggan)
            .fetch_optional(pool)
            .await
            .map_err(map_sqlx_error)?;

    if let Some(existing_id) = existing_id {
        if except_id != Some(existing_id) {
            return Err(ApiError::conflict(format!(
                "Kode pelanggan `{kode_pelanggan}` sudah digunakan."
            )));
        }
    }

    Ok(())
}

async fn ensure_pelanggan_exists(pool: &MySqlPool, id: u64) -> Result<(), ApiError> {
    let exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pelanggan WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx_error)?;

    if exists == 0 {
        return Err(ApiError::not_found(format!(
            "Pelanggan {id} tidak ditemukan."
        )));
    }

    Ok(())
}

async fn fetch_pelanggan_by_id(pool: &MySqlPool, id: u64) -> Result<PelangganResponse, ApiError> {
    let row = sqlx::query(
        "SELECT \
            p.id, \
            p.kode_pelanggan, \
            p.nama_pelanggan, \
            p.pic, \
            p.telepon, \
            p.email, \
            p.link_folder_berkas, \
            p.keterangan, \
            COUNT(CASE WHEN l.status_kontrak = 'Aktif' THEN 1 END) AS kontrak_aktif, \
            p.created_at, \
            p.updated_at \
        FROM pelanggan p \
        LEFT JOIN lokasi l ON l.pelanggan_id = p.id \
        WHERE p.id = ? \
        GROUP BY p.id",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(map_sqlx_error)?;

    let row = row.ok_or_else(|| ApiError::not_found(format!("Pelanggan {id} tidak ditemukan.")))?;
    map_pelanggan_row(row)
}

fn map_pelanggan_row(row: sqlx::mysql::MySqlRow) -> Result<PelangganResponse, ApiError> {
    let created_at = row
        .try_get::<NaiveDateTime, _>("created_at")
        .map_err(map_sqlx_error)?;
    let updated_at = row
        .try_get::<NaiveDateTime, _>("updated_at")
        .map_err(map_sqlx_error)?;

    Ok(PelangganResponse {
        id: row.try_get("id").map_err(map_sqlx_error)?,
        kode_pelanggan: row.try_get("kode_pelanggan").map_err(map_sqlx_error)?,
        nama_pelanggan: row.try_get("nama_pelanggan").map_err(map_sqlx_error)?,
        pic: row.try_get("pic").map_err(map_sqlx_error)?,
        telepon: row.try_get("telepon").map_err(map_sqlx_error)?,
        email: row.try_get("email").map_err(map_sqlx_error)?,
        link_folder_berkas: row.try_get("link_folder_berkas").map_err(map_sqlx_error)?,
        keterangan: row.try_get("keterangan").map_err(map_sqlx_error)?,
        kontrak_aktif: row
            .try_get::<i64, _>("kontrak_aktif")
            .map_err(map_sqlx_error)? as u64,
        created_at: DateTime::from_naive_utc_and_offset(created_at, Utc),
        updated_at: DateTime::from_naive_utc_and_offset(updated_at, Utc),
        existing_files: None,
    })
}

fn clean_optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn map_sqlx_error(error: sqlx::Error) -> ApiError {
    ApiError::internal(format!("Database error: {error}"))
}
