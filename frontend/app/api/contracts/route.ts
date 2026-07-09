import { NextResponse } from "next/server";

import { RustBackendHttpError, listContractsFromRust } from "@/lib/rust-backend";
import type { ApiError, ApiSuccess, ContractRecord } from "@/lib/customer-types";

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
        message: "Terjadi kesalahan internal pada server Next.js.",
      },
    },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const result = await listContractsFromRust();

    return NextResponse.json<ApiSuccess<ContractRecord[]>>({
      success: true,
      data: result.data,
      meta: result.meta,
      message: "Data kontrak berhasil dimuat.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
