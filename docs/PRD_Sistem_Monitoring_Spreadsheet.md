# PRD Sistem Monitoring FO KIMA Berbasis Spreadsheet

## Status Dokumen

Dokumen ini adalah baseline historis rancangan awal saat sistem masih direncanakan berbasis Google Sheets dan Google Apps Script.

Dokumen ini bukan acuan status implementasi aktif per 9 Juli 2026. Untuk kondisi sistem yang sudah berjalan sekarang, rujuk ke:

- `docs/ARCHITECTURE_PRD.md`
- `docs/Dokumentasi_Arsitektur_Website_NextJS.md`
- `docs/Penjelasan_Tab_Pelanggan.md`
- `docs/Penjelasan_Tab_Kontrak_Lengkap.md`

## 1. Ringkasan

Dokumen ini mendefinisikan kebutuhan produk untuk membangun sistem monitoring kontrak dan penagihan FO KIMA berbasis spreadsheet terpusat. Sistem baru akan menggantikan proses input manual pada file Excel yang kompleks menjadi alur yang lebih praktis melalui UI form/modal, dengan data disimpan pada satu spreadsheet pusat.

Platform yang direkomendasikan adalah Google Sheets dengan Google Apps Script agar sistem dapat diakses bersama, dikelola terpusat, memiliki antarmuka input yang sederhana tanpa membangun aplikasi web terpisah, serta mendukung upload berkas langsung ke Google Drive.

## 2. Latar Belakang Masalah

File Excel saat ini memiliki beberapa sheet monitoring dan master data dengan struktur lebar, banyak merge cell, dan proses input yang masih manual. Kondisi ini menimbulkan beberapa kendala:

- input data baru lambat dan rawan salah
- struktur data sulit dipelihara untuk banyak pengguna
- sheet monitoring bercampur dengan sheet sumber data
- pembaruan data tidak terpusat bila file disalin ke banyak tempat
- sulit menambahkan UI input yang konsisten pada workbook Excel yang kompleks

## 3. Tujuan Produk

Tujuan sistem baru:

- menyediakan spreadsheet terpusat sebagai sumber data tunggal
- mempermudah input data pelanggan, kontrak, dan penagihan melalui popup form
- mempermudah input lokasi dengan memilih pelanggan yang sudah terdaftar
- menjaga histori saat terjadi perubahan atau upgrade paket
- menambahkan record baru secara otomatis ke sheet master
- menghasilkan sheet monitoring yang lebih mudah dibaca dari data master
- mengurangi ketergantungan pada edit manual langsung di sel spreadsheet

## 4. Sasaran Keberhasilan

Indikator keberhasilan awal:

- user dapat menambahkan data pelanggan/kontrak tanpa edit manual baris spreadsheet
- data baru tersimpan ke sheet master dalam format tabel datar
- monitoring masa berlaku kontrak dan status penagihan dapat dilihat dari sheet turunan
- kesalahan input berkurang melalui validasi field dan dropdown referensi
- file dapat diakses oleh beberapa pengguna pada spreadsheet yang sama

## 5. Pengguna Utama

- Admin operasional
- Staf monitoring kontrak
- Staf penagihan/keuangan
- Supervisor yang hanya melihat dashboard/monitoring

## 6. Ruang Lingkup Versi 1

Fitur dalam cakupan:

- spreadsheet pusat berbasis Google Sheets
- sheet master untuk penyimpanan data utama
- sheet referensi untuk dropdown dan lookup
- popup/modal input data melalui custom menu atau tombol
- penyimpanan otomatis ke baris baru
- unggah berkas langsung dari UI dan penyimpanan link Google Drive
- validasi field wajib
- sheet monitoring yang membaca data dari master
- status kontrak dan status penagihan
- pencatatan waktu input dan user penginput

Di luar cakupan versi 1:

- integrasi WhatsApp atau email reminder otomatis
- multi-level approval
- edit massal data
- sinkronisasi dua arah dengan file Excel lama
- aplikasi mobile native

## 7. Permasalahan yang Diselesaikan

Sistem harus menyelesaikan kebutuhan berikut:

