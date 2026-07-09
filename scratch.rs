pub async fn sync_lokasi_to_sheets(pool: &MySqlPool) -> Result<(), String> {
    let spreadsheet_id =
        env::var("SPREADSHEET_ID").map_err(|_| "SPREADSHEET_ID not set".to_string())?;

    let token = get_token().await?;

    let rows = sqlx::query(
        "SELECT \
            l.kode_kontrak, \
            p.nama_pelanggan, \
            l.kategori, \
            l.nama_lokasi, \
            l.core, \
            l.sharing_core, \
            l.periode_awal, \
            l.periode_berakhir, \
            l.durasi_kontrak_bulan, \
            l.no_kontrak, \
            l.nilai_kontrak, \
            l.biaya_aktivasi, \
            l.perbulan, \
            l.status_kontrak, \
            l.link_folder_berkas, \
            l.keterangan \
        FROM lokasi l \
        LEFT JOIN pelanggan p ON l.pelanggan_id = p.id \
        ORDER BY l.created_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut values: Vec<Vec<String>> = Vec::new();

    for (i, row) in rows.into_iter().enumerate() {
        let mut row_data = Vec::new();
        row_data.push((i + 1).to_string()); // No
        row_data.push(
            row.try_get::<String, _>("kode_kontrak")
                .unwrap_or_default(),
        );
        row_data.push(
            row.try_get::<Option<String>, _>("nama_pelanggan")
                .unwrap_or_default()
                .unwrap_or_default(),
        );
        row_data.push(
            row.try_get::<String, _>("kategori")
                .unwrap_or_default(),
        );
        row_data.push(
            row.try_get::<String, _>("nama_lokasi")
                .unwrap_or_default(),
        );
        
        let core = row.try_get::<Option<String>, _>("core").unwrap_or_default().unwrap_or_default();
        let sharing = row.try_get::<Option<String>, _>("sharing_core").unwrap_or_default().unwrap_or_default();
        let mut core_str = core;
        if !sharing.is_empty() {
            core_str = format!("Sharing {}", sharing);
        }
        row_data.push(core_str);

        row_data.push(
            row.try_get::<chrono::NaiveDate, _>("periode_awal")
                .map(|d| d.format("%d/%m/%Y").to_string())
                .unwrap_or_default(),
        );
        
        row_data.push(
            row.try_get::<Option<chrono::NaiveDate>, _>("periode_berakhir")
                .unwrap_or_default()
                .map(|d| d.format("%d/%m/%Y").to_string())
                .unwrap_or_default(),
        );

        row_data.push(
            row.try_get::<Option<u32>, _>("durasi_kontrak_bulan")
                .unwrap_or_default()
                .map(|d| d.to_string())
                .unwrap_or_default(),
        );
        
        row_data.push(
            row.try_get::<Option<String>, _>("no_kontrak")
                .unwrap_or_default()
                .unwrap_or_default(),
        );
        
        row_data.push(
            row.try_get::<f64, _>("nilai_kontrak")
                .unwrap_or(0.0)
                .to_string(),
        );
        
        row_data.push(
            row.try_get::<f64, _>("biaya_aktivasi")
                .unwrap_or(0.0)
                .to_string(),
        );
        
        row_data.push(
            row.try_get::<f64, _>("perbulan")
                .unwrap_or(0.0)
                .to_string(),
        );
        
        row_data.push(
            row.try_get::<String, _>("status_kontrak")
                .unwrap_or_default(),
        );
        
        row_data.push(
            row.try_get::<Option<String>, _>("link_folder_berkas")
                .unwrap_or_default()
                .unwrap_or_default(),
        );
        
        row_data.push(
            row.try_get::<Option<String>, _>("keterangan")
                .unwrap_or_default()
                .unwrap_or_default(),
        );

        values.push(row_data);
    }

    let client = reqwest::Client::new();

    // 1. Clear existing data
    let clear_url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/Kontrak%20Lengkap!A2:Z:clear",
        spreadsheet_id
    );

    let clear_res = client
        .post(&clear_url)
        .bearer_auth(&token)
        .json(&ClearRequest {})
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !clear_res.status().is_success() {
        let err_text = clear_res.text().await.unwrap_or_default();
        return Err(format!("Failed to clear sheet: {}", err_text));
    }

    // 2. Write new data
    if !values.is_empty() {
        let append_url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/Kontrak%20Lengkap!A2:append?valueInputOption=USER_ENTERED",
            spreadsheet_id
        );

        let append_req = AppendRequest {
            range: "Kontrak Lengkap!A2".to_string(),
            major_dimension: "ROWS".to_string(),
            values,
        };

        let append_res = client
            .post(&append_url)
            .bearer_auth(&token)
            .json(&append_req)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !append_res.status().is_success() {
            let err_text = append_res.text().await.unwrap_or_default();
            return Err(format!("Failed to append sheet: {}", err_text));
        }
    }

    Ok(())
}
