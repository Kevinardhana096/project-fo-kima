use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Datelike, Days, Months, NaiveDate, Utc};
use sqlx::{MySql, MySqlPool, QueryBuilder, Row, Transaction};

use crate::{
    app_state::AppState,
    models::{
        api::{ApiError, DetailResponse, ListMeta, ListResponse},
        lokasi::{
            LokasiPayload, LokasiQuery, LokasiResponse, PerpanjangLokasiPayload,
            UpgradeLokasiPayload,
        },
    },
};

pub async fn list_lokasi(
    State(state): State<AppState>,
    Query(query): Query<LokasiQuery>,
) -> Result<Json<ListResponse<LokasiResponse>>, ApiError> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let sort_by = sanitize_sort_by(query.sort_by.as_deref());
    let sort_order = sanitize_sort_order(query.sort_order.as_deref());

    let mut count_builder = QueryBuilder::new(
        "SELECT COUNT(*) AS total \
        FROM lokasi l \
        INNER JOIN pelanggan p ON p.id = l.pelanggan_id \
        WHERE 1 = 1",
    );
    append_lokasi_filters(&mut count_builder, &query);

    let total = count_builder
        .build_query_scalar::<i64>()
        .fetch_one(&state.pool)
        .await
        .map_err(map_sqlx_error)?;

    let mut list_builder = QueryBuilder::new(
        "SELECT \
            l.id, \
            l.kode_kontrak, \
            l.pelanggan_id, \
            p.kode_pelanggan, \
            p.nama_pelanggan, \
            l.previous_lokasi_id, \
            l.kategori, \
            l.nama_lokasi, \
            l.core, \
            l.sharing_core, \
            l.periode_awal, \
            l.periode_berakhir, \
            l.durasi_kontrak_bulan, \
            l.no_kontrak, \
            CAST(l.nilai_kontrak AS DOUBLE) AS nilai_kontrak, \
            CAST(l.biaya_aktivasi AS DOUBLE) AS biaya_aktivasi, \
            CAST(l.perbulan AS DOUBLE) AS perbulan, \
            CAST(l.nilai_periode_aktif AS DOUBLE) AS nilai_periode_aktif, \
            l.status_kontrak, \
            l.jenis_perubahan_kontrak, \
            l.alasan_perubahan, \
            l.link_folder_berkas, \
            l.keterangan, \
            l.created_at, \
            l.updated_at \
        FROM lokasi l \
        INNER JOIN pelanggan p ON p.id = l.pelanggan_id \
        WHERE 1 = 1",
    );
    append_lokasi_filters(&mut list_builder, &query);
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
        .map(map_lokasi_row)
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

