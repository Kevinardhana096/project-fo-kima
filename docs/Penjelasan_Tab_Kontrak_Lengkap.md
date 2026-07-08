# Penjelasan Tab `Kontrak Lengkap`

Tab `Kontrak Lengkap` adalah tabel utama untuk semua data kontrak lokasi/customer.

Prinsip utamanya:

- `1 baris = 1 kontrak`
- kontrak baru dibuat sebagai baris baru
- kontrak hasil perubahan periode atau perpanjangan lokasi dicatat sebagai baris baru
- upgrade paket dibuat sebagai baris baru
- histori kontrak lama tetap disimpan

Catatan penting:

- dokumen ini membahas histori kontrak pada sheet `Kontrak Lengkap`
- menu/form bernama `Perpanjangan` pada aplikasi adalah fitur milik sheet master pelanggan, bukan menu khusus sheet `Kontrak Lengkap`
- jika nanti ada kebutuhan perpanjangan pada level kontrak lokasi, implementasinya tetap mengikuti prinsip `1 baris = 1 kontrak`, tetapi berbeda konteks dengan perpanjangan kerja sama pelanggan

## Fungsi Tab

Tab ini dipakai untuk:

- menyimpan seluruh riwayat kontrak lokasi/customer
- menjadi daftar utama kontrak aktif dan nonaktif
- menampilkan link dokumen kontrak
- membuka detail billing tanpa membuat sheet utama melebar

## Kolom Final

- `No`
- `ID Kontrak`
- `Aksi`
- `Kategori`
- `Kode Pelanggan`
- `Nama Pelanggan`
- `Lokasi`
- `Sisa Waktu`
- `Periode Awal`
- `Durasi Kontrak`
- `Periode Berakhir`
- `No Kontrak`
- `Core`
- `Sharing Core`
- `Nilai Kontrak`
- `Biaya Aktivasi`
- `Perbulan`
- `Nilai Periode Aktif`
- `Status Kontrak`
- `Berkas`
- `Billing`
- `Keterangan`
- `ID Kontrak Sebelumnya`

## Arti Kolom Penting

- `ID Kontrak`: ID unik untuk menghubungkan kontrak dengan data billing
- `Aksi`: kolom aksi tunggal untuk baris kontrak, misalnya `Edit` atau `Hapus`
- `Kategori`: kategori kontrak/dokumen, saat ini dibatasi ke dropdown `BAK (Berita Acara Kesepakatan)` atau `Kontrak/Perjanjian Induk`
- `Kode Pelanggan`: kode pelanggan penyedia layanan
- `Nama Pelanggan`: nama pelanggan penyedia layanan
- `Lokasi`: nama customer/lokasi yang memakai layanan
- `Sisa Waktu`: dihitung otomatis dengan formula sheet berdasarkan `Periode Berakhir`
- `Durasi Kontrak`: dihitung otomatis dengan formula sheet dari `Periode Awal` dan `Periode Berakhir`
- `No Kontrak`: nomor kontrak aktif dan bisa dibuat hyperlink ke dokumen kontrak aktif
- `Core`: nama layanan core utama bila kontrak tidak memakai sharing core
- `Sharing Core`: porsi sharing core bila kontrak memakai pola sharing
- `Nilai Kontrak`: nilai kontrak utama yang diinput manual sesuai kesepakatan bisnis
- `Perbulan`: nilai tagihan bulanan yang diinput manual
- `Nilai Periode Aktif`: nilai otomatis untuk 1 periode aktif kontrak, dihitung dari `Perbulan x Durasi Kontrak`
- `Berkas`: link ke folder periode kontrak di Google Drive
- `Billing`: tombol atau link `Lihat Billing` untuk membuka modal monitoring billing
- `Status Kontrak`: status kontrak memakai daftar baku `Aktif`, `Belum Beroperasi`, `Berakhir`, `Diperpanjang`, `Di-upgrade`, dan `Nonaktif`
- `ID Kontrak Sebelumnya`: referensi ke `ID Kontrak` lama bila baris ini merupakan hasil `Perpanjangan` atau `Di-upgrade`

## Aturan Input

