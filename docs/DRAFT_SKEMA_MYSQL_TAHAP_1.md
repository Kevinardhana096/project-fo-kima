# Draft Skema MySQL Tahap 1

Dokumen ini menurunkan PRD dan arsitektur ke skema database tahap awal yang sengaja dibuat sederhana:

- hanya `2 tabel utama`
- tetap mengikuti pola spreadsheet
- tetap bisa menyimpan histori kontrak per lokasi

## Status Dokumen

Status saat ini: `disetujui sebagai acuan tahap 1`.

Turunan yang sudah dibuat dari dokumen ini:

- migration awal: `backend/migrations/0001_init.sql`
- kontrak API tahap 1: `docs/KONTRAK_API_TAHAP_1.md`
- scaffold backend Rust awal: folder `backend/src/`

## Tujuan Tahap 1

Tahap pertama tidak mengejar normalisasi penuh. Targetnya adalah:

- migrasi dari spreadsheet lebih mudah
- frontend dan backend bisa segera punya kontrak data yang stabil
- histori `perpanjangan` dan `upgrade` tetap terjaga
- istilah bisnis konsisten memakai `pelanggan` dan `Kontrak Lengkap`; nama teknis tabel kontrak tetap `lokasi`

## Keputusan Model Data

### 1. Tabel `pelanggan`

Tabel ini adalah master data pelanggan/provider.

Prinsip:

- `1 baris = 1 pelanggan`
- tidak menyimpan histori kontrak
- kolom seperti `kontrak_aktif` tidak disimpan statis, tetapi dihitung dari tabel internal `lokasi` yang merepresentasikan `Kontrak Lengkap`

Kolom inti:

- `id`
- `kode_pelanggan`
- `nama_pelanggan`
- `pic`
- `telepon`
- `email`
- `link_folder_berkas`
- `keterangan`
- `created_at`
- `updated_at`

### 2. Tabel `lokasi` untuk sheet `Kontrak Lengkap`

Nama sheet sumber adalah `Kontrak Lengkap`. Pada database tahap 1, tabel internal masih bernama `lokasi` karena setiap baris mewakili kontrak/periode untuk satu lokasi.

Prinsip:

- `1 baris = 1 kontrak/periode lokasi`
- satu nama lokasi bisa muncul berkali-kali karena punya histori kontrak
- histori dijaga lewat relasi ke baris sebelumnya

Kolom inti:

- `id`
- `kode_kontrak`
- `pelanggan_id`
- `previous_lokasi_id`
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
- `nilai_periode_aktif`
- `status_kontrak`
- `jenis_perubahan_kontrak`
- `alasan_perubahan`
- `link_folder_berkas`
- `keterangan`
- `created_at`
- `updated_at`

## Aturan Penting

- `pelanggan_id` wajib menjadi foreign key ke tabel `pelanggan`
- `previous_lokasi_id` dipakai untuk menghubungkan histori perpanjangan atau upgrade
- `kode_kontrak` harus unik karena akan berguna untuk sinkronisasi, audit, dan integrasi billing nanti
- format `kode_kontrak` dikunci sebagai `CTR-YYYY-XXXX`
- sequence `kode_kontrak` di-reset per tahun
- `kode_kontrak` hanya dibuat oleh backend dan tidak boleh diinput manual oleh user
- `status_kontrak` tetap ditentukan backend, bukan input bebas dari frontend
- `core` dan `sharing_core` tidak boleh terisi bersamaan
- master lokasi belum dipisah menjadi tabel tersendiri agar migrasi dari sheet `Kontrak Lengkap` tetap sederhana

## Draft SQL

