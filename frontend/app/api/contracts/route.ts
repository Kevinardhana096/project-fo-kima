import { NextResponse } from "next/server";

import { AppsScriptHttpError, listContracts } from "@/lib/apps-script";
import type { ApiError, ApiSuccess, ContractRecord } from "@/lib/customer-types";

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

export async function GET() {
  try {
    const result = await listContracts();

    return NextResponse.json<ApiSuccess<ContractRecord[]>>({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
