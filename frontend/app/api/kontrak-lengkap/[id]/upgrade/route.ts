import { NextResponse, NextRequest } from "next/server";

import { RustBackendHttpError, upgradeContractInRust } from "@/lib/rust-backend";
import type { ApiError, ApiSuccess, ContractRecord, ContractUpgradeInput } from "@/lib/customer-types";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ContractUpgradeInput;
    const data = await upgradeContractInRust(id, body);

    return NextResponse.json<ApiSuccess<ContractRecord>>({
      success: true,
      data,
      message: "Kontrak berhasil di-upgrade.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
