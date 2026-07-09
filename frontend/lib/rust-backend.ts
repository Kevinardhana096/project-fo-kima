import "server-only";

import type {
  ContractCreateInput,
  ContractRecord,
  ContractRenewInput,
  CustomerFileRecord,
  CustomerRecord,
  CustomerUploadItem,
} from "./customer-types";

type RustListResponse<T> = {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
};

type RustDetailResponse<T> = {
  data: T;
};

type RustErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type RustCustomer = {
  id: number;
  kode_pelanggan: string | null;
  nama_pelanggan: string;
  pic: string | null;
  telepon: string | null;
  email: string | null;
  link_folder_berkas: string | null;
  keterangan: string | null;
  kontrak_aktif: number;
  created_at: string;
  updated_at: string;
  existingFiles?: CustomerFileRecord[] | null;
};

type RustCustomerPayload = {
  kode_pelanggan?: string | null;
  nama_pelanggan: string;
  pic?: string | null;
  telepon?: string | null;
  email?: string | null;
  link_folder_berkas?: string | null;
  keterangan?: string | null;
  uploadItems?: CustomerUploadItem[];
  deleteFileIds?: string[];
};

type RustKontrakLengkap = {
  id: number;
  kode_kontrak: string;
  pelanggan_id: number;
  kode_pelanggan: string | null;
  nama_pelanggan: string;
  previous_lokasi_id: number | null;
  kategori: string;
  nama_lokasi: string;
  core: string | null;
  sharing_core: string | null;
  periode_awal: string;
  periode_berakhir: string;
  durasi_kontrak_bulan: number | null;
  no_kontrak: string | null;
  nilai_kontrak: number;
  biaya_aktivasi: number;
  perbulan: number;
  nilai_periode_aktif: number;
  status_kontrak: string;
  jenis_perubahan_kontrak: string | null;
  alasan_perubahan: string | null;
  link_folder_berkas: string | null;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
  existingFiles?: CustomerFileRecord[] | null;
};

type ContractPayload = ContractCreateInput & {
  alasanPerubahan?: string;
};

type RustKontrakLengkapPayload = {
  pelanggan_id?: number;
  kategori: string;
  nama_lokasi: string;
  core?: string | null;
  sharing_core?: string | null;
  periode_awal: string;
  periode_berakhir?: string | null;
  durasi_kontrak_bulan?: number | null;
  no_kontrak?: string | null;
  nilai_kontrak: number;
  biaya_aktivasi: number;
  perbulan: number;
  link_folder_berkas?: string | null;
  keterangan?: string | null;
  alasan_perubahan?: string | null;
  uploadItems?: CustomerUploadItem[];
  deleteFileIds?: string[];
};

type RustKontrakLengkapListResponse = RustListResponse<RustKontrakLengkap>;
type RustCustomerListResponse = RustListResponse<RustCustomer>;

export class RustBackendHttpError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "rust_backend_error") {
    super(message);
    this.name = "RustBackendHttpError";
    this.status = status;
    this.code = code;
  }
}

function getRustBackendBaseUrl() {
  return process.env.BACKEND_API_BASE_URL || "http://127.0.0.1:8080";
}

async function parseRustResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | RustErrorResponse | null;

  if (!response.ok) {
    const errorPayload = payload as RustErrorResponse | null;
    throw new RustBackendHttpError(
      errorPayload?.error?.message || "Backend Rust mengembalikan error.",
      response.status,
      errorPayload?.error?.code || "rust_backend_error",
    );
  }

  if (!payload) {
    throw new RustBackendHttpError(
      "Backend Rust mengembalikan response kosong atau tidak valid.",
      502,
      "invalid_rust_backend_response",
    );
  }

  return payload as T;
}

async function callRustBackend<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getRustBackendBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new RustBackendHttpError(
      `Tidak bisa terhubung ke backend Rust di ${baseUrl}. Pastikan service backend sedang berjalan.`,
      502,
      "rust_backend_unreachable",
    );
  }

  return parseRustResponse<T>(response);
}