pub async fn get_lokasi(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<DetailResponse<LokasiResponse>>, ApiError> {
    let mut lokasi = fetch_lokasi_by_id(&state.pool, id).await?;

    if let Some(ref folder_url) = lokasi.link_folder_berkas {
        if !folder_url.trim().is_empty() {
            match crate::services::google_drive::list_lokasi_files(folder_url).await {
                Ok(files) => lokasi.existing_files = Some(files),
                Err(e) => tracing::warn!("Failed to list drive files for lokasi {}: {}", id, e),
            }
        }
    }

    Ok(Json(DetailResponse { data: lokasi }))
}

pub async fn create_lokasi(
    State(state): State<AppState>,
    Json(payload): Json<LokasiPayload>,
) -> Result<(StatusCode, Json<DetailResponse<LokasiResponse>>), ApiError> {
    payload.validate_for_create()?;
    ensure_pelanggan_exists(&state.pool, payload.pelanggan_id).await?;

    let periode_berakhir = resolve_periode_berakhir(
        payload.periode_awal,
        payload.periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    let durasi_kontrak_bulan = resolve_durasi_kontrak_bulan(
        payload.periode_awal,
        periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    ensure_no_duplicate_lokasi(
        &state.pool,
        payload.pelanggan_id,
        payload.nama_lokasi.trim(),
        payload.periode_awal,
        periode_berakhir,
        payload.no_kontrak.as_deref(),
        None,
    )
    .await?;
    let nilai_periode_aktif = payload.nilai_kontrak + payload.biaya_aktivasi;
    let status_kontrak = determine_status_kontrak(payload.periode_awal, periode_berakhir);
    let kode_kontrak = generate_kode_kontrak(&state.pool, payload.periode_awal).await?;

    let mut tx = state.pool.begin().await.map_err(map_sqlx_error)?;

    let result = sqlx::query(
        "INSERT INTO lokasi \
        (kode_kontrak, pelanggan_id, previous_lokasi_id, kategori, nama_lokasi, core, sharing_core, \
         periode_awal, periode_berakhir, durasi_kontrak_bulan, no_kontrak, nilai_kontrak, biaya_aktivasi, \
         perbulan, nilai_periode_aktif, status_kontrak, jenis_perubahan_kontrak, alasan_perubahan, \
         link_folder_berkas, keterangan) \
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)",
    )
    .bind(kode_kontrak)
    .bind(payload.pelanggan_id)
    .bind(clean_optional(payload.kategori.as_str()))
    .bind(clean_optional(payload.nama_lokasi.as_str()))
    .bind(clean_optional_option(payload.core.as_deref()))
    .bind(clean_optional_option(payload.sharing_core.as_deref()))
    .bind(payload.periode_awal)
    .bind(periode_berakhir)
    .bind(durasi_kontrak_bulan)
    .bind(clean_optional_option(payload.no_kontrak.as_deref()))
    .bind(payload.nilai_kontrak)
    .bind(payload.biaya_aktivasi)
    .bind(payload.perbulan)
    .bind(nilai_periode_aktif)
    .bind(status_kontrak)
    .bind(clean_optional_option(payload.link_folder_berkas.as_deref()))
    .bind(clean_optional_option(payload.keterangan.as_deref()))
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    let lokasi_id = result.last_insert_id();

    // Google Drive Integration
    let mut final_link_folder_berkas = payload.link_folder_berkas.clone();

    // Handle File Deletions & Uploads
    if let Some(ref ids) = payload.delete_file_ids {
        for file_id in ids {
            if let Err(e) = crate::services::google_drive::delete_file(file_id).await {
                return Err(ApiError::internal(format!(
                    "Gagal menghapus berkas lokasi dari Google Drive: {e}"
                )));
            }
        }
    }

    if let Some(ref items) = payload.upload_items {
        if !items.is_empty() {
            let folder_url = if let Some(existing_url) = final_link_folder_berkas
                .as_deref()
                .filter(|s| !s.trim().is_empty())
            {
                existing_url.to_string()
            } else {
                let periode_awal_str = payload.periode_awal.format("%Y-%m-%d").to_string();
                let periode_berakhir_str = periode_berakhir.format("%Y-%m-%d").to_string();
                match crate::services::google_drive::ensure_kontrak_periode_folder(
                    payload.nama_lokasi.trim(),
                    &periode_awal_str,
                    &periode_berakhir_str,
                )
                .await
                {
                    Ok((_, url)) => {
                        final_link_folder_berkas = Some(url.clone());
                        url
                    }
                    Err(e) => {
                        return Err(ApiError::internal(format!(
                            "Gagal membuat folder Google Drive untuk lokasi: {e}"
                        )));
                    }
                }
            };

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

    if let Some(ref url) = final_link_folder_berkas {
        sqlx::query("UPDATE lokasi SET link_folder_berkas = ? WHERE id = ?")
            .bind(url)
            .bind(lokasi_id)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx_error)?;
    }

    tx.commit().await.map_err(map_sqlx_error)?;

    let mut lokasi = fetch_lokasi_by_id(&state.pool, lokasi_id).await?;
    lokasi.link_folder_berkas = final_link_folder_berkas;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_lokasi_to_sheets(&pool_clone).await {
            eprintln!("Background sync error: {}", e);
        }
    });

    Ok((StatusCode::CREATED, Json(DetailResponse { data: lokasi })))
}

pub async fn update_lokasi(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(payload): Json<LokasiPayload>,
) -> Result<Json<DetailResponse<LokasiResponse>>, ApiError> {
    payload.validate_for_create()?;
    fetch_lokasi_by_id(&state.pool, id).await?;
    ensure_pelanggan_exists(&state.pool, payload.pelanggan_id).await?;

    let periode_berakhir = resolve_periode_berakhir(
        payload.periode_awal,
        payload.periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    let durasi_kontrak_bulan = resolve_durasi_kontrak_bulan(
        payload.periode_awal,
        periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    ensure_no_duplicate_lokasi(
        &state.pool,
        payload.pelanggan_id,
        payload.nama_lokasi.trim(),
        payload.periode_awal,
        periode_berakhir,
        payload.no_kontrak.as_deref(),
        Some(id),
    )
    .await?;
    let nilai_periode_aktif = payload.nilai_kontrak + payload.biaya_aktivasi;
    let status_kontrak = determine_status_kontrak(payload.periode_awal, periode_berakhir);

    let mut tx = state.pool.begin().await.map_err(map_sqlx_error)?;

    sqlx::query(
        "UPDATE lokasi SET \
            pelanggan_id = ?, \
            kategori = ?, \
            nama_lokasi = ?, \
            core = ?, \
            sharing_core = ?, \
            periode_awal = ?, \
            periode_berakhir = ?, \
            durasi_kontrak_bulan = ?, \
            no_kontrak = ?, \
            nilai_kontrak = ?, \
            biaya_aktivasi = ?, \
            perbulan = ?, \
            nilai_periode_aktif = ?, \
            status_kontrak = ?, \
            link_folder_berkas = ?, \
            keterangan = ? \
        WHERE id = ?",
    )
    .bind(payload.pelanggan_id)
    .bind(clean_optional(payload.kategori.as_str()))
    .bind(clean_optional(payload.nama_lokasi.as_str()))
    .bind(clean_optional_option(payload.core.as_deref()))
    .bind(clean_optional_option(payload.sharing_core.as_deref()))
    .bind(payload.periode_awal)
    .bind(periode_berakhir)
    .bind(durasi_kontrak_bulan)
    .bind(clean_optional_option(payload.no_kontrak.as_deref()))
    .bind(payload.nilai_kontrak)
    .bind(payload.biaya_aktivasi)
    .bind(payload.perbulan)
    .bind(nilai_periode_aktif)
    .bind(status_kontrak)
    .bind(clean_optional_option(payload.link_folder_berkas.as_deref()))
    .bind(clean_optional_option(payload.keterangan.as_deref()))
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    // Google Drive Integration
    let mut final_link_folder_berkas = payload.link_folder_berkas.clone();

    // Handle File Deletions & Uploads
    if let Some(ref ids) = payload.delete_file_ids {
        for file_id in ids {
            if let Err(e) = crate::services::google_drive::delete_file(file_id).await {
                return Err(ApiError::internal(format!(
                    "Gagal menghapus berkas lokasi dari Google Drive: {e}"
                )));
            }
        }
    }

    if let Some(ref items) = payload.upload_items {
        if !items.is_empty() {
            let folder_url = if let Some(existing_url) = final_link_folder_berkas
                .as_deref()
                .filter(|s| !s.trim().is_empty())
            {
                existing_url.to_string()
            } else {
                let periode_awal_str = payload.periode_awal.format("%Y-%m-%d").to_string();
                let periode_berakhir_str = periode_berakhir.format("%Y-%m-%d").to_string();
                match crate::services::google_drive::ensure_kontrak_periode_folder(
                    payload.nama_lokasi.trim(),
                    &periode_awal_str,
                    &periode_berakhir_str,
                )
                .await
                {
                    Ok((_, url)) => {
                        final_link_folder_berkas = Some(url.clone());
                        url
                    }
                    Err(e) => {
                        return Err(ApiError::internal(format!(
                            "Gagal membuat folder Google Drive untuk lokasi: {e}"
                        )));
                    }
                }
            };

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

    if let Some(ref url) = final_link_folder_berkas {
        sqlx::query("UPDATE lokasi SET link_folder_berkas = ? WHERE id = ?")
            .bind(url)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx_error)?;
    }

    tx.commit().await.map_err(map_sqlx_error)?;

    let mut lokasi = fetch_lokasi_by_id(&state.pool, id).await?;
    lokasi.link_folder_berkas = final_link_folder_berkas;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_lokasi_to_sheets(&pool_clone).await {
            eprintln!("Background sync error: {}", e);
        }
    });

    Ok(Json(DetailResponse { data: lokasi }))
}

pub async fn delete_lokasi(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<StatusCode, ApiError> {
    let existing = fetch_lokasi_by_id(&state.pool, id).await?;

    let child_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM lokasi WHERE previous_lokasi_id = ?")
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(map_sqlx_error)?;

    if child_count > 0 {
        return Err(ApiError::conflict(format!(
            "Kontrak Lengkap {id} tidak bisa dihapus karena sudah memiliki histori turunan."
        )));
    }

    if let Some(ref folder_url) = existing.link_folder_berkas {
        if !folder_url.trim().is_empty() {
            let same_folder_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM lokasi WHERE link_folder_berkas = ? AND id <> ?",
            )
            .bind(folder_url)
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(map_sqlx_error)?;

            if same_folder_count == 0 {
                crate::services::google_drive::delete_folder_by_url(folder_url)
                    .await
                    .map_err(|e| {
                        ApiError::internal(format!(
                            "Gagal menghapus folder kontrak dari Google Drive: {e}"
                        ))
                    })?;
            }
        }
    }

    sqlx::query("DELETE FROM lokasi WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(map_sqlx_error)?;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_lokasi_to_sheets(&pool_clone).await {
            eprintln!("Background sync error: {}", e);
        }
    });

    Ok(StatusCode::NO_CONTENT)
}

pub async fn perpanjang_lokasi(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(payload): Json<PerpanjangLokasiPayload>,
) -> Result<(StatusCode, Json<DetailResponse<LokasiResponse>>), ApiError> {
    payload.validate()?;
    let existing = fetch_lokasi_by_id(&state.pool, id).await?;
    ensure_latest_contract(&state.pool, &existing).await?;

    let periode_berakhir = resolve_periode_berakhir(
        payload.periode_awal,
        payload.periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    let durasi_kontrak_bulan = resolve_durasi_kontrak_bulan(
        payload.periode_awal,
        periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    let nilai_periode_aktif = payload.nilai_kontrak + payload.biaya_aktivasi;
    let new_status = determine_status_kontrak(payload.periode_awal, periode_berakhir);
    let old_status = determine_previous_status_for_perpanjang(payload.periode_awal);

    let mut tx = state.pool.begin().await.map_err(map_sqlx_error)?;
    let kode_kontrak = generate_kode_kontrak_tx(&mut tx, payload.periode_awal).await?;

    let result = sqlx::query(
        "INSERT INTO lokasi \
        (kode_kontrak, pelanggan_id, previous_lokasi_id, kategori, nama_lokasi, core, sharing_core, \
         periode_awal, periode_berakhir, durasi_kontrak_bulan, no_kontrak, nilai_kontrak, biaya_aktivasi, \
         perbulan, nilai_periode_aktif, status_kontrak, jenis_perubahan_kontrak, alasan_perubahan, \
         link_folder_berkas, keterangan) \
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Perpanjangan', NULL, ?, ?)",
    )
    .bind(kode_kontrak)
    .bind(existing.pelanggan_id)
    .bind(existing.id)
    .bind(clean_optional(payload.kategori.as_str()))
    .bind(clean_optional(payload.nama_lokasi.as_str()))
    .bind(clean_optional_option(payload.core.as_deref()))
    .bind(clean_optional_option(payload.sharing_core.as_deref()))
    .bind(payload.periode_awal)
    .bind(periode_berakhir)
    .bind(durasi_kontrak_bulan)
    .bind(clean_optional_option(payload.no_kontrak.as_deref()))
    .bind(payload.nilai_kontrak)
    .bind(payload.biaya_aktivasi)
    .bind(payload.perbulan)
    .bind(nilai_periode_aktif)
    .bind(new_status)
    .bind(existing.link_folder_berkas.clone())
    .bind(clean_optional_option(payload.keterangan.as_deref()))
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    let lokasi_id = result.last_insert_id();

    // Google Drive Integration
    let mut final_link_folder_berkas = existing.link_folder_berkas.clone();

    // Handle File Deletions & Uploads
    if let Some(ref ids) = payload.delete_file_ids {
        for file_id in ids {
            if let Err(e) = crate::services::google_drive::delete_file(file_id).await {
                return Err(ApiError::internal(format!(
                    "Gagal menghapus berkas lokasi dari Google Drive: {e}"
                )));
            }
        }
    }

    if let Some(ref items) = payload.upload_items {
        if !items.is_empty() {
            let folder_url = if let Some(existing_url) = final_link_folder_berkas
                .as_deref()
                .filter(|s| !s.trim().is_empty())
            {
                existing_url.to_string()
            } else {
                let periode_awal_str = payload.periode_awal.format("%Y-%m-%d").to_string();
                let periode_berakhir_str = periode_berakhir.format("%Y-%m-%d").to_string();
                match crate::services::google_drive::ensure_kontrak_periode_folder(
                    payload.nama_lokasi.trim(),
                    &periode_awal_str,
                    &periode_berakhir_str,
                )
                .await
                {
                    Ok((_, url)) => {
                        final_link_folder_berkas = Some(url.clone());
                        url
                    }
                    Err(e) => {
                        return Err(ApiError::internal(format!(
                            "Gagal membuat folder Google Drive untuk lokasi: {e}"
                        )));
                    }
                }
            };

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

    sqlx::query("UPDATE lokasi SET status_kontrak = ? WHERE id = ?")
        .bind(old_status)
        .bind(existing.id)
        .execute(&mut *tx)
        .await
        .map_err(map_sqlx_error)?;

    if let Some(ref url) = final_link_folder_berkas {
        sqlx::query("UPDATE lokasi SET link_folder_berkas = ? WHERE id = ?")
            .bind(url)
            .bind(lokasi_id)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx_error)?;
    }

    tx.commit().await.map_err(map_sqlx_error)?;

    let mut lokasi = fetch_lokasi_by_id(&state.pool, lokasi_id).await?;
    lokasi.link_folder_berkas = final_link_folder_berkas;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_lokasi_to_sheets(&pool_clone).await {
            eprintln!("Background sync error: {}", e);
        }
    });

    Ok((StatusCode::CREATED, Json(DetailResponse { data: lokasi })))
}

pub async fn upgrade_lokasi(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(payload): Json<UpgradeLokasiPayload>,
) -> Result<(StatusCode, Json<DetailResponse<LokasiResponse>>), ApiError> {
    payload.validate()?;
    let existing = fetch_lokasi_by_id(&state.pool, id).await?;
    ensure_latest_contract(&state.pool, &existing).await?;

    if existing.status_kontrak != "Aktif" {
        return Err(ApiError::conflict(format!(
            "Kontrak Lengkap {id} tidak bisa di-upgrade karena status saat ini `{}`.",
            existing.status_kontrak
        )));
    }

    let periode_berakhir = resolve_periode_berakhir(
        payload.periode_awal,
        payload.periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;
    let durasi_kontrak_bulan = resolve_durasi_kontrak_bulan(
        payload.periode_awal,
        periode_berakhir,
        payload.durasi_kontrak_bulan,
    )?;

    if payload.periode_awal <= existing.periode_awal {
        return Err(ApiError::validation(
            "Tanggal mulai upgrade harus setelah periode awal kontrak sebelumnya.",
        ));
    }

    if payload.periode_awal > existing.periode_berakhir {
        return Err(ApiError::validation(
            "Tanggal mulai upgrade harus masih berada dalam periode kontrak sebelumnya.",
        ));
    }

    let old_end_date = payload
        .periode_awal
        .checked_sub_days(Days::new(1))
        .ok_or_else(|| ApiError::validation("Tanggal mulai upgrade tidak valid."))?;
    let old_duration = resolve_durasi_kontrak_bulan(existing.periode_awal, old_end_date, None)?;
    let old_nilai_kontrak = existing.perbulan * f64::from(old_duration);
    let old_nilai_periode_aktif =
        calculate_nilai_periode_aktif(existing.perbulan, existing.biaya_aktivasi, old_duration);
    let new_nilai_periode_aktif = payload.nilai_kontrak + payload.biaya_aktivasi;
    let new_status = determine_status_kontrak(payload.periode_awal, periode_berakhir);

    let mut tx = state.pool.begin().await.map_err(map_sqlx_error)?;
    let kode_kontrak = generate_kode_kontrak_tx(&mut tx, payload.periode_awal).await?;

    sqlx::query(
        "UPDATE lokasi SET \
            periode_berakhir = ?, \
            durasi_kontrak_bulan = ?, \
            nilai_kontrak = ?, \
            nilai_periode_aktif = ?, \
            status_kontrak = 'Di-upgrade' \
        WHERE id = ?",
    )
    .bind(old_end_date)
    .bind(old_duration)
    .bind(old_nilai_kontrak)
    .bind(old_nilai_periode_aktif)
    .bind(existing.id)
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    let result = sqlx::query(
        "INSERT INTO lokasi \
        (kode_kontrak, pelanggan_id, previous_lokasi_id, kategori, nama_lokasi, core, sharing_core, \
         periode_awal, periode_berakhir, durasi_kontrak_bulan, no_kontrak, nilai_kontrak, biaya_aktivasi, \
         perbulan, nilai_periode_aktif, status_kontrak, jenis_perubahan_kontrak, alasan_perubahan, \
         link_folder_berkas, keterangan) \
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upgrade', ?, ?, ?)",
    )
    .bind(kode_kontrak)
    .bind(existing.pelanggan_id)
    .bind(existing.id)
    .bind(clean_optional(payload.kategori.as_str()))
    .bind(clean_optional(payload.nama_lokasi.as_str()))
    .bind(clean_optional_option(payload.core.as_deref()))
    .bind(clean_optional_option(payload.sharing_core.as_deref()))
    .bind(payload.periode_awal)
    .bind(periode_berakhir)
    .bind(durasi_kontrak_bulan)
    .bind(clean_optional_option(payload.no_kontrak.as_deref()))
    .bind(payload.nilai_kontrak)
    .bind(payload.biaya_aktivasi)
    .bind(payload.perbulan)
    .bind(new_nilai_periode_aktif)
    .bind(new_status)
    .bind(clean_optional_option(payload.alasan_perubahan.as_deref()))
    .bind(existing.link_folder_berkas.clone())
    .bind(clean_optional_option(payload.keterangan.as_deref()))
    .execute(&mut *tx)
    .await
    .map_err(map_sqlx_error)?;

    let lokasi_id = result.last_insert_id();

    // Google Drive Integration
    let mut final_link_folder_berkas = existing.link_folder_berkas.clone();

    // Handle File Deletions & Uploads
    if let Some(ref ids) = payload.delete_file_ids {
        for file_id in ids {
            if let Err(e) = crate::services::google_drive::delete_file(file_id).await {
                return Err(ApiError::internal(format!(
                    "Gagal menghapus berkas lokasi dari Google Drive: {e}"
                )));
            }
        }
    }

    if let Some(ref items) = payload.upload_items {
        if !items.is_empty() {
            let folder_url = if let Some(existing_url) = final_link_folder_berkas
                .as_deref()
                .filter(|s| !s.trim().is_empty())
            {
                existing_url.to_string()
            } else {
                let periode_awal_str = payload.periode_awal.format("%Y-%m-%d").to_string();
                let periode_berakhir_str = periode_berakhir.format("%Y-%m-%d").to_string();
                match crate::services::google_drive::ensure_kontrak_periode_folder(
                    payload.nama_lokasi.trim(),
                    &periode_awal_str,
                    &periode_berakhir_str,
                )
                .await
                {
                    Ok((_, url)) => {
                        final_link_folder_berkas = Some(url.clone());
                        url
                    }
                    Err(e) => {
                        return Err(ApiError::internal(format!(
                            "Gagal membuat folder Google Drive untuk lokasi: {e}"
                        )));
                    }
                }
            };

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

    if let Some(ref url) = final_link_folder_berkas {
        sqlx::query("UPDATE lokasi SET link_folder_berkas = ? WHERE id = ?")
            .bind(url)
            .bind(lokasi_id)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx_error)?;
    }

    tx.commit().await.map_err(map_sqlx_error)?;

    let mut lokasi = fetch_lokasi_by_id(&state.pool, lokasi_id).await?;
    lokasi.link_folder_berkas = final_link_folder_berkas;

    let pool_clone = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::services::google_sheets::sync_lokasi_to_sheets(&pool_clone).await {
            eprintln!("Background sync error: {}", e);
        }
    });

    Ok((StatusCode::CREATED, Json(DetailResponse { data: lokasi })))
}

fn append_lokasi_filters(builder: &mut QueryBuilder<'_, sqlx::MySql>, query: &LokasiQuery) {
    if let Some(search) = clean_optional_option(query.search.as_deref()) {
        let pattern = format!("%{search}%");
        builder
            .push(" AND (l.kode_kontrak LIKE ")
            .push_bind(pattern.clone())
            .push(" OR l.nama_lokasi LIKE ")
            .push_bind(pattern.clone())
            .push(" OR p.nama_pelanggan LIKE ")
            .push_bind(pattern.clone())
            .push(" OR l.no_kontrak LIKE ")
            .push_bind(pattern)
            .push(")");
    }

    if let Some(pelanggan_id) = query.pelanggan_id {
        builder
            .push(" AND l.pelanggan_id = ")
            .push_bind(pelanggan_id);
    }

    if let Some(status_kontrak) = clean_optional_option(query.status_kontrak.as_deref()) {
        builder
            .push(" AND l.status_kontrak = ")
            .push_bind(status_kontrak);
    }

    if let Some(kategori) = clean_optional_option(query.kategori.as_deref()) {
        builder.push(" AND l.kategori = ").push_bind(kategori);
    }

    if let Some(nama_lokasi) = clean_optional_option(query.nama_lokasi.as_deref()) {
        let pattern = format!("%{nama_lokasi}%");
        builder.push(" AND l.nama_lokasi LIKE ").push_bind(pattern);
    }

    if let Some(date) = query.periode_awal_from {
        builder.push(" AND l.periode_awal >= ").push_bind(date);
    }

    if let Some(date) = query.periode_awal_to {
        builder.push(" AND l.periode_awal <= ").push_bind(date);
    }

    if let Some(date) = query.periode_berakhir_from {
        builder.push(" AND l.periode_berakhir >= ").push_bind(date);
    }

    if let Some(date) = query.periode_berakhir_to {
        builder.push(" AND l.periode_berakhir <= ").push_bind(date);
    }
}

fn sanitize_sort_by(input: Option<&str>) -> &'static str {
    match input.unwrap_or("created_at") {
        "kode_kontrak" => "l.kode_kontrak",
        "periode_awal" => "l.periode_awal",
        "periode_berakhir" => "l.periode_berakhir",
        "nama_lokasi" => "l.nama_lokasi",
        "status_kontrak" => "l.status_kontrak",
        "updated_at" => "l.updated_at",
        _ => "l.created_at",
    }
}

fn sanitize_sort_order(input: Option<&str>) -> &'static str {
    match input.unwrap_or("desc").to_ascii_lowercase().as_str() {
        "asc" => "ASC",
        _ => "DESC",
    }
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

async fn ensure_no_duplicate_lokasi(
    pool: &MySqlPool,
    pelanggan_id: u64,
    nama_lokasi: &str,
    periode_awal: NaiveDate,
    periode_berakhir: NaiveDate,
    no_kontrak: Option<&str>,
    except_id: Option<u64>,
) -> Result<(), ApiError> {
    let existing_id = sqlx::query_scalar::<_, u64>(
        "SELECT id \
        FROM lokasi \
        WHERE pelanggan_id = ? \
          AND nama_lokasi = ? \
          AND periode_awal = ? \
          AND periode_berakhir = ? \
          AND (no_kontrak <=> ?) \
        LIMIT 1",
    )
    .bind(pelanggan_id)
    .bind(nama_lokasi)
    .bind(periode_awal)
    .bind(periode_berakhir)
    .bind(clean_optional_option(no_kontrak))
    .fetch_optional(pool)
    .await
    .map_err(map_sqlx_error)?;

    if let Some(existing_id) = existing_id {
        if except_id != Some(existing_id) {
            return Err(ApiError::conflict(format!(
                "Kontrak Lengkap untuk pelanggan dan lokasi yang sama sudah ada pada id {existing_id}."
            )));
        }
    }

    Ok(())
}

async fn fetch_lokasi_by_id(pool: &MySqlPool, id: u64) -> Result<LokasiResponse, ApiError> {
    let row = sqlx::query(
        "SELECT \
            l.id, \
            l.kode_kontrak, \
            l.pelanggan_id, \
            p.kode_pelanggan, \
            p.nama_pelanggan, \
            l.previous_lokasi_id, \
            l.kategori, \
            l.nama_lokasi, \
            l.core, \
            l.sharing_core, \
            l.periode_awal, \
            l.periode_berakhir, \
            l.durasi_kontrak_bulan, \
            l.no_kontrak, \
            CAST(l.nilai_kontrak AS DOUBLE) AS nilai_kontrak, \
            CAST(l.biaya_aktivasi AS DOUBLE) AS biaya_aktivasi, \
            CAST(l.perbulan AS DOUBLE) AS perbulan, \
            CAST(l.nilai_periode_aktif AS DOUBLE) AS nilai_periode_aktif, \
            l.status_kontrak, \
            l.jenis_perubahan_kontrak, \
            l.alasan_perubahan, \
            l.link_folder_berkas, \
            l.keterangan, \
            l.created_at, \
            l.updated_at \
        FROM lokasi l \
        INNER JOIN pelanggan p ON p.id = l.pelanggan_id \
        WHERE l.id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(map_sqlx_error)?;

    let row =
        row.ok_or_else(|| ApiError::not_found(format!("Kontrak Lengkap {id} tidak ditemukan.")))?;
    map_lokasi_row(row)
}

async fn generate_kode_kontrak(
    pool: &MySqlPool,
    periode_awal: NaiveDate,
) -> Result<String, ApiError> {
    let year = periode_awal.year();
    let prefix = format!("CTR-{year}-");

    let last_kode = sqlx::query_scalar::<_, String>(
        "SELECT kode_kontrak \
        FROM lokasi \
        WHERE kode_kontrak LIKE ? \
        ORDER BY kode_kontrak DESC \
        LIMIT 1",
    )
    .bind(format!("{prefix}%"))
    .fetch_optional(pool)
    .await
    .map_err(map_sqlx_error)?;

    let next_sequence = last_kode
        .as_deref()
        .and_then(|kode| kode.rsplit('-').next())
        .and_then(|suffix| suffix.parse::<u32>().ok())
        .map(|value| value + 1)
        .unwrap_or(1);

    Ok(format!("{prefix}{next_sequence:04}"))
}

async fn generate_kode_kontrak_tx(
    tx: &mut Transaction<'_, MySql>,
    periode_awal: NaiveDate,
) -> Result<String, ApiError> {
    let year = periode_awal.year();
    let prefix = format!("CTR-{year}-");

    let last_kode = sqlx::query_scalar::<_, String>(
        "SELECT kode_kontrak \
        FROM lokasi \
        WHERE kode_kontrak LIKE ? \
        ORDER BY kode_kontrak DESC \
        LIMIT 1",
    )
    .bind(format!("{prefix}%"))
    .fetch_optional(&mut **tx)
    .await
    .map_err(map_sqlx_error)?;

    let next_sequence = last_kode
        .as_deref()
        .and_then(|kode| kode.rsplit('-').next())
        .and_then(|suffix| suffix.parse::<u32>().ok())
        .map(|value| value + 1)
        .unwrap_or(1);

    Ok(format!("{prefix}{next_sequence:04}"))
}

async fn ensure_latest_contract(pool: &MySqlPool, lokasi: &LokasiResponse) -> Result<(), ApiError> {
    let latest_id = sqlx::query_scalar::<_, u64>(
        "SELECT id \
        FROM lokasi \
        WHERE pelanggan_id = ? AND nama_lokasi = ? \
        ORDER BY periode_awal DESC, id DESC \
        LIMIT 1",
    )
    .bind(lokasi.pelanggan_id)
    .bind(&lokasi.nama_lokasi)
    .fetch_optional(pool)
    .await
    .map_err(map_sqlx_error)?;

    if latest_id != Some(lokasi.id) {
        return Err(ApiError::conflict(format!(
            "Kontrak Lengkap {} bukan kontrak terbaru untuk pelanggan dan nama lokasi tersebut.",
            lokasi.id
        )));
    }

    Ok(())
}

fn resolve_periode_berakhir(
    periode_awal: NaiveDate,
    periode_berakhir: Option<NaiveDate>,
    durasi_kontrak_bulan: Option<u32>,
) -> Result<NaiveDate, ApiError> {
    match (periode_berakhir, durasi_kontrak_bulan) {
        (Some(end_date), Some(duration)) => {
            let expected = derive_end_date(periode_awal, duration)?;
            if expected != end_date {
                return Err(ApiError::validation(
                    "Periode berakhir tidak cocok dengan durasi kontrak yang diberikan.",
                ));
            }

            Ok(end_date)
        }
        (Some(end_date), None) => Ok(end_date),
        (None, Some(duration)) => derive_end_date(periode_awal, duration),
        (None, None) => Err(ApiError::validation(
            "Periode berakhir atau durasi kontrak wajib diisi.",
        )),
    }
}

fn resolve_durasi_kontrak_bulan(
    periode_awal: NaiveDate,
    periode_berakhir: NaiveDate,
    durasi_kontrak_bulan: Option<u32>,
) -> Result<u32, ApiError> {
    if let Some(duration) = durasi_kontrak_bulan {
        return Ok(duration);
    }

    let mut cursor = periode_awal;
    let mut duration = 0_u32;

    while cursor <= periode_berakhir {
        duration += 1;
        cursor = cursor
            .checked_add_months(Months::new(1))
            .ok_or_else(|| ApiError::validation("Gagal menghitung durasi kontrak."))?;
    }

    Ok(duration)
}

fn derive_end_date(
    periode_awal: NaiveDate,
    durasi_kontrak_bulan: u32,
) -> Result<NaiveDate, ApiError> {
    let next_period = periode_awal
        .checked_add_months(Months::new(durasi_kontrak_bulan))
        .ok_or_else(|| ApiError::validation("Durasi kontrak menghasilkan tanggal tidak valid."))?;

    next_period
        .checked_sub_days(Days::new(1))
        .ok_or_else(|| ApiError::validation("Durasi kontrak menghasilkan tanggal tidak valid."))
}

fn determine_status_kontrak(periode_awal: NaiveDate, periode_berakhir: NaiveDate) -> &'static str {
    let today = Utc::now().date_naive();

    if periode_awal > today {
        "Belum Beroperasi"
    } else if periode_berakhir < today {
        "Berakhir"
    } else {
        "Aktif"
    }
}

fn determine_previous_status_for_perpanjang(new_periode_awal: NaiveDate) -> &'static str {
    let today = Utc::now().date_naive();

    if new_periode_awal <= today {
        "Diperpanjang"
    } else {
        "Aktif"
    }
}

