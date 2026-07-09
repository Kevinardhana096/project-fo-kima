import { NextResponse } from "next/server";

import { RustBackendHttpError, getContractByIdFromRust } from "@/lib/rust-backend";
import type { ApiError, ApiSuccess, ContractRecord } from "@/lib/customer-types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await getContractByIdFromRust(decodeURIComponent(id));

    return NextResponse.json<ApiSuccess<ContractRecord>>({
      success: true,
      data: result,
      message: "Detail kontrak berhasil dimuat.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