```sql
CREATE TABLE pelanggan (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    kode_pelanggan VARCHAR(50) NULL,
    nama_pelanggan VARCHAR(150) NOT NULL,
    pic VARCHAR(150) NULL,
    telepon VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    link_folder_berkas VARCHAR(500) NULL,
    keterangan TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pelanggan_kode (kode_pelanggan),
    KEY idx_pelanggan_nama (nama_pelanggan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lokasi (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    kode_kontrak VARCHAR(50) NOT NULL,
    pelanggan_id BIGINT UNSIGNED NOT NULL,
    previous_lokasi_id BIGINT UNSIGNED NULL,
    kategori VARCHAR(50) NOT NULL,
    nama_lokasi VARCHAR(200) NOT NULL,
    core VARCHAR(150) NULL,
    sharing_core VARCHAR(10) NULL,
    periode_awal DATE NOT NULL,
    periode_berakhir DATE NOT NULL,
    durasi_kontrak_bulan INT UNSIGNED NULL,
    no_kontrak VARCHAR(150) NULL,
    nilai_kontrak DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    biaya_aktivasi DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    perbulan DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    nilai_periode_aktif DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    status_kontrak VARCHAR(30) NOT NULL,
    jenis_perubahan_kontrak VARCHAR(30) NULL,
    alasan_perubahan TEXT NULL,
    link_folder_berkas VARCHAR(500) NULL,
    keterangan TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lokasi_kode_kontrak (kode_kontrak),
    KEY idx_lokasi_pelanggan_id (pelanggan_id),
    KEY idx_lokasi_previous_lokasi_id (previous_lokasi_id),
    KEY idx_lokasi_nama_lokasi (nama_lokasi),
    KEY idx_lokasi_status_kontrak (status_kontrak),
    KEY idx_lokasi_periode_berakhir (periode_berakhir),
    CONSTRAINT fk_lokasi_pelanggan
        FOREIGN KEY (pelanggan_id) REFERENCES pelanggan (id),
    CONSTRAINT fk_lokasi_previous
        FOREIGN KEY (previous_lokasi_id) REFERENCES lokasi (id),
    CONSTRAINT chk_lokasi_sharing_core
        CHECK (sharing_core IS NULL OR sharing_core IN ('1/2', '1/4', '1/8', '1/16', '1/32')),
    CONSTRAINT chk_lokasi_core_xor_sharing
        CHECK (
            NOT (core IS NOT NULL AND TRIM(core) <> '' AND sharing_core IS NOT NULL AND TRIM(sharing_core) <> '')
        ),
    CONSTRAINT chk_lokasi_status
        CHECK (status_kontrak IN ('Aktif', 'Belum Beroperasi', 'Berakhir', 'Diperpanjang', 'Di-upgrade', 'Nonaktif')),
    CONSTRAINT chk_lokasi_periode
        CHECK (periode_berakhir >= periode_awal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Mapping dari Spreadsheet

### Tab `Pelanggan` -> tabel `pelanggan`

- `Kode Pelanggan` -> `kode_pelanggan`
- `Nama Pelanggan` -> `nama_pelanggan`
- `PIC` -> `pic`
- `Telepon` -> `telepon`
- `Email` -> `email`
- `Berkas Pelanggan` -> `link_folder_berkas`
- `Keterangan` -> `keterangan`

### Tab `Kontrak Lengkap` -> tabel internal `lokasi`

- `ID Kontrak` -> `kode_kontrak`
- `ID Kontrak Sebelumnya` -> relasi ke `previous_lokasi_id`
- `Nama Pelanggan` -> relasi `pelanggan_id`
- `Kategori` -> `kategori`
- `Lokasi` -> `nama_lokasi`
- `Core` -> `core`
- `Sharing Core` -> `sharing_core`
- `Periode Awal` -> `periode_awal`
- `Periode Berakhir` -> `periode_berakhir`
- `Durasi Kontrak` -> `durasi_kontrak_bulan`
- `No Kontrak` -> `no_kontrak`
- `Nilai Kontrak` -> `nilai_kontrak`
- `Biaya Aktivasi` -> `biaya_aktivasi`
- `Perbulan` -> `perbulan`
- `Nilai Periode Aktif` -> `nilai_periode_aktif`
- `Status Kontrak` -> `status_kontrak`
- `Berkas` -> `link_folder_berkas`
- `Keterangan` -> `keterangan`

## Catatan Implementasi Backend

- backend harus menghasilkan `kode_kontrak` dengan format `CTR-YYYY-XXXX`, misalnya `CTR-2026-0001`
- backend harus menghitung `status_kontrak`
- backend harus menghitung atau memvalidasi `durasi_kontrak_bulan`
- backend harus menghitung `nilai_periode_aktif`
- backend harus menangani relasi histori saat `perpanjang` dan `upgrade`

## Yang Sengaja Belum Masuk Tahap 1

- tabel `billing`
- tabel `berkas`
- tabel master `lokasi` terpisah
- tabel audit trail
- tabel user dan permission

## Rekomendasi Langkah Berikutnya

Setelah draft ini disetujui, langkah berikutnya adalah:

1. implementasikan query `sqlx` untuk CRUD `pelanggan`
2. implementasikan query `sqlx` untuk `GET/POST/PUT` modul `Kontrak Lengkap`
3. implementasikan logic histori `perpanjang` dan `upgrade`
4. jalankan verifikasi `cargo fmt` dan `cargo check` di environment Rust yang bisa mengeksekusi `cargo`