function cleanText(value: string | null | undefined) {
  return value?.trim() || "";
}

function mapCustomer(record: RustCustomer, index: number): CustomerRecord {
  return {
    id: String(record.id),
    no: index + 1,
    kodePelanggan: cleanText(record.kode_pelanggan),
    namaPelanggan: record.nama_pelanggan,
    kontrakAktif: String(record.kontrak_aktif),
    pic: cleanText(record.pic),
    telepon: cleanText(record.telepon),
    email: cleanText(record.email),
    berkasPelanggan: cleanText(record.link_folder_berkas),
    keterangan: cleanText(record.keterangan),
    aksi: "",
    existingFiles: record.existingFiles || [],
  };
}

function mapContract(record: RustKontrakLengkap): ContractRecord {
  return {
    id: record.id,
    kodeKontrak: record.kode_kontrak,
    pelangganId: record.pelanggan_id,
    kodePelanggan: record.kode_pelanggan || undefined,
    namaPelanggan: record.nama_pelanggan,
    previousLokasiId: record.previous_lokasi_id || undefined,
    kategori: record.kategori,
    namaLokasi: record.nama_lokasi,
    core: record.core || undefined,
    sharingCore: record.sharing_core || undefined,
    periodeAwal: record.periode_awal,
    periodeBerakhir: record.periode_berakhir,
    durasiKontrakBulan: record.durasi_kontrak_bulan || undefined,
    noKontrak: record.no_kontrak || undefined,
    nilaiKontrak: record.nilai_kontrak,
    biayaAktivasi: record.biaya_aktivasi,
    perbulan: record.perbulan,
    nilaiPeriodeAktif: record.nilai_periode_aktif,
    statusKontrak: record.status_kontrak,
    jenisPerubahanKontrak: record.jenis_perubahan_kontrak || undefined,
    alasanPerubahan: record.alasan_perubahan || undefined,
    linkFolderBerkas: record.link_folder_berkas || undefined,
    keterangan: record.keterangan || undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    existingFiles: record.existingFiles || [],
  };
}

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapContractPayload(payload: ContractPayload, options: { includePelangganId: boolean; includeLinkFolder: boolean; includeAlasan: boolean }) {
  const periodeBerakhir = cleanOptionalText(payload.periodeBerakhir);
  const mapped: RustKontrakLengkapPayload = {
    kategori: payload.kategori,
    nama_lokasi: payload.namaLokasi,
    core: cleanOptionalText(payload.core),
    sharing_core: cleanOptionalText(payload.sharingCore),
    periode_awal: payload.periodeAwal,
    periode_berakhir: periodeBerakhir,
    durasi_kontrak_bulan: periodeBerakhir ? null : payload.durasiKontrakBulan || null,
    no_kontrak: cleanOptionalText(payload.noKontrak),
    nilai_kontrak: payload.nilaiKontrak,
    biaya_aktivasi: payload.biayaAktivasi || 0,
    perbulan: payload.perbulan,
    keterangan: cleanOptionalText(payload.keterangan),
    uploadItems: payload.uploadItems || [],
    deleteFileIds: payload.deleteFileIds || [],
  };

  if (options.includePelangganId) {
    mapped.pelanggan_id = payload.pelangganId;
  }

  if (options.includeLinkFolder) {
    mapped.link_folder_berkas = cleanOptionalText(payload.linkFolderBerkas);
  }

  if (options.includeAlasan) {
    mapped.alasan_perubahan = cleanOptionalText(payload.alasanPerubahan);
  }

  return mapped;
}

