# Kontrak API Tahap 1

Dokumen ini mendefinisikan kontrak API awal untuk modul `pelanggan` dan `Kontrak Lengkap`.

Tujuannya:

- frontend dan backend memakai struktur request/response yang sama
- aturan bisnis penting tetap diproses di backend
- migrasi dari spreadsheet ke backend database bisa dilakukan bertahap tanpa mengubah pola kerja utama

## Status Dokumen

Status saat ini: `disetujui sebagai kontrak API tahap 1`.

Catatan progres implementasi:

- route backend untuk endpoint utama sudah diimplementasikan di folder `backend/src/routes/`
- DTO request/response dipakai aktif di folder `backend/src/models/`
- validasi dasar payload sudah diimplementasikan
- query database dan response final berbasis data nyata sudah diimplementasikan
- endpoint `perpanjang` dan `upgrade` sudah diuji manual terhadap MySQL lokal

## Prinsip Umum

- format data API adalah `JSON`
- semua waktu input/output tanggal memakai format `YYYY-MM-DD`
- `kode_kontrak` dibuat oleh backend, bukan oleh frontend
- `status_kontrak` dihitung atau direkonsiliasi oleh backend
- frontend hanya mengirim field input bisnis, bukan field turunan sistem

## Resource Utama

- `pelanggan`
- `kontrak-lengkap`

## Standar Response

### Response sukses list

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

### Response sukses detail

```json
{
  "data": {}
}
```

