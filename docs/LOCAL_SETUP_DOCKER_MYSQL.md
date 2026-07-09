# Local Setup MySQL via Docker Desktop

Dokumen ini untuk menjalankan database MySQL lokal memakai Docker Desktop dengan integrasi WSL, lalu menghubungkannya ke backend Rust di project ini.

## File yang Sudah Disiapkan

- `docker-compose.yml`
- `.env.docker.example`
- `backend/.env.example`

## Yang Perlu Dilakukan Manual

### 1. Siapkan env Docker

Di root project:

```bash
cp .env.docker.example .env.docker
```

Lalu isi sesuai kebutuhan jika ingin ganti port, nama database, atau password.

Catatan:

- `docker-compose.yml` memakai default value, jadi file `.env.docker` ini opsional
- jika ingin Compose membaca file ini otomatis, jalankan command dengan `--env-file .env.docker`

### 2. Siapkan env backend

Di folder `backend/`:

```bash
cp .env.example .env
```

Jika Anda mengubah nilai di `.env.docker`, samakan `DATABASE_URL` di `backend/.env`.

Default yang sudah cocok:

```env
DATABASE_URL=mysql://fo_kima_user:fo_kima_password@127.0.0.1:3307/fo_kima
```

Jika ingin mengaktifkan sinkronisasi Google Sheets dan integrasi Google Drive, isi juga:

```env
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
SPREADSHEET_ID=isi_id_spreadsheet_google_sheets
PELANGGAN_ROOT_FOLDER_ID=isi_id_folder_root_google_drive_pelanggan
LOKASI_ROOT_FOLDER_ID=isi_id_folder_root_google_drive_kontrak
```

File credential service account harus diletakkan di `backend/credentials.json` atau path lain yang sesuai dengan `GOOGLE_APPLICATION_CREDENTIALS`.

Sebelum fitur Google Drive/Sheets dipakai, aktifkan API berikut pada Google Cloud project milik service account:

- Google Drive API
- Google Sheets API

Jika muncul error `SERVICE_DISABLED` atau `Google Drive API has not been used in project ... before or it is disabled`, buka link aktivasi yang muncul pada pesan error, aktifkan API tersebut, tunggu beberapa menit, lalu coba ulang request dari web.

Catatan:

- file `backend/credentials*.json` di-ignore dari git karena berisi secret
- share spreadsheet tujuan ke email service account agar Google Sheets API punya akses edit
- share folder root Drive pelanggan ke email service account agar Drive API bisa membuat folder dan upload file
- share folder root Drive kontrak/lokasi ke email service account agar Drive API bisa membuat folder periode kontrak dan upload file
- tanpa env Google Sheets, API pelanggan tetap berjalan, tetapi background sync akan gagal dan tercatat di log backend
- tanpa `PELANGGAN_ROOT_FOLDER_ID`, create pelanggan baru dari web dapat gagal saat backend perlu membuat folder otomatis
- tanpa `LOKASI_ROOT_FOLDER_ID`, upload berkas kontrak akan gagal saat backend perlu membuat folder periode kontrak otomatis

### 3. Jalankan MySQL container

Di root project:

```bash
docker compose --env-file .env.docker up -d
```

Jika Anda tidak membuat `.env.docker`, gunakan saja:

```bash
docker compose up -d
```

### 4. Pastikan container sehat

```bash
docker compose ps
docker compose logs mysql --tail 50
```

Status yang dicari:

- container `fo-kima-mysql` dalam keadaan `Up`
- health status `healthy`

### 5. Apply migration awal

Setelah MySQL hidup, jalankan:

```bash
docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD:-rootpassword}" "${MYSQL_DATABASE:-fo_kima}" < backend/migrations/0001_init.sql
```

Jika Anda memakai `.env.docker`, jalankan dari shell yang sudah memuat env itu atau isi manual password/database yang sesuai.

Contoh paling aman jika memakai nilai default:

```bash
docker compose exec -T mysql mysql -u root -prootpassword fo_kima < backend/migrations/0001_init.sql
```

### 6. Verifikasi tabel sudah terbentuk

```bash
docker compose exec mysql mysql -u root -prootpassword -D fo_kima -e "SHOW TABLES;"
```

Target hasil:

- `pelanggan`
- `lokasi`

### 7. Jalankan backend Rust

Di folder `backend/`:

```bash
cargo run
```

Backend default akan listen di:

```text
http://127.0.0.1:8080
```

### 8. Uji endpoint dasar

Contoh cek list pelanggan:

```bash
curl http://127.0.0.1:8080/api/pelanggan
```

Contoh create pelanggan:

```bash
curl -X POST http://127.0.0.1:8080/api/pelanggan \
  -H "Content-Type: application/json" \
  -d '{
    "kode_pelanggan": "PLG-001",
    "nama_pelanggan": "PT Contoh Infrastruktur",
    "pic": "Andi",
    "telepon": "08123456789",
    "email": "andi@contoh.co.id",
    "keterangan": "Seed manual awal"
  }'
```

Jika konfigurasi Google Drive valid, backend akan membuat folder pelanggan otomatis lalu menyimpan URL-nya ke `link_folder_berkas`.

## Command Operasional Harian

Start database:

```bash
docker compose --env-file .env.docker up -d
```

Stop database:

```bash
docker compose down
```

Lihat log:

```bash
docker compose logs -f mysql
```

Reset database lokal sepenuhnya:

```bash
docker compose down -v
rm -rf docker/mysql/data
docker compose --env-file .env.docker up -d
```

Setelah reset, migration harus dijalankan lagi.

## Catatan Penting

- folder data MySQL disimpan di `docker/mysql/data`
- file `backend/.env` dan data MySQL lokal sudah di-ignore dari git
- backend dijalankan dari WSL/project biasa, bukan dari container
- koneksi backend ke MySQL memakai host `127.0.0.1` karena port container diexpose ke host

## Jika Gagal Konek

Periksa hal berikut:

1. Docker Desktop sedang hidup
2. integrasi WSL Docker Desktop aktif
3. port `3307` tidak dipakai service lain
4. `DATABASE_URL` di `backend/.env` benar-benar sama dengan user/password/database yang dipakai container
5. migration sudah dijalankan