export async function listCustomersFromRust(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.pageSize) query.append("page_size", String(params.pageSize));
  if (params?.search) query.append("search", params.search);
  if (params?.sortBy) query.append("sort_by", params.sortBy);
  if (params?.sortOrder) query.append("sort_order", params.sortOrder);

  const queryString = query.toString();
  const path = `/api/pelanggan${queryString ? `?${queryString}` : ""}`;

  const result = await callRustBackend<RustCustomerListResponse>(path);

  const offset = ((params?.page || 1) - 1) * (params?.pageSize || 20);
  return {
    data: result.data.map((record, i) => mapCustomer(record, offset + i)),
    meta: result.meta,
  };
}

export async function getCustomerByIdFromRust(id: string) {
  const result = await callRustBackend<RustDetailResponse<RustCustomer>>(`/api/pelanggan/${id}`);
  return mapCustomer(result.data, 0);
}

export async function createCustomerInRust(payload: RustCustomerPayload) {
  const result = await callRustBackend<RustDetailResponse<RustCustomer>>("/api/pelanggan", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return mapCustomer(result.data, 0);
}

export async function updateCustomerInRust(id: string, payload: RustCustomerPayload) {
  const result = await callRustBackend<RustDetailResponse<RustCustomer>>(`/api/pelanggan/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return mapCustomer(result.data, 0);
}

export async function deleteCustomerInRust(id: string) {
  await callRustBackend<void>(`/api/pelanggan/${id}`, {
    method: "DELETE",
    headers: {},
  });
}

export async function listContractsFromRust(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.pageSize) query.append("page_size", String(params.pageSize));
  if (params?.search) query.append("search", params.search);

  const queryString = query.toString();
  const path = `/api/kontrak-lengkap${queryString ? `?${queryString}` : ""}`;

  const result = await callRustBackend<RustKontrakLengkapListResponse>(path);

  return {
    data: result.data.map((r) => mapContract(r)),
    meta: result.meta,
  };
}

export async function getContractByIdFromRust(id: string | number) {
  const result = await callRustBackend<RustDetailResponse<RustKontrakLengkap>>(`/api/kontrak-lengkap/${id}`);
  return mapContract(result.data);
}

export async function createContractInRust(payload: ContractCreateInput) {
  const result = await callRustBackend<RustDetailResponse<RustKontrakLengkap>>("/api/kontrak-lengkap", {
    method: "POST",
    body: JSON.stringify(mapContractPayload(payload, {
      includePelangganId: true,
      includeLinkFolder: true,
      includeAlasan: false,
    })),
  });
  return mapContract(result.data);
}

export async function updateContractInRust(id: string | number, payload: ContractCreateInput) {
  const result = await callRustBackend<RustDetailResponse<RustKontrakLengkap>>(`/api/kontrak-lengkap/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapContractPayload(payload, {
      includePelangganId: true,
      includeLinkFolder: true,
      includeAlasan: false,
    })),
  });
  return mapContract(result.data);
}

export async function deleteContractInRust(id: string | number) {
  await callRustBackend<void>(`/api/kontrak-lengkap/${id}`, {
    method: "DELETE",
  });
}

export async function renewContractInRust(id: string | number, payload: ContractRenewInput) {
  const result = await callRustBackend<RustDetailResponse<RustKontrakLengkap>>(`/api/kontrak-lengkap/${id}/perpanjang`, {
    method: "POST",
    body: JSON.stringify(mapContractPayload(payload as ContractPayload, {
      includePelangganId: false,
      includeLinkFolder: false,
      includeAlasan: false,
    })),
  });
  return mapContract(result.data);
}

export async function upgradeContractInRust(id: string | number, payload: ContractRenewInput & { alasanPerubahan?: string }) {
  const result = await callRustBackend<RustDetailResponse<RustKontrakLengkap>>(`/api/kontrak-lengkap/${id}/upgrade`, {
    method: "POST",
    body: JSON.stringify(mapContractPayload(payload as ContractPayload, {
      includePelangganId: false,
      includeLinkFolder: false,
      includeAlasan: true,
    })),
  });
  return mapContract(result.data);
}