- data idealnya diisi lewat UI/form
- tombol utama yang dipakai adalah `Tambah Kontrak Lokasi`
- setelah disimpan, sistem menambah 1 baris baru ke tab ini
- sistem mencari baris data kosong berikutnya berdasarkan `ID Kontrak`, bukan sekadar `appendRow`, agar tidak terdorong jauh ke bawah oleh formula atau dropdown
- user tidak perlu membuat kolom billing bulanan di sheet ini
- detail billing tidak disimpan melebar di tab ini

## Konsep `Tambah Kontrak Lokasi`

Di tab ini, proses tambah lokasi dipahami sebagai tambah kontrak untuk lokasi/customer.

Jadi:

- `Tambah Lokasi` di konteks tab ini = `Tambah Kontrak Lokasi`
- hasil akhirnya tetap `1 baris kontrak baru`

Form `Tambah Kontrak Lokasi` minimal memuat:

- data pelanggan
- data lokasi/customer
- data kontrak
- data berkas bila ada

Field utama yang diisi user:

- pelanggan
- kode pelanggan otomatis dari pelanggan terpilih
- kategori
- lokasi/customer
- pilih salah satu: `core` atau `sharing core`
- periode awal
- durasi kontrak atau periode berakhir
- no kontrak
- nilai kontrak
- biaya aktivasi
- perbulan
- keterangan
- upload berkas

## Aturan Periode Kontrak

Field periode dibuat fleksibel:

- `Periode Awal` wajib diisi
- user boleh mengisi `Durasi Kontrak`
- user boleh langsung mengisi `Periode Berakhir`
- sistem otomatis menghitung field pasangannya

Logikanya:

- jika user mengisi `Periode Awal` + `Durasi Kontrak`, sistem menghitung `Periode Berakhir`
- jika user mengisi `Periode Awal` + `Periode Berakhir`, sistem menghitung `Durasi Kontrak`
- jika `Durasi Kontrak` dan `Periode Berakhir` sama-sama kosong, data tidak bisa disimpan
- jika keduanya diisi tetapi hasilnya tidak cocok, sistem menampilkan peringatan agar user memperbaiki data

## Formula Sheet

- kolom `Sisa Waktu` dan `Durasi Kontrak` dihitung di Google Sheets dengan `ARRAYFORMULA`
- formula disimpan di sel awal kolom masing-masing agar otomatis mengalir ke bawah
- spreadsheet ini memakai locale Indonesia, jadi pemisah argumen formula harus `;`
- tampilan `Durasi Kontrak` disarankan tetap bernilai angka, lalu diberi custom number format seperti `0 "bulan"`

## Aturan Nilai dan Status

- `Kategori` wajib mengikuti dropdown:
  - `BAK (Berita Acara Kesepakatan)`
  - `Kontrak/Perjanjian Induk`
- user wajib memilih salah satu:
  - isi `Core`, atau
  - pilih `Sharing Core`
- `Core` dan `Sharing Core` tidak boleh diisi bersamaan
- `Sharing Core` dibatasi ke dropdown:
  - `1/2`
  - `1/4`
  - `1/8`
  - `1/16`
  - `1/32`
- `Nilai Kontrak` diinput manual oleh user
- `Perbulan` diinput manual oleh user
- `Nilai Periode Aktif` dihitung otomatis dari `Perbulan x Durasi Kontrak`
- `Status Kontrak` tidak diinput manual pada form tambah kontrak lokasi
- `Status Kontrak` dihitung otomatis saat data disimpan dan direkonsiliasi ulang oleh sistem

Daftar status kontrak yang dipakai:

- `Aktif`: kontrak sedang berjalan
- `Belum Beroperasi`: kontrak baru sudah dibuat, tetapi `Periode Awal` belum mulai
- `Berakhir`: kontrak selesai dan tidak memiliki tindak lanjut
- `Diperpanjang`: kontrak lama sudah memiliki kontrak lanjutan hasil perpanjangan
- `Di-upgrade`: kontrak lama dipotong karena perubahan paket di tengah periode
- `Nonaktif`: kontrak diputus manual oleh admin

## Aturan Perubahan Kontrak

