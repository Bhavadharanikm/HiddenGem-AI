import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

type ApiError =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS: Record<ApiError, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({
    data,
    meta: { request_id: nanoid(10), timestamp: new Date().toISOString(), ...meta },
  });
}

export function paginated<T>(
  data: T[],
  cursor: string | null,
  hasMore: boolean
) {
  return NextResponse.json({
    data,
    meta: {
      request_id: nanoid(10),
      timestamp: new Date().toISOString(),
      cursor,
      has_more: hasMore,
    },
  });
}

export function error(code: ApiError, message: string) {
  return NextResponse.json(
    { error: { code, message, request_id: nanoid(10) } },
    { status: STATUS[code] }
  );
}