- user ingin menambah pelanggan baru tanpa mengedit struktur sheet manual
- user ingin menambah kontrak baru dengan field yang konsisten
- user ingin data tersimpan pada satu tempat agar monitoring tidak tercecer
- user ingin monitoring kontrak jatuh tempo dari data yang selalu terbarui
- user ingin laporan dibuat dari data yang rapi, bukan dari sheet merge yang sulit diproses
- user ingin mengunggah dokumen pendukung langsung dari form dan melihat link berkas langsung dari spreadsheet
- user ingin berkas kontrak, invoice, dan dokumen layanan melekat ke lokasi yang dilayani
- user ingin ada tab khusus pelanggan agar data provider dapat dilihat terpisah

## 8. Solusi yang Diusulkan

Solusi utama adalah memindahkan struktur kerja menjadi model berikut:

- `Kontrak Lengkap`
  Menyimpan seluruh histori kontrak lokasi/customer.
- `Kontrak Aktif`
  Menampilkan hanya kontrak yang saat ini masih aktif.
- `Pelanggan`
  Menyimpan data pelanggan dan histori kerja samanya dengan PT KIMA.
- `Rekap Core Sharing Core`
  Menampilkan rekap sewa layanan core dan sharing core.
- `Data Billing Backend`
  Menyimpan detail seluruh tagihan per kontrak sebagai sumber data modal billing.

Input dilakukan melalui form popup Apps Script:

- tombol/menu `Tambah Pelanggan`
- tombol/menu `Tambah Kontrak Lokasi`
- untuk implementasi menu awal, `Tambah Pelanggan` berada di menu `Pelanggan`
- untuk implementasi menu awal, `Tambah Kontrak Lokasi` berada di menu `Lokasi`
- tombol/menu `Tambah Berkas`
- tombol/aksi `Lihat Billing`

Setiap submit form akan menambah satu baris baru ke sheet terkait. Untuk form berkas, sistem juga akan mengunggah file ke Google Drive sebelum menyimpan metadata dan link ke spreadsheet. Untuk billing, detail tagihan disimpan di `Data Billing Backend` dan ditampilkan melalui modal dari tab `Kontrak Lengkap`.

## 9. User Stories

### 9.1 Admin Operasional

- Sebagai admin, saya ingin menambah pelanggan baru lewat form agar tidak perlu mengedit sheet manual.
- Sebagai admin, saya ingin kode pelanggan unik agar tidak terjadi duplikasi data.
- Sebagai admin, saya ingin menambah lokasi dengan memilih pelanggan yang sudah ada agar data relasinya konsisten.

### 9.2 Staf Monitoring

- Sebagai staf monitoring, saya ingin melihat kontrak yang akan berakhir agar bisa menyiapkan tindak lanjut.
- Sebagai staf monitoring, saya ingin melihat status lunas/belum lunas agar prioritas kerja lebih jelas.
- Sebagai admin atau staf monitoring, saya ingin melakukan upgrade paket dengan membuat kontrak baru dan menonaktifkan kontrak lama agar histori tetap utuh.

### 9.3 Staf Penagihan

- Sebagai staf penagihan, saya ingin menambah data invoice dan tanggal bayar agar histori penagihan tercatat.
- Sebagai staf penagihan, saya ingin melihat invoice yang belum dibayar agar mudah ditindaklanjuti.
- Sebagai admin atau staf, saya ingin mengunggah berkas pendukung dari form agar file otomatis tersimpan di Google Drive dan link-nya tercatat di spreadsheet.
- Sebagai admin, saya ingin tab khusus pelanggan agar data pelanggan/provider tidak bercampur dengan data operasional lokasi.

## 10. Kebutuhan Fungsional

### 10.1 Spreadsheet dan Data

- Sistem harus memiliki satu spreadsheet pusat sebagai sumber data utama.
- Sistem harus menyimpan data dalam format tabel datar.
- Satu baris harus merepresentasikan satu record yang jelas.
- Setiap record harus memiliki ID unik atau key yang stabil.

### 10.2 Input Data Pelanggan

- User harus bisa membuka form tambah pelanggan dari menu atau tombol.
- Form minimal berisi:
  - kode pelanggan
  - nama pelanggan
  - lokasi
  - nama PIC jika diperlukan
  - keterangan
- Sistem harus menolak kode pelanggan yang duplikat.

### 10.3 Input Data Kontrak

