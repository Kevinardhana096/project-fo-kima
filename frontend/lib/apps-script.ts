import "server-only";

import type { ContractRecord, CustomerCreateInput, CustomerRecord, CustomerUpdateInput } from "./customer-types";

type AppsScriptSuccess<T> = {
  success: true;
  status: number;
  message?: string;
  data: T;
};

type AppsScriptFailure = {
  success: false;
  status?: number;
  error?: {
    code?: string;
    message?: string;
  };
};

type AppsScriptResponse<T> = AppsScriptSuccess<T> | AppsScriptFailure;

class AppsScriptHttpError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "apps_script_error") {
    super(message);
    this.name = "AppsScriptHttpError";
    this.status = status;
    this.code = code;
  }
}

function getAppsScriptConfig() {
  const baseUrl = process.env.APPS_SCRIPT_BASE_URL;
  const secret = process.env.APPS_SCRIPT_INTERNAL_SECRET;

  if (!baseUrl) {
    throw new AppsScriptHttpError(
      "APPS_SCRIPT_BASE_URL belum diisi pada environment frontend.",
      500,
      "missing_apps_script_base_url",
    );
  }

  if (!secret) {
    throw new AppsScriptHttpError(
      "APPS_SCRIPT_INTERNAL_SECRET belum diisi pada environment frontend.",
      500,
      "missing_apps_script_internal_secret",
    );
  }

  return { baseUrl, secret };
}

function sanitizeAppsScriptText(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/^\)\]\}'\s*/, "")
    .trim();
}

function buildInvalidResponseMessage(response: Response, body: string) {
  const contentType = response.headers.get("content-type") || "unknown";
  const preview = body.replace(/\s+/g, " ").slice(0, 140);

  if (contentType.includes("text/html")) {
    return `Apps Script mengembalikan HTML, bukan JSON. Periksa URL deploy Web App pada APPS_SCRIPT_BASE_URL. Status ${response.status} dari ${response.url}.`;
  }

  return `Response Apps Script tidak valid. Status ${response.status}, content-type ${contentType}, url ${response.url}, preview: ${preview || "-"}.`;
}

async function parseAppsScriptResponse<T>(response: Response): Promise<AppsScriptSuccess<T>> {
  const text = sanitizeAppsScriptText(await response.text());
  let payload: AppsScriptResponse<T>;

  try {
    payload = JSON.parse(text) as AppsScriptResponse<T>;
  } catch {
    throw new AppsScriptHttpError(
      buildInvalidResponseMessage(response, text),
      502,
      "invalid_apps_script_response",
    );
  }

  if (!payload.success) {
    throw new AppsScriptHttpError(
      payload.error?.message || "Apps Script mengembalikan error.",
      payload.status || 500,
      payload.error?.code || "apps_script_error",
    );
  }

  return payload;
}

async function callAppsScriptGet<T>(query: Record<string, string>) {
  const { baseUrl, secret } = getAppsScriptConfig();
  const url = new URL(baseUrl);

  Object.entries({ ...query, token: secret }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  return parseAppsScriptResponse<T>(response);
}

async function callAppsScriptPost<T>(body: Record<string, unknown>) {
  const { baseUrl, secret } = getAppsScriptConfig();

  const response = await fetch(baseUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      token: secret,
    }),
  });

  return parseAppsScriptResponse<T>(response);
}

export async function listCustomers() {
  return callAppsScriptGet<CustomerRecord[]>({
    resource: "customers",
  });
}

export async function getCustomerById(id: string) {
  return callAppsScriptGet<CustomerRecord>({
    resource: "customers",
    id,
  });
}

export async function createCustomer(input: CustomerCreateInput) {
  return callAppsScriptPost<CustomerRecord>({
    action: "create_customer",
    ...input,
  });
}

export async function updateCustomer(input: CustomerUpdateInput) {
  return callAppsScriptPost<CustomerRecord>({
    action: "update_customer",
    ...input,
  });
}

export async function deleteCustomer(id: string) {
  return callAppsScriptPost<CustomerRecord>({
    action: "delete_customer",
    id,
  });
}

export async function listContracts() {
  return callAppsScriptGet<ContractRecord[]>({
    resource: "contracts",
  });
}

export async function getContractById(id: string) {
  return callAppsScriptGet<ContractRecord>({
    resource: "contracts",
    id,
  });
}

export { AppsScriptHttpError };
