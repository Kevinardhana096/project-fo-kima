export type CustomerFileRecord = {
  fileId: string;
  namaFile: string;
  url: string;
  jenisBerkas: string;
};

export type CustomerRecord = {
  id: string;
  no: number | string;
  kodePelanggan: string;
  namaPelanggan: string;
  kontrakAktif: string;
  pic: string;
  telepon: string;
  email: string;
  berkasPelanggan: string;
  keterangan: string;
  aksi: string;
  existingFiles?: CustomerFileRecord[];
};

export type CustomerUploadItem = {
  jenisBerkas: string;
  namaFile: string;
  originalFileName: string;
  mimeType: string;
  base64Data: string;
  size: number;
};

export type CustomerCreateInput = {
  kodePelanggan: string;
  namaPelanggan: string;
  pic: string;
  telepon: string;
  email: string;
  keterangan: string;
  uploadItems?: CustomerUploadItem[];
};

export type CustomerUpdateInput = CustomerCreateInput & {
  id: string;
  deleteFileIds?: string[];
};

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ContractRecord = {
  id: string;
  rowNumber: number;
  no: number | string;
  idKontrak: string;
  aksi: string;
  kategori: string;
  previousIdKontrak: string;
  kodePelanggan: string;
  namaPelanggan: string;
  lokasi: string;
  sisaWaktu: string;
  periodeAwal: string;
  durasiKontrak: number | string;
  periodeBerakhir: string;
  noKontrak: string;
  noKontrakUrl: string;
  core: string;
  sharingCore: string;
  paket: string;
  nilaiKontrak: number;
  biayaAktivasi: number;
  perbulan: number;
  nilaiPeriodeAktif: number;
  statusKontrak: string;
  berkasUrl: string;
  billingLabel: string;
  keterangan: string;
};