- `Kontrak baru`: tambah 1 baris baru
- `Perpanjangan kontrak lokasi` atau perubahan periode: tambah 1 baris baru, kontrak lama tetap ada sebagai histori
- `Upgrade paket`: tambah 1 baris baru, kontrak lama dipotong periodenya dan ditandai `Di-upgrade`

Catatan:

- poin `perpanjangan` pada bagian ini adalah aturan histori data bila kontrak lokasi berubah
- poin ini bukan referensi ke menu/form `Perpanjangan` yang ada di menu `Pelanggan`

## Kolom `Aksi`

- tab ini memakai satu kolom `Aksi`
- isi dropdown `Aksi` dikelola manual oleh user melalui `Data > Validasi data`
- Apps Script tidak lagi membuat atau memaksa isi dropdown `Aksi` pada tab ini
- menu `Lokasi > Reset Validasi Aksi Kontrak` hanya membantu membersihkan validasi lama yang pernah dibuat script
- nilai yang diharapkan saat ini adalah `Edit`, `Perpanjang`, `Di-upgrade`, dan `Hapus`

## Trigger Aksi

- aksi `Edit` dan `Hapus` pada `Kontrak Lengkap` tidak memakai simple trigger biasa
- tab ini memakai installable trigger karena modal `Edit` butuh izin `Ui.showModalDialog`
- trigger diaktifkan dari menu `Lokasi > Aktifkan Trigger Aksi Kontrak`
- setelah trigger aktif:
  - memilih `Edit` akan membuka modal edit kontrak lokasi
  - memilih `Perpanjang` akan membuka modal perpanjangan kontrak lokasi
  - memilih `Di-upgrade` akan membuka modal upgrade kontrak lokasi
  - memilih `Hapus` akan meminta konfirmasi lalu menghapus baris dan aset Drive terkait
- setelah aksi diproses, isi sel `Aksi` dikosongkan kembali oleh sistem

## Folder Drive Kontrak

- setiap kontrak lokasi disimpan di root folder lokasi
- struktur terbaru folder adalah:
  - `Nama Lokasi`
  - `Nama Lokasi/04-12-2025 s.d. 03-12-2026`
  - `Nama Lokasi/04-12-2025 s.d. 03-12-2026/Kontrak`
  - `Nama Lokasi/04-12-2025 s.d. 03-12-2026/BAK-PKS`
  - `Nama Lokasi/04-12-2025 s.d. 03-12-2026/Dokumen Lain`
- kolom `Berkas` mengarah ke folder periode kontrak, bukan ke folder lokasi utama
- saat kontrak lama dengan struktur folder legacy diedit, sistem akan memigrasikan isi folder lama ke struktur folder periode baru
- kontrak hasil `Perpanjangan` dan `Di-upgrade` selalu membuat folder periode baru, tetapi tetap berada di bawah folder `Lokasi` yang sama

## Edit Kontrak Lokasi

- modal `Edit Kontrak Lokasi` dibuka dari kolom `Aksi`
- modal edit mendukung:
  - edit data kontrak utama
  - melihat daftar file existing
  - menandai file existing untuk dihapus
  - upload file baru dengan jenis berkas dan nama file
- jika periode atau lokasi berubah, sistem akan menyesuaikan folder target kontrak
- jika file kontrak aktif berubah, hyperlink pada kolom `No Kontrak` ikut diperbarui

## Perpanjangan Kontrak Lokasi

- perpanjangan dibuat dari kontrak sumber yang dipilih dari kolom `Aksi`
- hanya kontrak terbaru pada grup `Pelanggan + Lokasi` yang sama yang boleh diperpanjang
- kontrak baru disisipkan ke grup `Pelanggan + Lokasi` yang sama, bukan ditaruh di paling bawah sheet
- kontrak baru menyimpan `ID Kontrak Sebelumnya`
- form perpanjangan menampilkan `Kategori Lama`, `Core Lama`, dan `Sharing Core Lama`
- `Kategori Baru` default mengikuti kontrak sumber, tetapi tetap bisa diubah
- jika kontrak lama masih berjalan dan kontrak baru mulai di masa depan:
  - kontrak lama tetap `Aktif`
  - kontrak baru `Belum Beroperasi`