- User harus bisa menambah kontrak baru melalui form.
- Tombol utama untuk proses ini harus menggunakan istilah `Tambah Kontrak Lokasi`.
- Form minimal berisi:
  - kode pelanggan
  - nama pelanggan atau auto-lookup dari kode
  - paket
  - lokasi
  - periode awal
  - durasi kontrak
  - periode akhir
  - nomor kontrak
  - nilai kontrak
  - biaya aktivasi
  - biaya per bulan
  - nilai periode aktif
  - keterangan
- `Nilai Kontrak` diinput manual oleh user.
- `Perbulan` diinput manual oleh user.
- `Nilai Periode Aktif` dihitung otomatis dari `Perbulan x durasi kontrak`.
- `Status Kontrak` dihitung otomatis oleh sistem dan tidak dipilih manual pada form tambah kontrak lokasi.
- Nilai status kontrak yang dipakai harus dibatasi pada:
  - `Aktif`
  - `Belum Beroperasi`
  - `Berakhir`
  - `Diperpanjang`
  - `Di-upgrade`
  - `Nonaktif`
- Sistem harus mengizinkan user mengisi `periode awal` + `durasi kontrak`, lalu menghitung `periode akhir` secara otomatis.
- Sistem harus mengizinkan user mengisi `periode awal` + `periode akhir`, lalu menghitung `durasi kontrak` secara otomatis.
- Sistem harus menolak penyimpanan jika `durasi kontrak` dan `periode akhir` sama-sama kosong.
- Jika `durasi kontrak` dan `periode akhir` sama-sama diisi, sistem harus memvalidasi kecocokannya dan menampilkan peringatan bila tidak sesuai.

### 10.3A Ubah atau Upgrade Paket

- User harus bisa menjalankan aksi `Ubah/Upgrade Paket` dari data kontrak yang sudah ada.
- Saat upgrade paket dilakukan, sistem harus membuat record kontrak baru, bukan menimpa kontrak lama.
- Sistem hanya boleh mengizinkan upgrade dari kontrak `Aktif` terbaru pada grup pelanggan dan lokasi yang sama.
- Sistem harus menjaga relasi histori antara kontrak lama dan kontrak baru.
- Form upgrade paket minimal berisi:
  - kontrak asal
  - paket lama
  - paket baru
  - nilai kontrak baru
  - biaya aktivasi baru bila ada
  - biaya per bulan baru
  - nilai periode aktif baru
  - tanggal mulai kontrak baru
  - tanggal akhir kontrak baru
  - alasan perubahan
- Sistem harus menyimpan referensi `parent_contract_id` atau `previous_contract_id` pada kontrak baru.
- Sistem harus memotong `Periode Berakhir` kontrak lama menjadi sehari sebelum `tanggal mulai kontrak baru`.
- Sistem harus menyesuaikan nilai kontrak lama agar hanya merepresentasikan periode yang benar-benar terpakai sebelum upgrade.
- Sistem harus mengubah status kontrak lama menjadi `Di-upgrade`.
- Sistem harus memberi status kontrak baru:
  - `Aktif` bila tanggal mulai sudah berlaku
  - `Belum Beroperasi` bila tanggal mulai masih di masa depan
- Sistem tidak boleh menghapus histori kontrak lama.

### 10.3B Perpanjangan Kontrak Lokasi

- User harus bisa menjalankan aksi `Perpanjang` dari data kontrak yang sudah ada.
- Perpanjangan harus membuat record kontrak baru, bukan menimpa kontrak lama.
- Sistem hanya boleh mengizinkan perpanjangan dari kontrak terbaru pada grup pelanggan dan lokasi yang sama.
- Sistem harus menyimpan referensi `previous_contract_id` pada kontrak baru.
- Sistem harus menyisipkan kontrak baru ke grup pelanggan dan lokasi yang sama, bukan di paling bawah sheet.
- Sistem harus memberi status kontrak baru:
  - `Aktif` bila tanggal mulai sudah berlaku
  - `Belum Beroperasi` bila tanggal mulai masih di masa depan
- Sistem harus mengubah status kontrak lama menjadi `Diperpanjang` setelah kontrak lanjutan mulai berlaku.
- Jika kontrak lama masih berjalan dan kontrak baru belum mulai, kontrak lama tetap `Aktif`.

