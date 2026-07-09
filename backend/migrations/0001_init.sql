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
