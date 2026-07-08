This is the `Next.js` frontend for the FO KIMA admin portal. In V1, it focuses on the customer master flow with additional read-only access to `Kontrak Lengkap`, and talks to `Google Apps Script Web App` through internal route handlers.

## Getting Started

1. Copy `.env.example` to `.env.local`.
2. Fill these variables:

```bash
APPS_SCRIPT_BASE_URL=...
APPS_SCRIPT_INTERNAL_SECRET=...
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Current V1 capabilities:

- list pelanggan
- detail pelanggan
- tambah pelanggan
- upload berkas pelanggan saat tambah pelanggan
- edit pelanggan
- lihat file existing pelanggan saat edit
- tandai file existing untuk dihapus saat edit
- upload berkas tambahan saat edit pelanggan
- hapus pelanggan
- list kontrak read-only
- detail kontrak read-only
- tampilkan `Kategori`, `Core`, dan `Sharing Core` pada list kontrak

Notes:

- browser hanya memanggil `/api/customers`
- browser juga memanggil `/api/contracts` untuk list kontrak
- `Next.js` server meneruskan request ke Apps Script memakai shared secret
- upload file pelanggan aktif untuk alur `Tambah Pelanggan` dan `Edit Pelanggan`
- file upload dikirim sebagai payload JSON base64 ke route handler internal, lalu diteruskan ke `Apps Script Web App`
- format folder pelanggan tetap mengikuti Apps Script: folder utama pelanggan dengan subfolder `Kontrak`, `BAK-PKS`, dan `Dokumen Lain`
- menu `Pelanggan` dan `Kontrak Lengkap` tidak lagi memakai tombol `Muat Ulang`
- perpindahan menu dioptimalkan dengan komponen persistent mount dan cache memory ringan untuk list utama

## Frontend Structure

Komponen sekarang dipecah per menu:

```text
app/_components/admin/
  pelanggan/
    customer-admin.tsx
    customer-table.tsx
    customer-form-dialog.tsx
    upload-utils.ts
    types.ts
  kontrak/
    contracts-readonly.tsx
    contract-utils.ts
```

Tujuannya:

- setiap menu punya folder sendiri
- file tampilan lebih modular
- logic upload dan tampilan tabel lebih mudah dirawat

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