### 10.4 Input Data Lokasi

- User harus bisa menambah lokasi/customer baru melalui form kontrak lokasi.
- Form lokasi minimal berisi:
  - pelanggan
  - kode pelanggan terisi otomatis dari pelanggan terpilih
  - nama lokasi
  - alamat lokasi bila dipakai
  - keterangan
- User harus memilih pelanggan dari daftar pelanggan yang sudah ada.
- Sistem tidak boleh meminta user mengetik ulang nama pelanggan bila data pelanggan sudah tersedia.
- Sistem harus menyimpan relasi lokasi ke data pelanggan yang dipilih.

### 10.5 Input Data Penagihan

- User harus bisa menambah data penagihan dari form.
- Form minimal berisi:
  - referensi kontrak
  - nomor invoice
  - tanggal ditagih
  - tanggal dibayar
  - nominal
  - status pembayaran
  - keterangan

### 10.6 Monitoring

- Sistem harus menampilkan kontrak aktif, akan berakhir, dan berakhir.
- Sistem harus dapat membedakan kontrak aktif hasil upgrade dari kontrak lama yang sudah dinonaktifkan.
- Sistem harus menampilkan status invoice lunas dan belum lunas.
- Sistem harus memungkinkan filter berdasarkan ISP, pelanggan, lokasi, dan status.
- Sistem harus menghitung sisa hari menuju tanggal berakhir kontrak.
- Sistem harus menyediakan tab `Kontrak Aktif` yang hanya menampilkan kontrak dengan status aktif.
- Sistem harus menyediakan tab `Kontrak Lengkap` yang menampilkan seluruh kontrak tanpa menghilangkan histori.
- Sistem harus menyediakan tab `Rekap Sewa Core/Sharing Core` untuk rekap layanan berdasarkan jenis sewa.
- Sistem harus menyediakan tab `Pelanggan` untuk menampilkan data master pelanggan.

### 10.7 Manajemen Berkas

- User harus bisa menambahkan berkas pendukung melalui form.
- User harus bisa memilih file dari perangkat lokal saat membuka form berkas.
- Sistem harus mendukung berkas untuk konteks berikut:
  - lokasi
  - kontrak
  - penagihan
- Sistem harus mengunggah file ke Google Drive secara otomatis saat form disubmit.
- Sistem minimal harus menyimpan metadata berikut:
  - jenis relasi data
  - ID referensi data
  - ID lokasi
  - nama berkas
  - kategori berkas
  - link Google Drive
  - tanggal unggah
  - pengunggah
- Sistem harus menyimpan `drive_file_id` dan `drive_folder_id` bila diperlukan untuk pengelolaan lanjutan.
- Sistem harus menampilkan link Google Drive pada kolom spreadsheet yang relevan.
- Sistem harus memungkinkan satu record memiliki lebih dari satu berkas.
- Sistem harus memvalidasi bahwa link yang disimpan tidak kosong.
- Sistem harus memvalidasi tipe file yang diizinkan.
- Sistem harus memvalidasi ukuran file maksimum sesuai batas yang ditetapkan.
- Sistem harus menampilkan pesan gagal bila upload ke Google Drive tidak berhasil.
- Sistem harus menganggap lokasi sebagai pemilik utama berkas operasional seperti kontrak, invoice, dan dokumen layanan.

### 10.8 Audit dan Metadata

- Sistem harus menyimpan timestamp input.
- Sistem harus menyimpan identitas email pengguna bila memungkinkan.
- Sistem harus menjaga histori data dasar agar perubahan dapat dilacak minimal di level spreadsheet revision history.

## 11. Kebutuhan Non-Fungsional

- mudah digunakan oleh pengguna non-teknis
- respons input form kurang dari 3 detik pada kondisi normal
- akses berbasis akun Google yang berwenang
- struktur data mudah diekspor ke Excel bila diperlukan
- formula monitoring tidak bergantung pada merge cell
- maintainability tinggi dengan penamaan sheet dan kolom yang konsisten
- link dokumen harus mudah dibuka oleh pengguna yang memiliki akses Drive
- upload file harus tetap sederhana untuk pengguna non-teknis

## 12. Desain Data Awal

Versi sederhana menggunakan 4 tab utama yang terlihat user:

