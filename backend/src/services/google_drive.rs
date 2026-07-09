use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::env;
use yup_oauth2::ServiceAccountAuthenticator;

use crate::models::pelanggan::CustomerFileRecord;

pub async fn get_drive_token() -> Result<String, String> {
    let cred_path = env::var("GOOGLE_APPLICATION_CREDENTIALS")
        .map_err(|_| "GOOGLE_APPLICATION_CREDENTIALS not set".to_string())?;

    let secret = yup_oauth2::read_service_account_key(cred_path)
        .await
        .map_err(|e| format!("Failed to read service account key: {}", e))?;

    let auth = ServiceAccountAuthenticator::builder(secret)
        .build()
        .await
        .map_err(|e| format!("Failed to build authenticator: {}", e))?;

    let token = auth
        .token(&["https://www.googleapis.com/auth/drive"])
        .await
        .map_err(|e| format!("Failed to get token: {}", e))?;

    Ok(token.token().unwrap_or_default().to_string())
}

#[derive(Deserialize, Debug)]
struct DriveFileList {
    files: Option<Vec<DriveFile>>,
}

#[derive(Deserialize, Debug)]
struct DriveFile {
    id: String,
    name: String,
    #[serde(rename = "webViewLink")]
    web_view_link: Option<String>,
}

fn extract_folder_id(url: &str) -> Option<String> {
    if url.is_empty() {
        return None;
    }
    // https://drive.google.com/drive/folders/1TxupkWrrekUBKevLvIvv4qVbll0T4bL7
    if let Some(pos) = url.find("/folders/") {
        let id_part = &url[pos + 9..];
        let id = id_part.split('?').next().unwrap_or(id_part);
        return Some(id.to_string());
    }
    None
}

pub async fn list_lokasi_files(folder_url: &str) -> Result<Vec<CustomerFileRecord>, String> {
    list_pelanggan_files(folder_url).await
}

