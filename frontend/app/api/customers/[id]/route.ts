import { NextResponse } from "next/server";

import { AppsScriptHttpError, deleteCustomer, getCustomerById, updateCustomer } from "@/lib/apps-script";
import type { ApiError, ApiSuccess, CustomerRecord, CustomerUpdateInput, CustomerUploadItem } from "@/lib/customer-types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedUploadMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);
const allowedUploadExtensions = new Set([".pdf", ".xlsx", ".docx", ".jpg", ".jpeg", ".png"]);
const allowedUploadCategories = new Set(["Kontrak", "BAK-PKS", "Dokumen Lain"]);
const maxUploadSize = 10 * 1024 * 1024;

function toErrorResponse(error: unknown) {
  if (error instanceof AppsScriptHttpError) {
    return NextResponse.json<ApiError>(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  return NextResponse.json<ApiError>(
    {
      success: false,
      error: {
        code: "internal_error",
        message: "Terjadi kesalahan internal pada server Next.js.",
      },
    },
    { status: 500 },
  );
}

function invalidPayload(message: string) {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: {
        code: "invalid_payload",
        message,
      },
    },
    { status: 400 },
  );
}

function hasAllowedUploadFileType(mimeType: string, fileName: string) {
  const lowerFileName = fileName.toLowerCase();
  return allowedUploadMimeTypes.has(mimeType) || [...allowedUploadExtensions].some((extension) => lowerFileName.endsWith(extension));
}

function normalizeUploadItems(uploadItems: unknown): CustomerUploadItem[] {
  if (!Array.isArray(uploadItems)) return [];

  return uploadItems.map((item, index) => {
    const uploadItem = item as Partial<CustomerUploadItem>;
    const jenisBerkas = String(uploadItem.jenisBerkas || "").trim();
    const namaFile = String(uploadItem.namaFile || "").trim();
    const originalFileName = String(uploadItem.originalFileName || "").trim();
    const mimeType = String(uploadItem.mimeType || "").trim();
    const base64Data = String(uploadItem.base64Data || "").trim();
    const size = Number(uploadItem.size || 0);
    const label = `Berkas #${index + 1}`;

    if (!jenisBerkas || !allowedUploadCategories.has(jenisBerkas)) {
      throw new Error(`${label}: jenis berkas tidak valid.`);
    }

    if (!namaFile) {
      throw new Error(`${label}: nama file wajib diisi.`);
    }

    if (!originalFileName) {
      throw new Error(`${label}: nama file asli tidak valid.`);
    }

    if (!hasAllowedUploadFileType(mimeType, originalFileName)) {
      throw new Error(`${label}: tipe file tidak didukung.`);
    }

    if (!base64Data) {
      throw new Error(`${label}: data file kosong.`);
    }

    if (!Number.isFinite(size) || size <= 0 || size > maxUploadSize) {
      throw new Error(`${label}: ukuran file maksimal 10 MB.`);
    }

    return {
      jenisBerkas,
      namaFile,
      originalFileName,
      mimeType,
      base64Data,
      size,
    };
  });
}

function normalizeDeleteFileIds(fileIds: unknown) {
  if (!Array.isArray(fileIds)) return [];
  return fileIds
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await getCustomerById(decodeURIComponent(id));

    return NextResponse.json<ApiSuccess<CustomerRecord>>({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteCustomer(decodeURIComponent(id));

    return NextResponse.json<ApiSuccess<CustomerRecord>>({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<CustomerUpdateInput>;
    const namaPelanggan = String(payload.namaPelanggan || "").trim();

    if (!namaPelanggan) {
      return invalidPayload("Nama pelanggan wajib diisi.");
    }

    let uploadItems: CustomerUploadItem[];
    try {
      uploadItems = normalizeUploadItems(payload.uploadItems);
    } catch (error) {
      return invalidPayload(error instanceof Error ? error.message : "Berkas pelanggan tidak valid.");
    }

    const deleteFileIds = normalizeDeleteFileIds(payload.deleteFileIds);

    const result = await updateCustomer({
      id: decodeURIComponent(id),
      kodePelanggan: String(payload.kodePelanggan || "").trim(),
      namaPelanggan,
      pic: String(payload.pic || "").trim(),
      telepon: String(payload.telepon || "").trim(),
      email: String(payload.email || "").trim(),
      keterangan: String(payload.keterangan || "").trim(),
      deleteFileIds,
      uploadItems,
    });

    return NextResponse.json<ApiSuccess<CustomerRecord>>({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