- `Kontrak Lengkap`
- `Kontrak Aktif`
- `Pelanggan`
- `Rekap Sewa Core/Sharing Core`

Selain itu, sistem memakai `1 sheet backend` bernama `Data Billing Backend` untuk menyimpan detail tagihan. Sheet ini bukan sheet operasional utama user, tetapi sumber data untuk modal billing.

### 12.1 Tab `Kontrak Lengkap`

Tab ini menjadi tabel sumber utama untuk kontrak. Data billing detail tidak disimpan melebar di tab ini.

Kolom yang disarankan:

- `no`
- `contract_id`
- `previous_contract_id`
- `kode_pelanggan`
- `nama_pelanggan`
- `lokasi`
- `periode_awal`
- `periode_akhir`
- `nomor_kontrak`
- `paket`
- `nilai_kontrak`
- `biaya_aktivasi`
- `biaya_perbulan`
- `nilai_periode_aktif`
- `status_kontrak`
- `jenis_perubahan_kontrak`
- `alasan_perubahan`
- `link_folder_berkas`
- `link_berkas_kontrak`
- `billing`
- `keterangan`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

### 12.2 Tab `Kontrak Aktif`

Tab ini adalah tampilan operasional dari `Kontrak Lengkap` yang hanya menampilkan data aktif.

Kolom yang disarankan:

- `contract_id`
- `kode_pelanggan`
- `nama_pelanggan`
- `lokasi`
- `periode_awal`
- `periode_akhir`
- `nomor_kontrak`
- `paket`
- `nilai_kontrak`
- `biaya_aktivasi`
- `biaya_perbulan`
- `nilai_periode_aktif`
- `status_kontrak`
- `sisa_hari`
- `link_folder_berkas`
- `billing`
- `keterangan`

### 12.3 Tab `Pelanggan`

Tab ini menjadi tabel pelanggan/provider sekaligus histori kerja sama pelanggan tersebut dengan PT KIMA.

Kolom yang disarankan:

- `no`
- `kode_pelanggan`
- `nama_pelanggan`
- `periode_awal`
- `periode_berakhir`
- `no_kontrak_pks`
- `status_kerja_sama`
- `pic`
- `telepon`
- `email`
- `berkas_pelanggan`
- `keterangan`
- `aksi`

Catatan:

- `no_kontrak_pks` dapat ditampilkan sebagai hyperlink ke file kontrak aktif pada baris tersebut bila file kontrak tersedia
- `berkas_pelanggan` tetap menyimpan link folder utama pelanggan di Google Drive
- `aksi` dapat dipakai untuk operasi per baris, misalnya penghapusan data

### 12.4 Tab `Rekap Sewa Core/Sharing Core`

Tab ini adalah tab ringkasan untuk kebutuhan monitoring manajemen.

Kolom yang disarankan:

- `periode_rekap`
- `customer_id`
- `kode_pelanggan`
- `nama_pelanggan`
- `jenis_layanan`
- `paket`
- `tipe_core`
- `jumlah_kontrak_aktif`
- `jumlah_lokasi`
- `total_biaya_perbulan`
- `total_biaya_pertahun`
- `keterangan`

## 13. UI/UX yang Diinginkan

### 13.1 Titik Masuk

- custom menu di Google Sheets: `Pelanggan`
- submenu `Pelanggan`:
  - `Tambah Pelanggan`
- custom menu di Google Sheets: `Lokasi`
- submenu `Lokasi`:
  - `Tambah Kontrak Lokasi`

### 13.2 Form Popup

Karakteristik form:

- tampil sebagai modal dialog
- field wajib diberi tanda jelas
- gunakan date picker untuk tanggal
- gunakan input angka manual untuk `Durasi Kontrak (bulan)`
- sediakan komponen upload banyak file pada form berkas
- sediakan field `Jenis Berkas`, `Upload File`, dan `Nama File` untuk setiap berkas
- sediakan tombol `+ Tambah Berkas`
- untuk form `Tambah Kontrak Lokasi`, kurangi scrolling berlebih dan utamakan layout yang ringkas
- sediakan skeleton/loading awal saat popup form dibuka
- sediakan loading overlay dan progress bar saat proses simpan berjalan
- tampilkan pesan sukses atau gagal
- setelah submit sukses, form bisa reset otomatis