- jika kontrak lanjutan sudah mulai berlaku:
  - kontrak lama menjadi `Diperpanjang`
  - kontrak baru menjadi `Aktif`
- upload berkas pada perpanjangan masuk ke folder periode baru

## Upgrade Kontrak Lokasi

- upgrade dipakai untuk perubahan paket di tengah periode kontrak yang masih `Aktif`
- upgrade dibuat sebagai kontrak baru, bukan edit kontrak lama
- hanya kontrak aktif terbaru pada grup `Pelanggan + Lokasi` yang sama yang boleh di-upgrade
- `Periode Awal` kontrak baru default ke tanggal hari ini, tetapi tetap bisa diedit
- form upgrade menampilkan `Kategori Lama`, `Core Lama`, dan `Sharing Core Lama`
- `Kategori Baru` default mengikuti kontrak sumber, tetapi tetap bisa diubah
- saat upgrade disimpan:
  - kontrak lama dipotong sampai sehari sebelum `Periode Awal` kontrak baru
  - `Nilai Kontrak` lama ikut disesuaikan berdasarkan periode yang tersisa
  - status kontrak lama menjadi `Di-upgrade`
  - kontrak baru menyimpan `ID Kontrak Sebelumnya`
  - kontrak baru disisipkan ke grup `Pelanggan + Lokasi` yang sama
  - berkas upgrade masuk ke folder periode baru

## Aturan Hapus Data

- `Hapus` pada kolom `Aksi` ditujukan untuk data salah input, duplikat, atau data uji
- saat user konfirmasi hapus, sistem akan:
  - menghapus baris kontrak dari sheet
  - menghapus folder periode kontrak beserta isi berkasnya di Drive
  - membersihkan folder lokasi jika setelah itu sudah kosong
- folder tidak akan dihapus jika link folder tersebut masih dipakai baris kontrak lain

## Hubungan dengan Billing

Tab ini hanya menyimpan data utama kontrak.

Detail billing disimpan di sheet backend terpisah, lalu ditampilkan melalui modal saat user menekan kolom `Billing`.

Jadi:

- `Kontrak Lengkap` = daftar kontrak
- `Data Billing Backend` = daftar semua tagihan
- `Modal Billing` = tampilan daftar tagihan per kontrak
- `Modal Edit Tagihan` = modal kecil terpisah untuk mengubah 1 tagihan terpilih

## Konsep UI Billing

- konsep billing terakhir memakai `Mode C`
- saat user menekan `Lihat Billing`, sistem membuka modal utama `Billing Kontrak`
- modal utama menampilkan:
  - identitas kontrak
  - ringkasan billing
  - tabel semua tagihan
- pada tabel billing, setiap baris memiliki aksi seperti `Edit`
- saat user menekan `Edit` pada salah satu tagihan, sistem membuka modal kecil `Edit Tagihan`
- setelah data tagihan disimpan, modal kecil ditutup lalu data pada modal utama di-refresh
- panel edit tagihan tidak tampil permanen di modal utama

## Loading UI

- efek loading skeleton dan progress bar tidak lagi khusus untuk tab `Pelanggan`
- komponen loading dibuat global agar dapat dipakai juga oleh:
  - `Tambah Pelanggan`
  - `Tambah Kontrak Lokasi`
  - `Edit Kontrak Lokasi`
  - `Perpanjangan Kontrak Lokasi`
  - `Upgrade Kontrak Lokasi`
- pada frontend `Next.js`, menu `Pelanggan` dan `Kontrak Lengkap` sekarang dipertahankan tetap mounted setelah pertama kali dibuka
- frontend juga memakai cache memory ringan untuk list `Pelanggan` dan `Kontrak Lengkap` agar perpindahan menu tidak memicu loading penuh berulang

## Hasil yang Diharapkan

Dengan model ini, tab `Kontrak Lengkap` tetap:

- ringkas
- mudah dibaca
- tidak melebar ke samping
- aman untuk histori kontrak
- siap dihubungkan ke monitoring billing