### Response error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid.",
    "details": {
      "field_name": [
        "Pesan error"
      ]
    }
  }
}
```

## Endpoint `pelanggan`

### 1. `GET /api/pelanggan`

Tujuan:

- mengambil daftar pelanggan

Query param opsional:

- `page`
- `page_size`
- `search`
- `sort_by`
- `sort_order`

Response item:

```json
{
  "id": 1,
  "kode_pelanggan": "PLG-001",
  "nama_pelanggan": "PT Contoh Infrastruktur",
  "pic": "Andi",
  "telepon": "08123456789",
  "email": "andi@contoh.co.id",
  "link_folder_berkas": "https://drive.google.com/...",
  "keterangan": "Pelanggan aktif",
  "kontrak_aktif": 3,
  "created_at": "2026-07-08T10:00:00Z",
  "updated_at": "2026-07-08T10:00:00Z"
}
```

Catatan:

- `kontrak_aktif` adalah field turunan dari data `Kontrak Lengkap` di tabel internal `lokasi`

### 2. `GET /api/pelanggan/:id`

Tujuan:

- mengambil detail satu pelanggan

Response:

```json
{
  "data": {
    "id": 1,
    "kode_pelanggan": "PLG-001",
    "nama_pelanggan": "PT Contoh Infrastruktur",
    "pic": "Andi",
    "telepon": "08123456789",
    "email": "andi@contoh.co.id",
    "link_folder_berkas": "https://drive.google.com/...",
    "keterangan": "Pelanggan aktif",
    "kontrak_aktif": 3,
    "created_at": "2026-07-08T10:00:00Z",
    "updated_at": "2026-07-08T10:00:00Z"
  }
}
```

### 3. `POST /api/pelanggan`

Tujuan:

- membuat pelanggan baru

Request body:

```json
{
  "kode_pelanggan": "PLG-001",
  "nama_pelanggan": "PT Contoh Infrastruktur",
  "pic": "Andi",
  "telepon": "08123456789",
  "email": "andi@contoh.co.id",
  "link_folder_berkas": "https://drive.google.com/...",
  "keterangan": "Pelanggan aktif"
}
```

Validasi:

- `nama_pelanggan` wajib
- `kode_pelanggan` opsional, tetapi jika diisi harus unik
- `email` jika diisi harus valid

### 4. `PUT /api/pelanggan/:id`

Tujuan:

- memperbarui data pelanggan

Request body:

```json
{
  "kode_pelanggan": "PLG-001",
  "nama_pelanggan": "PT Contoh Infrastruktur Update",
  "pic": "Budi",
  "telepon": "08123456789",
  "email": "budi@contoh.co.id",
  "link_folder_berkas": "https://drive.google.com/...",
  "keterangan": "Update data"
}
```

Validasi:

- sama seperti create
- backend harus menjaga keunikan `kode_pelanggan` selain record yang sedang diedit

### 5. `DELETE /api/pelanggan/:id`

Tujuan:

- menghapus pelanggan

Aturan:

- jika pelanggan masih memiliki record `Kontrak Lengkap`, backend sebaiknya menolak penghapusan hard delete
- response error yang disarankan: `409 CONFLICT`

## Endpoint `Kontrak Lengkap`

Catatan penamaan:

- nama sheet sumber adalah `Kontrak Lengkap`
- endpoint resmi backend tahap ini adalah `/api/kontrak-lengkap`
- tabel internal MySQL masih bernama `lokasi` agar migration yang sudah berjalan tidak perlu dirombak
- endpoint lama `/api/lokasi` masih tersedia sebagai alias kompatibilitas lokal, tetapi frontend baru memakai `/api/kontrak-lengkap`

### Bentuk data `Kontrak Lengkap`

Response item standar:

```json
{
  "id": 10,
  "kode_kontrak": "CTR-2026-0001",
  "pelanggan_id": 1,
  "kode_pelanggan": "PLG-001",
  "nama_pelanggan": "PT Contoh Infrastruktur",
  "previous_lokasi_id": null,
  "kategori": "KIMA",
  "nama_lokasi": "Gedung A",
  "core": "Core FO 12",
  "sharing_core": null,
  "periode_awal": "2026-07-08",
  "periode_berakhir": "2027-07-07",
  "durasi_kontrak_bulan": 12,
  "no_kontrak": "001/PKS/FO/VII/2026",
  "nilai_kontrak": 12000000,
  "biaya_aktivasi": 500000,
  "perbulan": 1000000,
  "nilai_periode_aktif": 12000000,
  "status_kontrak": "Aktif",
  "jenis_perubahan_kontrak": null,
  "alasan_perubahan": null,
  "link_folder_berkas": "https://drive.google.com/...",
  "keterangan": "Kontrak awal",
  "created_at": "2026-07-08T10:00:00Z",
  "updated_at": "2026-07-08T10:00:00Z"
}
```

### 1. `GET /api/kontrak-lengkap`

Tujuan:

- mengambil daftar `Kontrak Lengkap`

Query param opsional:

- `page`
- `page_size`
- `search`
- `pelanggan_id`
- `status_kontrak`
- `kategori`
- `nama_lokasi`
- `periode_awal_from`
- `periode_awal_to`
- `periode_berakhir_from`
- `periode_berakhir_to`
- `sort_by`
- `sort_order`

### 2. `GET /api/kontrak-lengkap/:id`

Tujuan:

- mengambil detail satu record `Kontrak Lengkap`

Tambahan response detail:

- `existingFiles`
- `riwayat_sebelumnya`
- `riwayat_berikutnya`

Contoh:

```json
{
  "data": {
    "id": 10,
    "kode_kontrak": "CTR-2026-0001",
    "pelanggan_id": 1,
    "kode_pelanggan": "PLG-001",
    "nama_pelanggan": "PT Contoh Infrastruktur",
    "previous_lokasi_id": null,
    "kategori": "KIMA",
    "nama_lokasi": "Gedung A",
    "core": "Core FO 12",
    "sharing_core": null,
    "periode_awal": "2026-07-08",
    "periode_berakhir": "2027-07-07",
    "durasi_kontrak_bulan": 12,
    "no_kontrak": "001/PKS/FO/VII/2026",
    "nilai_kontrak": 12000000,
    "biaya_aktivasi": 500000,
    "perbulan": 1000000,
    "nilai_periode_aktif": 12000000,
    "status_kontrak": "Aktif",
    "jenis_perubahan_kontrak": null,
    "alasan_perubahan": null,
    "link_folder_berkas": "https://drive.google.com/...",
    "keterangan": "Kontrak awal",
    "existingFiles": [],
    "riwayat_sebelumnya": null,
    "riwayat_berikutnya": [],
    "created_at": "2026-07-08T10:00:00Z",
    "updated_at": "2026-07-08T10:00:00Z"
  }
}
```

### 3. `POST /api/kontrak-lengkap`

Tujuan:

- membuat record `Kontrak Lengkap` baru dari nol

Request body:

```json
{
  "pelanggan_id": 1,
  "kategori": "KIMA",
  "nama_lokasi": "Gedung A",
  "core": "Core FO 12",
  "sharing_core": null,
  "periode_awal": "2026-07-08",
  "periode_berakhir": "2027-07-07",
  "durasi_kontrak_bulan": 12,
  "no_kontrak": "001/PKS/FO/VII/2026",
  "nilai_kontrak": 12000000,
  "biaya_aktivasi": 500000,
  "perbulan": 1000000,
  "keterangan": "Kontrak awal",
  "uploadItems": [],
  "deleteFileIds": []
}
```

Field yang dihitung backend:

- `kode_kontrak`
- `previous_lokasi_id`
- `nilai_periode_aktif`
- `status_kontrak`
- `jenis_perubahan_kontrak`

Validasi:

- `pelanggan_id` wajib dan harus valid
- `kategori` wajib
- `nama_lokasi` wajib
- user wajib mengisi salah satu: `core` atau `sharing_core`
- `core` dan `sharing_core` tidak boleh diisi bersamaan
- `sharing_core` jika diisi harus salah satu dari `1/2`, `1/4`, `1/8`, `1/16`, `1/32`
- `periode_awal` wajib
- minimal salah satu dari `periode_berakhir` atau `durasi_kontrak_bulan` harus ada
- jika `periode_berakhir` dan `durasi_kontrak_bulan` sama-sama diisi, backend harus memvalidasi kecocokannya
- `periode_berakhir` tidak boleh lebih awal dari `periode_awal`

### 4. `PUT /api/kontrak-lengkap/:id`

Tujuan:

- mengedit record `Kontrak Lengkap` yang sudah ada tanpa membuat histori baru

Catatan:

- endpoint ini hanya dipakai untuk koreksi data
- endpoint ini bukan untuk `perpanjang` atau `upgrade`

Request body:

```json
{
  "pelanggan_id": 1,
  "kategori": "KIMA",
  "nama_lokasi": "Gedung A",
  "core": "Core FO 12",
  "sharing_core": null,
  "periode_awal": "2026-07-08",
  "periode_berakhir": "2027-07-07",
  "durasi_kontrak_bulan": 12,
  "no_kontrak": "001/PKS/FO/VII/2026",
  "nilai_kontrak": 12000000,
  "biaya_aktivasi": 500000,
  "perbulan": 1000000,
  "link_folder_berkas": "https://drive.google.com/...",
  "keterangan": "Koreksi data",
  "uploadItems": [],
  "deleteFileIds": []
}
```

Validasi:

- sama seperti create
- backend harus menghitung ulang `nilai_periode_aktif`
- backend harus merekonsiliasi `status_kontrak`

### 5. `DELETE /api/kontrak-lengkap/:id`

Tujuan:

- menghapus record `Kontrak Lengkap` untuk kasus salah input, duplikat, atau data uji

Aturan:

- jika record memiliki turunan histori, backend sebaiknya menolak hard delete
- response error yang disarankan: `409 CONFLICT`

### 6. `POST /api/kontrak-lengkap/:id/perpanjang`

Tujuan:

- membuat kontrak lanjutan dari kontrak sebelumnya

Request body:

```json
{
  "kategori": "KIMA",
  "nama_lokasi": "Gedung A",
  "core": "Core FO 12",
  "sharing_core": null,
  "periode_awal": "2027-07-08",
  "periode_berakhir": "2028-07-07",
  "durasi_kontrak_bulan": 12,
  "no_kontrak": "002/PKS/FO/VII/2027",
  "nilai_kontrak": 12000000,
  "biaya_aktivasi": 0,
  "perbulan": 1000000,
  "keterangan": "Perpanjangan kontrak",
  "uploadItems": [],
  "deleteFileIds": []
}
```

Aturan backend:

- hanya boleh dari kontrak terbaru pada grup `pelanggan + nama_lokasi`
- backend membuat record baru
- backend mengisi `previous_lokasi_id` ke kontrak asal
- backend membuat `kode_kontrak` baru
- backend mengisi `jenis_perubahan_kontrak = "Perpanjangan"`
- backend menentukan status kontrak lama dan baru sesuai tanggal mulai kontrak baru

### 7. `POST /api/kontrak-lengkap/:id/upgrade`

Tujuan:

- membuat kontrak baru karena perubahan paket di tengah periode

Request body:

```json
{
  "kategori": "KIMA",
  "nama_lokasi": "Gedung A",
  "core": null,
  "sharing_core": "1/2",
  "periode_awal": "2026-12-01",
  "periode_berakhir": "2027-07-07",
  "durasi_kontrak_bulan": 8,
  "no_kontrak": "003/PKS/FO/XII/2026",
  "nilai_kontrak": 8000000,
  "biaya_aktivasi": 0,
  "perbulan": 1000000,
  "alasan_perubahan": "Upgrade paket layanan",
  "keterangan": "Upgrade kontrak",
  "uploadItems": [],
  "deleteFileIds": []
}
```

Aturan backend:

- hanya boleh dari kontrak `Aktif` terbaru pada grup `pelanggan + nama_lokasi`
- backend membuat record baru
- backend mengisi `previous_lokasi_id` ke kontrak asal
- backend membuat `kode_kontrak` baru
- backend mengisi `jenis_perubahan_kontrak = "Upgrade"`
- backend memotong `periode_berakhir` kontrak lama menjadi sehari sebelum `periode_awal` kontrak baru
- backend menghitung ulang `durasi_kontrak_bulan`, `nilai_periode_aktif`, dan `nilai_kontrak` kontrak lama sesuai periode yang tersisa
- backend mengubah status kontrak lama menjadi `Di-upgrade`
- backend menentukan status kontrak baru sesuai tanggal mulai

## Field Input vs Field Sistem

### Field yang boleh dikirim frontend untuk `pelanggan`

- `kode_pelanggan`
- `nama_pelanggan`
- `pic`
- `telepon`
- `email`
- `link_folder_berkas`
- `keterangan`

### Field yang boleh dikirim frontend untuk `Kontrak Lengkap`

- `pelanggan_id`
- `kategori`
- `nama_lokasi`
- `core`
- `sharing_core`
- `periode_awal`
- `periode_berakhir`
- `durasi_kontrak_bulan`
- `no_kontrak`
- `nilai_kontrak`
- `biaya_aktivasi`
- `perbulan`
- `link_folder_berkas`
- `alasan_perubahan`
- `keterangan`
- `uploadItems`
- `deleteFileIds`

### Field yang hanya boleh ditentukan backend

- `id`
- `kode_kontrak`
- `previous_lokasi_id`
- `nilai_periode_aktif`
- `status_kontrak`
- `jenis_perubahan_kontrak`
- `created_at`
- `updated_at`
- `existingFiles`

## Kode Error yang Disarankan

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `BUSINESS_RULE_VIOLATION`
- `INTERNAL_SERVER_ERROR`

## Status Implementasi Saat Ini

- CRUD `pelanggan` sudah aktif di backend Rust dan frontend `Next.js`
- `GET/POST/PUT/DELETE /api/kontrak-lengkap` sudah aktif di backend Rust dan route internal `Next.js`
- `POST /api/kontrak-lengkap/:id/perpanjang` sudah aktif
- `POST /api/kontrak-lengkap/:id/upgrade` sudah aktif
- upload/hapus berkas kontrak memakai `uploadItems` dan `deleteFileIds`
- detail kontrak dapat mengembalikan `existingFiles` hasil scan Google Drive
- frontend memakai payload `camelCase`, lalu wrapper `frontend/lib/rust-backend.ts` memetakan ke payload Rust `snake_case`
