use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::api::ApiError;

#[derive(Debug, Deserialize)]
pub struct PelangganQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PelangganPayload {
    pub kode_pelanggan: Option<String>,
    pub nama_pelanggan: String,
    pub pic: Option<String>,
    pub telepon: Option<String>,
    pub email: Option<String>,
    pub link_folder_berkas: Option<String>,
    pub keterangan: Option<String>,
    #[serde(rename = "uploadItems")]
    pub upload_items: Option<Vec<CustomerUploadItem>>,
    #[serde(rename = "deleteFileIds")]
    pub delete_file_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CustomerUploadItem {
    #[serde(rename = "jenisBerkas")]
    pub jenis_berkas: String,
    #[serde(rename = "namaFile")]
    pub nama_file: String,
    #[serde(rename = "originalFileName")]
    pub original_file_name: String,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    #[serde(rename = "base64Data")]
    pub base64_data: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerFileRecord {
    #[serde(rename = "fileId")]
    pub file_id: String,
    #[serde(rename = "namaFile")]
    pub nama_file: String,
    pub url: String,
    #[serde(rename = "jenisBerkas")]
    pub jenis_berkas: String,
}

#[derive(Debug, Serialize)]
pub struct PelangganResponse {
    pub id: u64,
    pub kode_pelanggan: Option<String>,
    pub nama_pelanggan: String,
    pub pic: Option<String>,
    pub telepon: Option<String>,
    pub email: Option<String>,
    pub link_folder_berkas: Option<String>,
    pub keterangan: Option<String>,
    pub kontrak_aktif: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "existingFiles")]
    pub existing_files: Option<Vec<CustomerFileRecord>>,
}

impl PelangganPayload {
    pub fn validate(&self) -> Result<(), ApiError> {
        let mut details = HashMap::new();

        if self.nama_pelanggan.trim().is_empty() {
            details.insert(
                "nama_pelanggan".to_owned(),
                vec!["Nama pelanggan wajib diisi.".to_owned()],
            );
        }

        if let Some(email) = &self.email {
            if !email.trim().is_empty() && !email.contains('@') {
                details.insert(
                    "email".to_owned(),
                    vec!["Format email tidak valid.".to_owned()],
                );
            }
        }

        if details.is_empty() {
            Ok(())
        } else {
            Err(ApiError::validation_with_details(
                "Data pelanggan tidak valid.",
                details,
            ))
        }
    }
}
