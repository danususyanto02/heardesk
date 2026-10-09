import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { trustedOrigin } from "@/lib/validation";
import { env } from "./env";
import { CompanyAccessError } from "@/modules/companies/domain/access";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

export function assertOrigin(request: Request) {
  if (!trustedOrigin(request.headers.get("origin"), env().APP_URL)) {
    throw new HttpError(403, "Origin request tidak diizinkan.");
  }
}

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: privateHeaders });
}

const CODE_RESPONSES: Record<string, { status: number; message: string }> = {
  ACCOUNT_SUSPENDED: { status: 403, message: "Account suspended. Contact HearDesk support." },
  PLATFORM_OWNER_PROTECTED: {
    status: 403,
    message: "Platform Owner accounts cannot be suspended here.",
  },
  EMAIL_NOT_VERIFIED: { status: 403, message: "Verify your email before continuing." },
  PLATFORM_FORBIDDEN: { status: 403, message: "Platform Owner access required." },
  PLATFORM_INPUT_INVALID: { status: 400, message: "Check the limits, reason and action details." },
  PLATFORM_NOT_FOUND: { status: 404, message: "Company not found." },
  PLATFORM_CONFLICT: { status: 409, message: "Company changed. Reload before trying again." },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    message: "Creation key already used. Start a new Company request.",
  },
  UPLOAD_CAPACITY_UNAVAILABLE: {
    status: 503,
    message: "Upload capacity unavailable. Try again later.",
  },
  WIDGET_NOT_FOUND: { status: 404, message: "Widget not found." },
  STALE_KEY: { status: 409, message: "Key changed. Reload before trying again." },
  COMPANY_QUOTA_EXCEEDED: { status: 422, message: "Company allowance exhausted." },
  COMPANY_SUSPENDED: {
    status: 403,
    message: "Submission cannot be accepted. Try again later.",
  },
  SUBMISSION_CONFLICT: {
    status: 409,
    message: "Submission cannot be accepted. Try again later.",
  },
  SUBMISSION_IN_PROGRESS: {
    status: 409,
    message: "Submission cannot be accepted. Try again later.",
  },
  RESERVATION_INVALID: {
    status: 409,
    message: "Submission cannot be accepted. Try again later.",
  },
};

function errorCode(error: unknown): string | null {
  if (error instanceof Error && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return null;
}

function companyAccessResponse(error: CompanyAccessError, requestId: string) {
  const notFound = error.code === "RESOURCE_NOT_FOUND" || error.code === "COMPANY_NOT_FOUND";
  let status = 403;
  if (notFound) {
    status = 404;
  } else if (error.code === "UNAUTHENTICATED") {
    status = 401;
  }
  const message = notFound ? "Resource not found." : "Company access denied.";
  return json({ error: { code: error.code, message, requestId } }, status);
}

export function failure(error: unknown) {
  const id = randomUUID();

  if (error instanceof CompanyAccessError && error.code !== "EMAIL_NOT_VERIFIED") {
    return companyAccessResponse(error, id);
  }

  const code = errorCode(error);
  if (code && Object.hasOwn(CODE_RESPONSES, code)) {
    const { status, message } = CODE_RESPONSES[code];
    return json({ error: { code, message, requestId: id } }, status);
  }

  if (error instanceof CompanyAccessError) {
    return companyAccessResponse(error, id);
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Periksa isian formulir.",
          fields: error.flatten().fieldErrors,
          requestId: id,
        },
      },
      400,
    );
  }

  if (error instanceof HttpError) {
    return json(
      { error: { code: error.code, message: error.message, requestId: id } },
      error.status,
    );
  }

  console.error(
    JSON.stringify({
      requestId: id,
      operation: "request_failed",
      type: error instanceof Error ? error.name : "Unknown",
    }),
  );
  return json(
    { error: { code: "INTERNAL_ERROR", message: "Permintaan gagal. Coba lagi.", requestId: id } },
    503,
  );
}

export async function boundedBytes(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > limit) {
    throw new HttpError(413, "Request terlalu besar.");
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return Buffer.alloc(0);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "Request terlalu besar.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function readJson(request: Request, limit = 32768) {
  try {
    return JSON.parse((await boundedBytes(request, limit)).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(400, "JSON tidak valid.");
  }
}
