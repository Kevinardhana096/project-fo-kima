use std::collections::HashMap;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

use crate::models::api::ApiError;
use crate::models::pelanggan::{CustomerFileRecord, CustomerUploadItem};

const VALID_SHARING_CORE: [&str; 5] = ["1/2", "1/4", "1/8", "1/16", "1/32"];

#[derive(Debug, Deserialize)]
pub struct LokasiQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub search: Option<String>,
    pub pelanggan_id: Option<u64>,
    pub status_kontrak: Option<String>,
    pub kategori: Option<String>,
    pub nama_lokasi: Option<String>,
    pub periode_awal_from: Option<NaiveDate>,
    pub periode_awal_to: Option<NaiveDate>,
    pub periode_berakhir_from: Option<NaiveDate>,
    pub periode_berakhir_to: Option<NaiveDate>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LokasiPayload {
    pub pelanggan_id: u64,
    pub kategori: String,
    pub nama_lokasi: String,
    pub core: Option<String>,
    pub sharing_core: Option<String>,
    pub periode_awal: NaiveDate,
    pub periode_berakhir: Option<NaiveDate>,
    pub durasi_kontrak_bulan: Option<u32>,
    pub no_kontrak: Option<String>,
    pub nilai_kontrak: f64,
    pub biaya_aktivasi: f64,
    pub perbulan: f64,
    pub link_folder_berkas: Option<String>,
    pub keterangan: Option<String>,
    #[serde(rename = "uploadItems")]
    pub upload_items: Option<Vec<CustomerUploadItem>>,
    #[serde(rename = "deleteFileIds")]
    pub delete_file_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PerpanjangLokasiPayload {
    pub kategori: String,
    pub nama_lokasi: String,
    pub core: Option<String>,
    pub sharing_core: Option<String>,
    pub periode_awal: NaiveDate,
    pub periode_berakhir: Option<NaiveDate>,
    pub durasi_kontrak_bulan: Option<u32>,
    pub no_kontrak: Option<String>,
    pub nilai_kontrak: f64,
    pub biaya_aktivasi: f64,
    pub perbulan: f64,
    pub keterangan: Option<String>,
    #[serde(rename = "uploadItems")]
    pub upload_items: Option<Vec<CustomerUploadItem>>,
    #[serde(rename = "deleteFileIds")]
    pub delete_file_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpgradeLokasiPayload {
    pub kategori: String,
    pub nama_lokasi: String,
    pub core: Option<String>,
    pub sharing_core: Option<String>,
    pub periode_awal: NaiveDate,
    pub periode_berakhir: Option<NaiveDate>,
    pub durasi_kontrak_bulan: Option<u32>,
    pub no_kontrak: Option<String>,
    pub nilai_kontrak: f64,
    pub biaya_aktivasi: f64,
    pub perbulan: f64,
    pub alasan_perubahan: Option<String>,
    pub keterangan: Option<String>,
    #[serde(rename = "uploadItems")]
    pub upload_items: Option<Vec<CustomerUploadItem>>,
    #[serde(rename = "deleteFileIds")]
    pub delete_file_ids: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct LokasiResponse {
    pub id: u64,
    pub kode_kontrak: String,
    pub pelanggan_id: u64,
    pub kode_pelanggan: Option<String>,
    pub nama_pelanggan: String,
    pub previous_lokasi_id: Option<u64>,
    pub kategori: String,
    pub nama_lokasi: String,
    pub core: Option<String>,
    pub sharing_core: Option<String>,
    pub periode_awal: NaiveDate,
    pub periode_berakhir: NaiveDate,
    pub durasi_kontrak_bulan: Option<u32>,
    pub no_kontrak: Option<String>,
    pub nilai_kontrak: f64,
    pub biaya_aktivasi: f64,
    pub perbulan: f64,
    pub nilai_periode_aktif: f64,
    pub status_kontrak: String,
    pub jenis_perubahan_kontrak: Option<String>,
    pub alasan_perubahan: Option<String>,
    pub link_folder_berkas: Option<String>,
    pub keterangan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "existingFiles")]
    pub existing_files: Option<Vec<CustomerFileRecord>>,
}

impl LokasiPayload {
    pub fn validate_for_create(&self) -> Result<(), ApiError> {
        validate_lokasi_fields(
            self.pelanggan_id,
            &self.kategori,
            &self.nama_lokasi,
            self.core.as_deref(),
            self.sharing_core.as_deref(),
            self.periode_awal,
            self.periode_berakhir,
            self.durasi_kontrak_bulan,
        )
    }
}

impl PerpanjangLokasiPayload {
    pub fn validate(&self) -> Result<(), ApiError> {
        validate_lokasi_fields(
            1,
            &self.kategori,
            &self.nama_lokasi,
            self.core.as_deref(),
            self.sharing_core.as_deref(),
            self.periode_awal,
            self.periode_berakhir,
            self.durasi_kontrak_bulan,
        )
    }
}

impl UpgradeLokasiPayload {
    pub fn validate(&self) -> Result<(), ApiError> {
        let result = validate_lokasi_fields(
            1,
            &self.kategori,
            &self.nama_lokasi,
            self.core.as_deref(),
            self.sharing_core.as_deref(),
            self.periode_awal,
            self.periode_berakhir,
            self.durasi_kontrak_bulan,
        );

        if result.is_err() {
            return result;
        }

        if self
            .alasan_perubahan
            .as_ref()
            .map_or(true, |a| a.trim().is_empty())
        {
            let mut details = HashMap::new();
            details.insert(
                "alasan_perubahan".to_owned(),
                vec!["Alasan perubahan wajib diisi.".to_owned()],
            );

            return Err(ApiError::validation_with_details(
                "Data upgrade tidak valid.",
                details,
            ));
        }

        Ok(())
    }
}

fn validate_lokasi_fields(
    pelanggan_id: u64,
    kategori: &str,
    nama_lokasi: &str,
    core: Option<&str>,
    sharing_core: Option<&str>,
    periode_awal: NaiveDate,
    periode_berakhir: Option<NaiveDate>,
    durasi_kontrak_bulan: Option<u32>,
) -> Result<(), ApiError> {
    let mut details = HashMap::new();
    let has_core = core.is_some_and(|value| !value.trim().is_empty());
    let has_sharing_core = sharing_core.is_some_and(|value| !value.trim().is_empty());

    if pelanggan_id == 0 {
        details.insert(
            "pelanggan_id".to_owned(),
            vec!["Pelanggan wajib dipilih.".to_owned()],
        );
    }

    if kategori.trim().is_empty() {
        details.insert(
            "kategori".to_owned(),
            vec!["Kategori wajib diisi.".to_owned()],
        );
    }

    if nama_lokasi.trim().is_empty() {
        details.insert(
            "nama_lokasi".to_owned(),
            vec!["Nama lokasi wajib diisi.".to_owned()],
        );
    }

    if has_core == has_sharing_core {
        details.insert(
            "core".to_owned(),
            vec!["Isi salah satu: core atau sharing_core.".to_owned()],
        );
    }

    if let Some(value) = sharing_core {
        if !value.trim().is_empty() && !VALID_SHARING_CORE.contains(&value) {
            details.insert(
                "sharing_core".to_owned(),
                vec!["Nilai sharing_core tidak valid.".to_owned()],
            );
        }
    }

    if periode_berakhir.is_none() && durasi_kontrak_bulan.is_none() {
        details.insert(
            "periode_berakhir".to_owned(),
            vec!["Periode berakhir atau durasi kontrak wajib diisi.".to_owned()],
        );
    }

    if let Some(end_date) = periode_berakhir {
        if end_date < periode_awal {
            details.insert(
                "periode_berakhir".to_owned(),
                vec!["Periode berakhir tidak boleh lebih awal dari periode awal.".to_owned()],
            );
        }
    }

    if details.is_empty() {
        Ok(())
    } else {
        Err(ApiError::validation_with_details(
            "Data Kontrak Lengkap tidak valid.",
            details,
        ))
    }
}