## 14. Aturan Bisnis Awal

- `nama_pelanggan` adalah field wajib pada form `Tambah Pelanggan`
- `kode_pelanggan` boleh kosong pada fase awal implementasi
- `1 baris = 1 periode kerja sama pelanggan`
- jika ada perpanjangan kerja sama, sistem harus membuat baris baru
- baris lama hasil perpanjangan diubah statusnya menjadi `Diperpanjang`
- `periode_berakhir` dihitung otomatis dari `periode_awal` dan `durasi_kontrak_bulan`
- `status_kerja_sama` dihitung otomatis dari periode, kecuali status khusus seperti `Diperpanjang` dan `Nonaktif`
- upload file pelanggan masuk ke folder utama pelanggan pada Google Drive
- nama folder pelanggan mengikuti format `Kode Pelanggan - Nama Pelanggan`
- subfolder pelanggan minimal terdiri dari:
  - `Kontrak`
  - `BAK-PKS`
  - `Dokumen Lain`
- kolom `berkas_pelanggan` menyimpan link folder utama pelanggan
- jika file dengan kategori `Kontrak` diunggah, sistem dapat mengubah `no_kontrak_pks` menjadi hyperlink ke file kontrak aktif pada baris tersebut
- sistem dapat menyediakan kolom `aksi` untuk penghapusan data per baris
- lokasi harus terhubung ke satu pelanggan yang valid
- kontrak hanya bisa dibuat untuk pelanggan yang sudah ada pada tab `Pelanggan`
- `periode_akhir` tidak boleh lebih awal dari `periode_awal`
- upgrade paket harus membuat kontrak baru dan menonaktifkan kontrak lama
- satu lokasi tidak boleh memiliki lebih dari satu kontrak aktif untuk layanan yang sama pada periode yang sama kecuali diizinkan aturan bisnis
- status pembayaran terakhir default adalah `Belum Lunas` bila belum ada pembayaran
- monitoring status kontrak dihitung dari tanggal hari ini terhadap `periode_akhir`
- `status_kontrak` pada form tambah kontrak lokasi dihitung otomatis, bukan dipilih manual
- tab `Kontrak Aktif` dan `Rekap Sewa Core/Sharing Core` dihasilkan dari tab `Kontrak Lengkap`
- link berkas harus disimpan pada baris kontrak/lokasi terkait dan dapat dibuka langsung dari spreadsheet
- file yang diunggah harus masuk ke folder Google Drive yang sesuai dengan kategorinya
- hak akses file mengikuti hak akses folder Drive tujuan

## 15. Laporan dan Monitoring

Versi 1 hanya memiliki 4 tab tampilan:

- tab `Kontrak Lengkap`
- tab `Kontrak Aktif`
- tab `Pelanggan`
- tab `Rekap Sewa Core/Sharing Core`

Seluruh kebutuhan monitoring, histori, relasi lokasi-pelanggan, status kontrak, dan akses berkas harus tercakup melalui 4 tab tersebut.

### 15.1 Tab `Kontrak Aktif`

Tujuan:

- menjadi tampilan operasional utama untuk kontrak yang sedang berjalan

Isi minimal:

- contract_id
- kode_pelanggan
- nama_pelanggan
- nama_lokasi
- ISP
- jenis_layanan
- paket
- periode_awal
- periode_akhir
- status_kontrak
- biaya_perbulan
- nilai_periode_aktif
- sisa_hari
- link_dokumen

Aturan:

- hanya menampilkan kontrak dengan status aktif
- kontrak lama hasil upgrade tidak tampil di tab ini
- kolom `link_folder_berkas` mengarah ke folder Drive lokasi terkait

### 15.2 Tab `Kontrak Lengkap`

Tujuan:

- menyediakan histori penuh seluruh kontrak dan menjadi sumber data utama sistem

Isi minimal:

- seluruh kolom penting kontrak, lokasi, pelanggan, dan dokumen
- `previous_contract_id`
- `jenis_perubahan_kontrak`
- `alasan_perubahan`
- `status_kontrak`
- `billing`

Aturan:

- menampilkan kontrak aktif, nonaktif, berakhir, dan diganti
- dipakai sebagai sumber audit, input utama, dan pelacakan histori
- kolom `billing` hanya membuka modal billing
- detail tagihan tidak disimpan melebar di sheet ini

### 15.3 Tab `Rekap Sewa Core/Sharing Core`

Tujuan:

- menyediakan ringkasan biaya dan jumlah layanan core serta sharing core

Isi minimal:

- ISP
- jenis_layanan
- paket
- jumlah_kontrak_aktif
- jumlah_lokasi
- total_biaya_perbulan
- total_biaya_pertahun

Aturan:

- data dihitung dari kontrak aktif
- rekap dipisahkan minimal antara `Core` dan `Sharing Core`
- bila diperlukan, rekap dapat dikelompokkan per pelanggan dan per paket

### 15.4 Tab `Pelanggan`

Tujuan:

- menyediakan tabel pelanggan/provider sekaligus histori kerja samanya dengan PT KIMA

Isi minimal:

- `no`
- `kode_pelanggan`
- `nama_pelanggan`
- `periode_awal`
- `periode_berakhir`
- `no_kontrak_pks`
- `status_kerja_sama`
- `pic`
- `telepon`
- `email`
- `berkas_pelanggan`
- `keterangan`
- `aksi`

Aturan:

- input bisa dilakukan langsung di tabel pada fase awal
- sistem UI disediakan melalui menu `Pelanggan` dan `Lokasi`
- menu `Tambah Pelanggan` dipakai untuk membuat data pelanggan baru
- menu `Tambah Kontrak Lokasi` dipakai untuk membuat kontrak lokasi baru
- menu `Perpanjangan` dipakai untuk membuat periode kerja sama baru tanpa menimpa baris lama
- form `Tambah Pelanggan` mendukung upload banyak file
- file yang diunggah dikelompokkan berdasarkan `Jenis Berkas`
- jika file kontrak diunggah, kolom `no_kontrak_pks` pada baris tersebut dapat langsung dibuka sebagai link ke file kontrak aktif
- kolom `berkas_pelanggan` tetap membuka folder utama pelanggan
- kolom `aksi` dapat digunakan untuk menghapus data per baris, terutama untuk salah input atau data duplikat
- sistem menampilkan loading dan progress bar saat proses simpan

## 15A. Struktur Dokumen Google Drive

Struktur awal yang direkomendasikan:

- folder utama: `FO KIMA Documents`
- subfolder:
  - `Lokasi`
  - `Kontrak`
  - `Penagihan`

Opsi lanjutan bila diperlukan:

- subfolder per kode pelanggan lalu per lokasi
- penamaan file standar dengan prefix tanggal atau kode pelanggan

Aturan penamaan awal yang disarankan:

- `[kode_pelanggan]_[kategori]_[nama_file_asli]`

## 15B. Aturan Upload Berkas

Aturan awal yang direkomendasikan:

- tipe file yang diizinkan: PDF, XLSX, DOCX, JPG, PNG
- ukuran file maksimum ditetapkan pada tahap implementasi teknis
- file diunggah lewat form sesuai konteks data
- sistem membuat file di Google Drive
- sistem menyimpan metadata dan link file ke sheet yang relevan
- sheet terkait dapat menampilkan link dokumen melalui formula atau lookup
- folder tujuan utama berkas operasional ditentukan berdasarkan lokasi terkait

## 15C. Sheet `Data Billing Backend`

Tujuan:

- menyimpan seluruh detail tagihan per kontrak
- menjadi sumber data untuk modal `Lihat Billing`

Isi minimal:

- `no`
- `billing_id`
- `contract_id`
- `nomor_kontrak`
- `nama_pelanggan`
- `lokasi`
- `periode_tagihan`
- `nominal_tagihan`
- `nomor_invoice`
- `tanggal_ditagih`
- `tanggal_dibayar`
- `status_pembayaran`
- `link_invoice`
- `keterangan`

Aturan:

- `1 baris = 1 tagihan`
- satu kontrak bisa memiliki banyak baris tagihan
- jumlah tagihan mengikuti durasi kontrak dan pola penagihan
- data ditampilkan ke user melalui modal billing dari tab `Kontrak Lengkap`
- konsep UI billing yang dipakai adalah `Mode C`:
  - modal utama `Billing Kontrak` untuk daftar seluruh tagihan per kontrak
  - modal kecil `Edit Tagihan` untuk edit 1 tagihan terpilih

