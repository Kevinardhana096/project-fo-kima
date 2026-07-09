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
  linkFolderBerkas?: string;
  uploadItems?: CustomerUploadItem[];
};

export type CustomerUpdateInput = CustomerCreateInput & {
  id: string;
  deleteFileIds?: string[];
};

export type ListMeta = {
  page: number;
  page_size: number;
  total: number;
};

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
  meta?: ListMeta;
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
  id: number;
  kodeKontrak: string;
  pelangganId: number;
  kodePelanggan?: string;
  namaPelanggan: string;
  previousLokasiId?: number;
  kategori: string;
  namaLokasi: string;
  core?: string;
  sharingCore?: string;
  periodeAwal: string;
  periodeBerakhir: string;
  durasiKontrakBulan?: number;
  noKontrak?: string;
  nilaiKontrak: number;
  biayaAktivasi: number;
  perbulan: number;
  nilaiPeriodeAktif: number;
  statusKontrak: string;
  jenisPerubahanKontrak?: string;
  alasanPerubahan?: string;
  linkFolderBerkas?: string;
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  existingFiles?: CustomerFileRecord[];
};

export type ContractCreateInput = {
  pelangganId: number;
  kategori: string;
  namaLokasi: string;
  core?: string;
  sharingCore?: string;
  periodeAwal: string;
  periodeBerakhir?: string;
  durasiKontrakBulan?: number;
  noKontrak?: string;
  nilaiKontrak: number;
  biayaAktivasi: number;
  perbulan: number;
  linkFolderBerkas?: string;
  keterangan?: string;
  uploadItems?: CustomerUploadItem[];
  deleteFileIds?: string[];
};

export type ContractUpdateInput = ContractCreateInput;

export type ContractRenewInput = {
  kategori: string;
  namaLokasi: string;
  core?: string;
  sharingCore?: string;
  periodeAwal: string;
  periodeBerakhir?: string;
  durasiKontrakBulan?: number;
  noKontrak?: string;
  nilaiKontrak: number;
  biayaAktivasi: number;
  perbulan: number;
  keterangan?: string;
  uploadItems?: CustomerUploadItem[];
  deleteFileIds?: string[];
};

export type ContractUpgradeInput = ContractRenewInput & {
  alasanPerubahan?: string;
};
