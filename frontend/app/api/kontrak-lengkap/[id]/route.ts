import { NextResponse, NextRequest } from "next/server";

import {
  RustBackendHttpError,
  getContractByIdFromRust,
  updateContractInRust,
  deleteContractInRust,
} from "@/lib/rust-backend";
import type { ApiError, ApiSuccess, ContractRecord, ContractUpdateInput } from "@/lib/customer-types";

function toErrorResponse(error: unknown) {
  if (error instanceof RustBackendHttpError) {
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
        message: error instanceof Error ? error.message : "Terjadi kesalahan internal pada server Next.js.",
      },
    },
    { status: 500 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getContractByIdFromRust(id);

    return NextResponse.json<ApiSuccess<ContractRecord>>({
      success: true,
      data,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ContractUpdateInput;
    const data = await updateContractInRust(id, body);

    return NextResponse.json<ApiSuccess<ContractRecord>>({
      success: true,
      data,
      message: "Kontrak berhasil diperbarui.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteContractInRust(id);

    return NextResponse.json<ApiSuccess<null>>({
      success: true,
      data: null,
      message: "Kontrak berhasil dihapus.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
