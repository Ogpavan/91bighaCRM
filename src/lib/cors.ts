import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:5173",
  "https://crm.91bigha.com",
  "https://91bigha.com"
];

function getConfiguredOrigins() {
  const configured = process.env.CORS_ALLOWED_ORIGIN?.trim();
  if (!configured) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getAllowedOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = getConfiguredOrigins();

  if (allowedOrigins.includes("*")) {
    return requestOrigin || "*";
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0];
}

export function setCorsHeaders(headers: Headers, request: Request) {
  const origin = getAllowedOrigin(request);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Vary", "Origin");
}

export function withCors(response: NextResponse, request: Request) {
  setCorsHeaders(response.headers, request);
  return response;
}

export function createCorsPreflightResponse(request: Request) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}
