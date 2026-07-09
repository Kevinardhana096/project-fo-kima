import { NextResponse, NextRequest } from "next/server";

import { RustBackendHttpError, listContractsFromRust, createContractInRust } from "@/lib/rust-backend";
import type { ApiError, ApiSuccess, ContractRecord, ContractCreateInput } from "@/lib/customer-types";

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const pageSize = searchParams.get("page_size") ? parseInt(searchParams.get("page_size")!, 10) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listContractsFromRust({ page, pageSize, search });

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContractCreateInput;
    const result = await createContractInRust(body);

    return NextResponse.json<ApiSuccess<ContractRecord>>({
      success: true,
      data: result,
      message: "Kontrak berhasil dibuat.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