## 16. Migrasi Data

Data dari file Excel lama perlu dirapikan sebelum masuk ke spreadsheet pusat.

Prinsip migrasi:

- sheet lama dijadikan sumber referensi, bukan struktur akhir
- merge cell dihilangkan pada layer data master
- data dipetakan ke format kolom baku
- sheet monitoring lama dijadikan acuan bisnis, bukan acuan struktur teknis

Tahapan migrasi:

1. identifikasi field final yang benar-benar dibutuhkan
2. buat template sheet master baru
3. petakan data dari workbook lama ke template baru
4. validasi duplikasi dan inkonsistensi
5. uji hasil monitoring dari data yang sudah dimigrasikan

## 17. Risiko dan Mitigasi

- Risiko: struktur data lama tidak konsisten
  Mitigasi: lakukan data cleansing dan mapping bertahap

- Risiko: user tetap mengedit sheet master secara manual
  Mitigasi: batasi area edit dan arahkan input melalui form

- Risiko: ada field penting yang belum terdefinisi
  Mitigasi: lakukan finalisasi kolom sebelum coding form

- Risiko: performa sheet menurun jika formula terlalu berat
  Mitigasi: gunakan struktur master yang sederhana dan minim formula kompleks

## 18. Tahapan Implementasi yang Disarankan

### Fase 1: Perancangan

- finalisasi daftar sheet
- finalisasi daftar kolom
- finalisasi aturan bisnis inti

### Fase 2: Setup Spreadsheet

- buat spreadsheet pusat
- buat 4 tab utama
- buat `Data Billing Backend`
- buat validasi dasar

### Fase 3: Apps Script

- buat custom menu
- buat modal form tambah pelanggan
- buat modal form tambah lokasi
- buat modal form tambah kontrak
- buat aksi atau form upgrade paket
- buat modal form tambah berkas
- buat modal `Lihat Billing`
- buat proses upload file ke Google Drive dari form berkas
- simpan data ke sheet terkait dan backend billing

### Fase 4: Monitoring

- bangun sheet monitoring turunan
- bangun tab `Kontrak Aktif`
- bangun tab `Kontrak Lengkap`
- bangun tab `Rekap Sewa Core/Sharing Core`
- bangun tab `Pelanggan`
- tambahkan filter dan status otomatis

### Fase 5: UAT

- uji tambah data
- uji validasi
- uji monitoring
- uji multi-user

## 19. Definisi Selesai untuk Versi 1

Versi 1 dianggap selesai jika:

- spreadsheet pusat aktif dan bisa diakses user terkait
- form popup untuk tambah pelanggan, lokasi, dan kontrak berjalan
- alur upgrade paket berjalan dengan pembuatan kontrak baru dan penonaktifan kontrak lama
- form atau alur input berkas dan link Drive berjalan
- upload file dari form ke Google Drive berjalan
- modal billing dapat menampilkan detail tagihan dari `Data Billing Backend`
- data masuk otomatis ke sheet yang benar
- monitoring dasar dapat menampilkan status kontrak dan penagihan
- tab `Kontrak Aktif`, `Kontrak Lengkap`, dan `Rekap Sewa Core/Sharing Core` tampil dan terisi benar
- tab `Pelanggan` tampil dan merangkum data provider dengan benar
- user tidak perlu lagi menambah data utama dengan edit manual baris spreadsheet

## 20. Rekomendasi Keputusan Awal

Keputusan awal yang direkomendasikan:

- gunakan Google Sheets sebagai platform pusat
- gunakan Google Apps Script untuk popup form dan automasi
- gunakan sheet master datar sebagai sumber data tunggal
- jadikan monitoring sebagai hasil olahan, bukan tempat input utama

## 21. Lampiran Keputusan Teknis Awal

Berdasarkan file Excel saat ini, sheet seperti `20062026`, `Monitoring`, dan `Monitoring (2)` lebih cocok dijadikan referensi bisnis untuk migrasi data daripada dipertahankan strukturnya apa adanya. Struktur baru sebaiknya dibangun ulang agar sederhana, datar, dan siap dipakai sebagai basis UI input.