fn calculate_nilai_periode_aktif(
    perbulan: f64,
    biaya_aktivasi: f64,
    durasi_kontrak_bulan: u32,
) -> f64 {
    (perbulan * f64::from(durasi_kontrak_bulan)) + biaya_aktivasi
}

fn map_lokasi_row(row: sqlx::mysql::MySqlRow) -> Result<LokasiResponse, ApiError> {
    Ok(LokasiResponse {
        id: row.try_get("id").map_err(map_sqlx_error)?,
        kode_kontrak: row.try_get("kode_kontrak").map_err(map_sqlx_error)?,
        pelanggan_id: row.try_get("pelanggan_id").map_err(map_sqlx_error)?,
        kode_pelanggan: row.try_get("kode_pelanggan").map_err(map_sqlx_error)?,
        nama_pelanggan: row.try_get("nama_pelanggan").map_err(map_sqlx_error)?,
        previous_lokasi_id: row.try_get("previous_lokasi_id").map_err(map_sqlx_error)?,
        kategori: row.try_get("kategori").map_err(map_sqlx_error)?,
        nama_lokasi: row.try_get("nama_lokasi").map_err(map_sqlx_error)?,
        core: row.try_get("core").map_err(map_sqlx_error)?,
        sharing_core: row.try_get("sharing_core").map_err(map_sqlx_error)?,
        periode_awal: row.try_get("periode_awal").map_err(map_sqlx_error)?,
        periode_berakhir: row.try_get("periode_berakhir").map_err(map_sqlx_error)?,
        durasi_kontrak_bulan: row
            .try_get("durasi_kontrak_bulan")
            .map_err(map_sqlx_error)?,
        no_kontrak: row.try_get("no_kontrak").map_err(map_sqlx_error)?,
        nilai_kontrak: row.try_get("nilai_kontrak").map_err(map_sqlx_error)?,
        biaya_aktivasi: row.try_get("biaya_aktivasi").map_err(map_sqlx_error)?,
        perbulan: row.try_get("perbulan").map_err(map_sqlx_error)?,
        nilai_periode_aktif: row.try_get("nilai_periode_aktif").map_err(map_sqlx_error)?,
        status_kontrak: row.try_get("status_kontrak").map_err(map_sqlx_error)?,
        jenis_perubahan_kontrak: row
            .try_get("jenis_perubahan_kontrak")
            .map_err(map_sqlx_error)?,
        alasan_perubahan: row.try_get("alasan_perubahan").map_err(map_sqlx_error)?,
        link_folder_berkas: row.try_get("link_folder_berkas").map_err(map_sqlx_error)?,
        keterangan: row.try_get("keterangan").map_err(map_sqlx_error)?,
        created_at: row
            .try_get::<DateTime<Utc>, _>("created_at")
            .map_err(map_sqlx_error)?,
        updated_at: row
            .try_get::<DateTime<Utc>, _>("updated_at")
            .map_err(map_sqlx_error)?,
        existing_files: None,
    })
}

fn clean_optional(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}

fn clean_optional_option(value: Option<&str>) -> Option<String> {
    value.and_then(clean_optional)
}

fn map_sqlx_error(error: sqlx::Error) -> ApiError {
    ApiError::internal(format!("Database error: {error}"))
}