pub async fn list_pelanggan_files(folder_url: &str) -> Result<Vec<CustomerFileRecord>, String> {
    let folder_id = match extract_folder_id(folder_url) {
        Some(id) => id,
        None => return Ok(vec![]),
    };

    let token = get_drive_token().await?;
    let client = Client::new();

    // 1. Get subfolders
    let query = format!(
        "'{}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'",
        folder_id
    );
    let subfolders_res = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(&token)
        .query(&[
            ("q", query.as_str()),
            ("fields", "files(id, name)"),
            ("includeItemsFromAllDrives", "true"),
            ("supportsAllDrives", "true"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Drive API Error (list subfolders): {}", e))?;

    let subfolders: DriveFileList = subfolders_res.json().await.map_err(|e| e.to_string())?;

    let mut all_files = Vec::new();

    if let Some(folders) = subfolders.files {
        for folder in folders {
            let jenis_berkas = folder.name.clone();

            // 2. Get files in subfolder
            let f_query = format!("'{}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'", folder.id);
            let files_res = client
                .get("https://www.googleapis.com/drive/v3/files")
                .bearer_auth(&token)
                .query(&[
                    ("q", f_query.as_str()),
                    ("fields", "files(id, name, webViewLink)"),
                    ("includeItemsFromAllDrives", "true"),
                    ("supportsAllDrives", "true"),
                ])
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| format!("Drive API Error (list files): {}", e))?;

            let files: DriveFileList = files_res.json().await.map_err(|e| e.to_string())?;
            if let Some(fs) = files.files {
                for f in fs {
                    all_files.push(CustomerFileRecord {
                        file_id: f.id,
                        nama_file: f.name,
                        url: f.web_view_link.unwrap_or_default(),
                        jenis_berkas: jenis_berkas.clone(),
                    });
                }
            }
        }
    }

    Ok(all_files)
}

async fn get_or_create_subfolder(
    client: &Client,
    token: &str,
    parent_id: &str,
    folder_name: &str,
) -> Result<String, String> {
    let query = format!("'{}' in parents and name = '{}' and trashed = false and mimeType = 'application/vnd.google-apps.folder'", parent_id, folder_name);
    let search_res = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(token)
        .query(&[
            ("q", query.as_str()),
            ("fields", "files(id)"),
            ("includeItemsFromAllDrives", "true"),
            ("supportsAllDrives", "true"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !search_res.status().is_success() {
        let err_text = search_res.text().await.unwrap_or_default();
        return Err(format!("Drive API Error (search folder): {}", err_text));
    }

    let list: DriveFileList = search_res.json().await.map_err(|e| e.to_string())?;
    if let Some(files) = list.files {
        if !files.is_empty() {
            return Ok(files[0].id.clone());
        }
    }

    let metadata = json!({
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id]
    });

    let create_res = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(token)
        .query(&[("supportsAllDrives", "true")])
        .json(&metadata)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !create_res.status().is_success() {
        let err_text = create_res.text().await.unwrap_or_default();
        return Err(format!("Drive API Error (create folder): {}", err_text));
    }

    let created: serde_json::Value = create_res.json().await.map_err(|e| e.to_string())?;
    Ok(created["id"].as_str().unwrap_or_default().to_string())
}

pub async fn create_pelanggan_folder(
    kode_pelanggan: &str,
    nama_pelanggan: &str,
) -> Result<(String, String), String> {
    let root_id = env::var("PELANGGAN_ROOT_FOLDER_ID")
        .map_err(|_| "PELANGGAN_ROOT_FOLDER_ID not set".to_string())?;

    let token = get_drive_token().await?;
    let client = Client::new();

    let folder_name = if kode_pelanggan.trim().is_empty() {
        nama_pelanggan.trim().to_string()
    } else {
        format!("[{}] {}", kode_pelanggan.trim(), nama_pelanggan.trim())
    };

    let main_folder_id = get_or_create_subfolder(&client, &token, &root_id, &folder_name).await?;

    // Create the 3 required subfolders
    get_or_create_subfolder(&client, &token, &main_folder_id, "Kontrak").await?;
    get_or_create_subfolder(&client, &token, &main_folder_id, "BAK-PKS").await?;
    get_or_create_subfolder(&client, &token, &main_folder_id, "Dokumen Lain").await?;

    let folder_url = format!("https://drive.google.com/drive/folders/{}", main_folder_id);

    Ok((main_folder_id, folder_url))
}

fn format_date_for_folder_name(date_str: &str) -> String {
    // Assuming date_str is "YYYY-MM-DD"
    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() == 3 {
        format!("{}-{}-{}", parts[2], parts[1], parts[0])
    } else {
        date_str.to_string()
    }
}

pub async fn ensure_kontrak_periode_folder(
    nama_lokasi: &str,
    periode_awal: &str,
    periode_berakhir: &str,
) -> Result<(String, String), String> {
    let root_id = env::var("LOKASI_ROOT_FOLDER_ID")
        .map_err(|_| "LOKASI_ROOT_FOLDER_ID not set".to_string())?;

    let token = get_drive_token().await?;
    let client = Client::new();

    // 1. Get or create lokasi folder (e.g. "Gedung A")
    let lokasi_folder_name = nama_lokasi.trim();
    let lokasi_folder_id =
        get_or_create_subfolder(&client, &token, &root_id, lokasi_folder_name).await?;

    // 2. Get or create periode folder (e.g. "08-07-2026 s.d. 07-07-2027")
    let start_fmt = format_date_for_folder_name(periode_awal.trim());
    let end_fmt = format_date_for_folder_name(periode_berakhir.trim());
    let periode_folder_name = format!("{} s.d. {}", start_fmt, end_fmt);

    let periode_folder_id =
        get_or_create_subfolder(&client, &token, &lokasi_folder_id, &periode_folder_name).await?;

    // 3. Create the 3 required subfolders
    get_or_create_subfolder(&client, &token, &periode_folder_id, "Kontrak").await?;
    get_or_create_subfolder(&client, &token, &periode_folder_id, "BAK-PKS").await?;
    get_or_create_subfolder(&client, &token, &periode_folder_id, "Dokumen Lain").await?;

    let folder_url = format!(
        "https://drive.google.com/drive/folders/{}",
        periode_folder_id
    );

    Ok((periode_folder_id, folder_url))
}

pub async fn upload_file(
    folder_url: &str,
    jenis_berkas: &str,
    file_name: &str,
    mime_type: &str,
    base64_data: &str,
) -> Result<(), String> {
    let main_folder_id = extract_folder_id(folder_url).ok_or("URL Folder tidak valid")?;
    let token = get_drive_token().await?;
    let client = Client::new();

    // Determine target subfolder
    let target_subfolder_name = match jenis_berkas {
        "Kontrak" => "Kontrak",
        "BAK-PKS" => "BAK-PKS",
        _ => "Dokumen Lain",
    };

    let target_folder_id =
        get_or_create_subfolder(&client, &token, &main_folder_id, target_subfolder_name).await?;

    // Decode base64
    let file_bytes = BASE64_STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    // 1. Create file metadata
    let metadata = json!({
        "name": file_name,
        "parents": [target_folder_id]
    });

    let res = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(&token)
        .query(&[("supportsAllDrives", "true")])
        .json(&metadata)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Drive API Error (create file metadata): {}", e))?;

    let created: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let file_id = created["id"]
        .as_str()
        .ok_or("Failed to get file ID after metadata creation")?;

    // 2. Upload file content
    let upload_url = format!(
        "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media",
        file_id
    );
    let _res = client
        .patch(&upload_url)
        .bearer_auth(&token)
        .query(&[("supportsAllDrives", "true")])
        .header("Content-Type", mime_type)
        .body(file_bytes)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Drive API Error (upload media): {}", e))?;

    Ok(())
}

pub async fn delete_file(file_id: &str) -> Result<(), String> {
    let token = get_drive_token().await?;
    let client = Client::new();

    let metadata = json!({ "trashed": true });

    let _res = client
        .patch(&format!(
            "https://www.googleapis.com/drive/v3/files/{}",
            file_id
        ))
        .bearer_auth(&token)
        .query(&[("supportsAllDrives", "true")])
        .json(&metadata)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Drive API Error (trash file): {}", e))?;

    Ok(())
}

pub async fn delete_folder_by_url(folder_url: &str) -> Result<(), String> {
    let folder_id = extract_folder_id(folder_url).ok_or("URL Folder tidak valid")?;
    delete_file(&folder_id).await
}
