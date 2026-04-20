import { NextRequest } from "next/server";
import { createCorsPreflightResponse, setCorsHeaders } from "@/lib/cors";
import {
  AuthError,
  ensureCrmAuthSchema,
  getRoleByName,
  hashPassword,
  requireAuth,
  requirePermission
} from "@/lib/crm-auth";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import {
  addLeadFollowup,
  addLeadVisit,
  createLead,
  deleteLead,
  ensureCrmLeadsSchema,
  getLeadById,
  getLeadsMetadata,
  listLeadActivities,
  listLeadFollowups,
  listLeadVisits,
  listLeads,
  updateLead
} from "@/lib/crm-leads";
import { importLeadsFromFile, previewLeadImport } from "@/lib/crm-leads-import";
import {
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  getTaskMeta,
  getTaskSummary,
  listTasks,
  updateTask
} from "@/lib/crm-tasks";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotificationEvents
} from "@/lib/crm-notifications";
import { searchGlobal } from "@/lib/global-search";
import {
  getAgentPerformanceReport,
  getLeadSummaryReport,
  getProjectPerformanceReport,
  getSalesSummaryReport,
  getSourcePerformanceReport,
  getTaskSummaryReport,
  parseReportFilters
} from "@/lib/report-aggregates";
import { createProjectEntity, listProjectsEntity, updateProjectEntity } from "@/lib/projects-entity";
import {
  createProperty,
  getApiPropertyById,
  getPropertyTypeOptions,
  hardDeletePropertyById,
  listApiPropertyFilterOptions,
  listApiPropertiesPaginated,
  listActiveLocalitiesForFooter,
  updatePropertyById
} from "@/lib/properties";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";
import { withDbClient } from "@/lib/db";
import { jsonResponse } from "@/lib/api-response";
import { getUploadsSubpath, resolveUploadRequestPath } from "@/lib/uploads";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import * as XLSX from "xlsx";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};
function notFound(request: Request) {
  return jsonResponse({ success: false, message: "Not found." }, 404, request);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid JSON payload.");
  }
}

async function parseForm(request: Request) {
  try {
    return await request.formData();
  } catch {
    throw new Error("Invalid form payload.");
  }
}

function ensureNumber(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAreaValue(value: unknown) {
  if (value === null || value === undefined) {
    return { amount: null as number | null, unit: null as string | null };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: value, unit: null };
  }

  if (typeof value !== "string") {
    return { amount: null as number | null, unit: null as string | null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { amount: null as number | null, unit: null as string | null };
  }

  const numeric = Number(trimmed.replace(/,/g, ""));
  if (Number.isFinite(numeric)) {
    return { amount: numeric, unit: null };
  }

  const match = trimmed.match(/([\d,.]+)\s*(sq\.?\s*ft|sqft|sq\.?\s*m|sqm|sq\.?\s*yd|sqyd|sq\.?\s*yards?)/i);
  if (!match) {
    return { amount: null as number | null, unit: null as string | null };
  }

  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) {
    return { amount: null as number | null, unit: null as string | null };
  }

  const unitRaw = match[2].toLowerCase().replace(/\s+/g, "");
  let unit = "sqft";
  if (unitRaw.includes("sqyd") || unitRaw.includes("yard")) {
    unit = "sqyd";
  } else if (unitRaw.includes("sqm") || unitRaw.includes("sq.m")) {
    unit = "sqm";
  }

  return { amount, unit };
}

function toOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "0"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function toImageSourceList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const urls: string[] = [];

  for (const entry of values) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    const parts = trimmed
      .split(/\r?\n|\|/g)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts.length ? parts : [trimmed]) {
      const matches = part.match(/https?:\/\/[^\s|]+/gi);
      if (matches?.length) {
        for (const match of matches) {
          urls.push(match.trim());
        }
        continue;
      }

      const normalized = part.replace(/^['"]|['"]$/g, "");
      if (normalized.startsWith("/uploads/")) {
        urls.push(normalized);
      } else if (normalized.startsWith("uploads/")) {
        urls.push(`/${normalized}`);
      }
    }
  }

  return Array.from(new Set(urls));
}

function normalizeListingType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["buy", "sale", "sell", "resale", "for sale"].includes(normalized)) {
    return "sale";
  }
  if (["rent", "lease", "for rent"].includes(normalized)) {
    return "rent";
  }
  return null;
}

function isLikelyAreaValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (/^\d+(\.\d+)?\s*(sq\.?\s*ft|sqft|sq\.?\s*yd|sqyd|sqm|sq\.?\s*m|acre)s?$/i.test(normalized)) {
    return true;
  }
  return /^\d+(\.\d+)?$/.test(normalized);
}

function normalizeFacingValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const valid = new Set([
    "north",
    "south",
    "east",
    "west",
    "north east",
    "north west",
    "south east",
    "south west",
    "northeast",
    "northwest",
    "southeast",
    "southwest"
  ]);
  return valid.has(normalized) ? value.trim() : null;
}

async function saveUploadedImage(file: File, folder = "properties") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  if (!Object.hasOwn(uploadContentTypes, `.${ext}`)) {
    throw new Error(`Unsupported image type for ${file.name}.`);
  }

  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const targetDir = getUploadsSubpath(folder);
  const targetPath = path.join(targetDir, filename);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${filename}`;
}

const uploadMimeToExt: Record<string, string> = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp"
};

function inferImageExtension(urlValue: string, mimeType: string | null) {
  try {
    const parsedUrl = new URL(urlValue);
    const urlExt = path.extname(parsedUrl.pathname).toLowerCase();
    if (Object.hasOwn(uploadContentTypes, urlExt)) {
      return urlExt;
    }
  } catch {
    // ignore invalid URL parsing and fallback to mime/default extension
  }

  if (mimeType) {
    const normalizedType = mimeType.split(";")[0].trim().toLowerCase();
    const ext = uploadMimeToExt[normalizedType];
    if (ext) {
      return ext;
    }
  }

  return ".jpg";
}

async function saveRemoteImageUrl(remoteUrl: string, folder = "properties") {
  const parsed = new URL(remoteUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported image URL protocol: ${remoteUrl}`);
  }

  const response = await fetch(remoteUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}) from ${remoteUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error(`Downloaded image is empty: ${remoteUrl}`);
  }

  const ext = inferImageExtension(remoteUrl, response.headers.get("content-type"));
  if (!Object.hasOwn(uploadContentTypes, ext)) {
    throw new Error(`Unsupported downloaded image type for ${remoteUrl}`);
  }

  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  const targetDir = getUploadsSubpath(folder);
  const targetPath = path.join(targetDir, filename);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);
  return `/uploads/${folder}/${filename}`;
}

async function parsePropertyPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return parseJson<Record<string, unknown>>(request);
  }

  const form = await parseForm(request);
  const coverImageFile = form.get("coverImage");
  const galleryFiles = form
    .getAll("galleryImages")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const parseOptionalList = (value: unknown) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim());
      }
    } catch {
      // ignore
    }

    return trimmed
      .split(/[\n,]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const baseCoverImageUrl = toOptionalString(form.get("coverImageUrl")) ?? undefined;
  const baseImageUrls = parseOptionalList(form.get("imageUrls"));
  const baseFeatures = parseOptionalList(form.get("features"));

  const payload: Record<string, unknown> = {
    title: toOptionalString(form.get("title")),
    description: toOptionalString(form.get("description")) ?? undefined,
    listingType: toOptionalString(form.get("listingType")),
    propertyType: toOptionalString(form.get("propertyType")),
    locality: toOptionalString(form.get("locality")),
    country: toOptionalString(form.get("country")) ?? undefined,
    city: toOptionalString(form.get("city")) ?? undefined,
    state: toOptionalString(form.get("state")) ?? undefined,
    subLocality: toOptionalString(form.get("subLocality")) ?? undefined,
    addressLine1: toOptionalString(form.get("addressLine1")) ?? undefined,
    addressLine2: toOptionalString(form.get("addressLine2")) ?? undefined,
    landmark: toOptionalString(form.get("landmark")) ?? undefined,
    pincode: toOptionalString(form.get("pincode")) ?? undefined,
    status: toOptionalString(form.get("status")) ?? undefined,
    possessionStatus: toOptionalString(form.get("possessionStatus")) ?? undefined,
    facing: toOptionalString(form.get("facing")) ?? undefined,
    latitude: toOptionalNumber(form.get("latitude")) ?? undefined,
    longitude: toOptionalNumber(form.get("longitude")) ?? undefined,
    priceAmount: toOptionalNumber(form.get("priceAmount")) ?? undefined,
    rentAmount: toOptionalNumber(form.get("rentAmount")) ?? undefined,
    securityDeposit: toOptionalNumber(form.get("securityDeposit")) ?? undefined,
    maintenanceAmount: toOptionalNumber(form.get("maintenanceAmount")) ?? undefined,
    priceLabel: toOptionalString(form.get("priceLabel")) ?? undefined,
    bedrooms: toOptionalNumber(form.get("bedrooms")) ?? undefined,
    bathrooms: toOptionalNumber(form.get("bathrooms")) ?? undefined,
    balconies: toOptionalNumber(form.get("balconies")) ?? undefined,
    floorNumber: toOptionalNumber(form.get("floorNumber")) ?? undefined,
    floorsTotal: toOptionalNumber(form.get("floorsTotal")) ?? undefined,
    builtupArea: toOptionalNumber(form.get("builtupArea")) ?? undefined,
    builtupAreaUnit: toOptionalString(form.get("builtupAreaUnit")) ?? undefined,
    carpetArea: toOptionalNumber(form.get("carpetArea")) ?? undefined,
    plotArea: toOptionalNumber(form.get("plotArea")) ?? undefined,
    parkingCount: toOptionalNumber(form.get("parkingCount")) ?? undefined,
    furnishingStatus: toOptionalString(form.get("furnishingStatus")) ?? undefined,
    ageOfProperty: toOptionalNumber(form.get("ageOfProperty")) ?? undefined,
    coverImageUrl: baseCoverImageUrl,
    imageUrls: baseImageUrls,
    features: baseFeatures,
    source: toOptionalString(form.get("source")) ?? undefined,
    isFeatured: toOptionalBoolean(form.get("isFeatured")) ?? undefined,
    isVerified: toOptionalBoolean(form.get("isVerified")) ?? undefined
  };

  let uploadedCoverUrl: string | null = null;
  let uploadedGalleryUrls: string[] = [];
  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    uploadedCoverUrl = await saveUploadedImage(coverImageFile);
  }

  if (galleryFiles.length) {
    uploadedGalleryUrls = await Promise.all(galleryFiles.map((file) => saveUploadedImage(file)));
  }

  if (uploadedCoverUrl) {
    payload.coverImageUrl = uploadedCoverUrl;
  }

  if (uploadedGalleryUrls.length) {
    payload.imageUrls = uploadedGalleryUrls;
  }

  return payload;
}

function buildErrorResponse(error: unknown, request: Request) {
  if (error instanceof AuthError) {
    return jsonResponse({ success: false, message: error.message }, error.status, request);
  }

  const message = error instanceof Error ? error.message : "Request failed.";
  return jsonResponse({ success: false, message }, 500, request);
}

const uploadContentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function getUploadContentType(filePath: string) {
  return uploadContentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function handleUploads(request: Request, method: string, segments: string[]) {
  if (method !== "GET" || segments.length < 2) {
    return notFound(request);
  }

  try {
    const filePath = resolveUploadRequestPath(segments.slice(1));
    const file = await fs.readFile(filePath);

    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": getUploadContentType(filePath)
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function handleDashboard(request: Request, method: string) {
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  const auth = requireAuth(request);
  const summary = await getDashboardSummary({
    userId: auth.userId,
    role: auth.role,
    permissions: auth.permissions
  });

  return jsonResponse({ success: true, summary }, 200, request);
}

function parseLeadFilters(request: Request) {
  const url = new URL(request.url);
  return {
    page: ensureNumber(url.searchParams.get("page"), 1),
    limit: ensureNumber(url.searchParams.get("limit"), 20),
    status: url.searchParams.get("status"),
    assignedTo: null,
    telecaller: url.searchParams.get("telecaller"),
    source: url.searchParams.get("source"),
    project: url.searchParams.get("project"),
    fromDate: url.searchParams.get("fromDate"),
    toDate: url.searchParams.get("toDate"),
    search: url.searchParams.get("search")
  };
}

async function handleLeads(request: Request, method: string, segments: string[]) {
  const auth = requireAuth(request);

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_leads");
      const filters = parseLeadFilters(request);
      const data = await listLeads(filters, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items: data.items, pagination: data.pagination }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "create_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const lead = await createLead(payload, auth.userId);
      return jsonResponse({ success: true, lead }, 201, request);
    }
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  if (segments[2] === "meta" && method === "GET") {
    requirePermission(request, "view_leads");
    const meta = await getLeadsMetadata();
    return jsonResponse(
      {
        success: true,
        statuses: meta.statuses,
        sources: meta.sources,
        telecallers: meta.telecallers,
        projects: meta.projects
      },
      200,
      request
    );
  }

  if (segments[2] === "import") {
    requirePermission(request, "create_leads");
    if (segments[3] === "preview" && method === "POST") {
      const form = await parseForm(request);
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonResponse({ success: false, message: "File is required." }, 400, request);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const preview = await previewLeadImport(buffer);
      return jsonResponse({ success: true, ...preview }, 200, request);
    }

    if (!segments[3] && method === "POST") {
      const form = await parseForm(request);
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonResponse({ success: false, message: "File is required." }, 400, request);
      }

      const mappings: Partial<Record<string, string>> = {};
      for (const [key, value] of form.entries()) {
        if (key.startsWith("mapping_") && typeof value === "string") {
          mappings[key.replace("mapping_", "")] = value;
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await importLeadsFromFile({
        fileBuffer: buffer,
        mappings,
        defaultSourceId: form.get("defaultSourceId") ? Number(form.get("defaultSourceId")) : null,
        defaultStatusId: form.get("defaultStatusId") ? Number(form.get("defaultStatusId")) : null,
        actorUserId: auth.userId
      });

      return jsonResponse(
        {
          success: true,
          importedCount: result.importedCount,
          failedCount: result.failedCount,
          errors: result.errors,
          message: result.failedCount ? "Some rows failed to import." : "Import completed."
        },
        200,
        request
      );
    }
  }

  const leadId = segments[2];
  if (!leadId) {
    return notFound(request);
  }

  if (segments.length === 3) {
    if (method === "GET") {
      requirePermission(request, "view_leads");
      const lead = await getLeadById(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, lead }, 200, request);
    }
    if (method === "PUT") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const lead = await updateLead(leadId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, lead }, 200, request);
    }
    if (method === "DELETE") {
      requirePermission(request, "delete_leads");
      await deleteLead(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, message: "Lead deleted." }, 200, request);
    }
  }

  if (segments[3] === "followups") {
    requirePermission(request, "view_leads");
    if (method === "GET") {
      const items = await listLeadFollowups(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const followup = await addLeadFollowup(leadId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, followup }, 201, request);
    }
  }

  if (segments[3] === "visits") {
    requirePermission(request, "view_leads");
    if (method === "GET") {
      const items = await listLeadVisits(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const visit = await addLeadVisit(leadId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, visit }, 201, request);
    }
  }

  if (segments[3] === "activities" && method === "GET") {
    requirePermission(request, "view_leads");
    const items = await listLeadActivities(leadId, { userId: auth.userId, role: auth.role });
    return jsonResponse({ success: true, items }, 200, request);
  }

  return notFound(request);
}
function parseTaskFilters(request: Request) {
  const url = new URL(request.url);
  return {
    page: ensureNumber(url.searchParams.get("page"), 1),
    limit: ensureNumber(url.searchParams.get("limit"), 20),
    assignedTo: url.searchParams.get("assignedTo"),
    status: url.searchParams.get("status"),
    priority: url.searchParams.get("priority"),
    type: url.searchParams.get("type"),
    fromDate: url.searchParams.get("fromDate"),
    toDate: url.searchParams.get("toDate"),
    leadId: url.searchParams.get("leadId"),
    projectId: url.searchParams.get("projectId")
  };
}

async function handleTasks(request: Request, method: string, segments: string[]) {
  const auth = requireAuth(request);

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_tasks");
      const filters = parseTaskFilters(request);
      const data = await listTasks(filters, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items: data.items, pagination: data.pagination }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "create_tasks");
      const payload = await parseJson<Record<string, unknown>>(request);
      const task = await createTask(payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, task }, 201, request);
    }
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  if (segments[2] === "summary" && method === "GET") {
    requirePermission(request, "view_tasks");
    const summary = await getTaskSummary({ userId: auth.userId, role: auth.role });
    return jsonResponse({ success: true, summary }, 200, request);
  }

  if (segments[2] === "meta" && method === "GET") {
    requirePermission(request, "view_tasks");
    const meta = await getTaskMeta();
    return jsonResponse({ success: true, ...meta }, 200, request);
  }

  const taskId = segments[2];
  if (!taskId) {
    return notFound(request);
  }

  if (segments.length === 3) {
    if (method === "GET") {
      requirePermission(request, "view_tasks");
      const task = await getTaskById(taskId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, task }, 200, request);
    }
    if (method === "PUT") {
      requirePermission(request, "edit_tasks");
      const payload = await parseJson<Record<string, unknown>>(request);
      const task = await updateTask(taskId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, task }, 200, request);
    }
    if (method === "DELETE") {
      requirePermission(request, "delete_tasks");
      await deleteTask(taskId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, message: "Task deleted." }, 200, request);
    }
  }

  if (segments[3] === "complete" && method === "POST") {
    requirePermission(request, "edit_tasks");
    const task = await completeTask(taskId, { userId: auth.userId, role: auth.role });
    return jsonResponse({ success: true, task }, 200, request);
  }

  return notFound(request);
}

async function handleNotifications(request: Request, method: string, segments: string[]) {
  const auth = requireAuth(request);

  if (segments.length === 2 && method === "GET") {
    const url = new URL(request.url);
    const limit = ensureNumber(url.searchParams.get("limit"), 12);
    const data = await listNotifications(auth.userId, limit);
    return jsonResponse({ success: true, items: data.items, unreadCount: data.unreadCount }, 200, request);
  }

  if (segments[2] === "read-all" && method === "POST") {
    await markAllNotificationsRead(auth.userId);
    return jsonResponse({ success: true, message: "All notifications marked as read." }, 200, request);
  }

  if (segments[2] === "stream" && method === "GET") {
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    setCorsHeaders(headers, request);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (event: string, data: unknown) => {
          if (closed) {
            return;
          }
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const snapshot = await listNotifications(auth.userId, 12);
        send("snapshot", { items: snapshot.items, unreadCount: snapshot.unreadCount });

        const unsubscribe = subscribeToNotificationEvents(auth.userId, (event) => {
          send(event.type, event);
        });

        const heartbeat = setInterval(() => {
          send("heartbeat", { at: Date.now() });
        }, 15000);

        request.signal.addEventListener("abort", () => {
          if (closed) {
            return;
          }
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        });
      }
    });

    return new Response(stream, { headers });
  }

  const notificationId = segments[2];
  if (notificationId && segments[3] === "read" && method === "POST") {
    const notification = await markNotificationRead(notificationId, auth.userId);
    return jsonResponse({ success: true, notification }, 200, request);
  }

  return notFound(request);
}

async function handleProjectsEntity(request: Request, method: string, segments: string[]) {
  requirePermission(request, "view_leads");

  if (segments.length === 2) {
    if (method === "GET") {
      const items = await listProjectsEntity();
      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const project = await createProjectEntity(payload);
      return jsonResponse({ success: true, project }, 201, request);
    }
  }

  if (segments.length === 3) {
    const projectId = segments[2];
    if (method === "PATCH") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const project = await updateProjectEntity(projectId, payload);
      return jsonResponse({ success: true, project }, 200, request);
    }
  }

  return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
}

async function handleReports(request: Request, method: string, segments: string[]) {
  requirePermission(request, "view_reports");
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  const auth = requireAuth(request);
  const filters = parseReportFilters(request);

  switch (segments[2]) {
    case "lead-summary": {
      const report = await getLeadSummaryReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "source-performance": {
      const report = await getSourcePerformanceReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "agent-performance": {
      const report = await getAgentPerformanceReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "project-performance": {
      const report = await getProjectPerformanceReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "sales-summary": {
      const report = await getSalesSummaryReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "task-summary": {
      const report = await getTaskSummaryReport(filters, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, report }, 200, request);
    }
    default:
      return notFound(request);
  }
}

async function handleSearch(request: Request, method: string) {
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }
  const auth = requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const items = await searchGlobal(query, {
    userId: auth.userId,
    role: auth.role,
    permissions: auth.permissions
  });
  return jsonResponse({ success: true, items }, 200, request);
}

async function handleSettings(request: Request, method: string, segments: string[]) {
  if (segments[2] === "logo") {
    requirePermission(request, "manage_settings");
    if (method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
    }

    const form = await parseForm(request);
    const file = form.get("logo");
    if (!(file instanceof File)) {
      return jsonResponse({ success: false, message: "Logo file is required." }, 400, request);
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filename = `logo-${randomUUID()}.${ext}`;
    const brandingDir = getUploadsSubpath("branding");
    const targetPath = path.join(brandingDir, filename);
    await fs.mkdir(brandingDir, { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

    const settings = await updateAppSettings({ brand_logo_url: `/uploads/branding/${filename}` });
    return jsonResponse({ success: true, settings }, 200, request);
  }

  if (segments.length !== 2) {
    return notFound(request);
  }

  if (method === "GET") {
    requireAuth(request);
    const settings = await getAppSettings();
    return jsonResponse({ success: true, settings }, 200, request);
  }

  if (method === "PUT") {
    requirePermission(request, "manage_settings");
    const payload = await parseJson<Record<string, unknown>>(request);
    const settings = await updateAppSettings(payload);
    return jsonResponse({ success: true, settings }, 200, request);
  }

  return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
}
async function handleUsers(request: Request, method: string, segments: string[]) {
  await ensureCrmAuthSchema();
  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_users");
      const url = new URL(request.url);
      const page = ensureNumber(url.searchParams.get("page"), 1);
      const limit = ensureNumber(url.searchParams.get("limit"), 10);
      await ensureCrmAuthSchema();

      const offset = (page - 1) * limit;
      const data = await withDbClient(async (client) => {
        const [itemsResult, countResult] = await Promise.all([
          client.query<{
            id: string;
            name: string;
            email: string;
            phone: string | null;
            role_id: string;
            role: string;
            team_id: string | null;
            team_name: string | null;
            is_active: boolean;
            created_at: string;
          }>(
            `
              select
                u.id::text as id,
                u.name,
                u.email,
                u.phone,
                u.role_id::text as role_id,
                r.name as role,
                u.team_id::text as team_id,
                t.name as team_name,
                u.is_active,
                u.created_at::text as created_at
              from users u
              join roles r on r.id = u.role_id
              left join teams t on t.id = u.team_id
              order by u.created_at desc
              limit $1 offset $2
            `,
            [limit, offset]
          ),
          client.query<{ count: string }>("select count(*)::text as count from users")
        ]);

        const total = Number(countResult.rows[0]?.count ?? 0);
        return {
          items: itemsResult.rows.map((row) => ({
            id: row.id,
            fullName: row.name,
            email: row.email,
            phone: row.phone,
            roleId: Number(row.role_id),
            role: row.role,
            teamId: row.team_id,
            team: row.team_id ? { id: row.team_id, name: row.team_name || "" } : null,
            isActive: row.is_active,
            createdAt: row.created_at
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: total > 0 ? Math.ceil(total / limit) : 1
          }
        };
      });

      return jsonResponse({ success: true, items: data.items, pagination: data.pagination }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "manage_users");
      const payload = await parseJson<{
        fullName?: string;
        email?: string;
        phone?: string;
        password?: string;
        roleName?: string;
        teamId?: string;
        isActive?: boolean;
      }>(request);

      const fullName = String(payload.fullName || "").trim();
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const roleName = String(payload.roleName || "").trim();

      if (!fullName || !email || !password || !roleName) {
        return jsonResponse({ success: false, message: "Name, email, password, and role are required." }, 400, request);
      }

      const role = await getRoleByName(roleName);
      if (!role) {
        return jsonResponse({ success: false, message: "Role not found." }, 400, request);
      }

      const passwordHash = hashPassword(password);
      const user = await withDbClient(async (client) => {
        const existing = await client.query<{ id: string }>(
          "select id::text as id from users where lower(email) = lower($1) limit 1",
          [email]
        );
        if (existing.rows.length) {
          throw new Error("An account with this email already exists.");
        }

        const result = await client.query<{
          id: string;
          name: string;
          email: string;
          phone: string | null;
          role_id: string;
          role: string;
          team_id: string | null;
          created_at: string;
          is_active: boolean;
        }>(
          `
            insert into users (name, email, phone, role, role_id, team_id, is_active, password_hash)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning
              id::text as id,
              name,
              email,
              phone,
              role_id::text as role_id,
              role,
              team_id::text as team_id,
              is_active,
              created_at::text as created_at
          `,
          [fullName, email, payload.phone || null, role.name, String(role.id), payload.teamId ? Number(payload.teamId) : null, payload.isActive !== false, passwordHash]
        );

        return result.rows[0];
      });

      return jsonResponse(
        {
          success: true,
          user: {
            id: user.id,
            fullName: user.name,
            email: user.email,
            phone: user.phone,
            roleId: Number(user.role_id),
            role: user.role,
            teamId: user.team_id,
            team: null,
            isActive: user.is_active,
            createdAt: user.created_at
          }
        },
        201,
        request
      );
    }
  }

  const userId = segments[2];
  if (!userId) {
    return notFound(request);
  }

  if (method === "DELETE") {
    requirePermission(request, "manage_users");
    await withDbClient(async (client) => {
      await client.query("update users set is_active = false where id = $1", [Number(userId)]);
    });
    return jsonResponse({ success: true, message: "User disabled." }, 200, request);
  }

  if (method === "PUT") {
    requirePermission(request, "manage_users");
    const payload = await parseJson<{ roleName?: string }>(request);
    if (!payload.roleName) {
      return jsonResponse({ success: false, message: "Role is required." }, 400, request);
    }

    const role = await getRoleByName(payload.roleName);
    if (!role) {
      return jsonResponse({ success: false, message: "Role not found." }, 400, request);
    }

    const user = await withDbClient(async (client) => {
      const result = await client.query<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role_id: string;
        role: string;
        team_id: string | null;
        is_active: boolean;
        created_at: string;
      }>(
        `
          update users
          set role = $2, role_id = $3
          where id = $1
          returning
            id::text as id,
            name,
            email,
            phone,
            role_id::text as role_id,
            role,
            team_id::text as team_id,
            is_active,
            created_at::text as created_at
        `,
        [Number(userId), role.name, Number(role.id)]
      );

      if (!result.rows.length) {
        throw new Error("User not found.");
      }
      return result.rows[0];
    });

    return jsonResponse(
      {
        success: true,
        user: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          phone: user.phone,
          roleId: Number(user.role_id),
          role: user.role,
          teamId: user.team_id,
          team: null,
          isActive: user.is_active,
          createdAt: user.created_at
        }
      },
      200,
      request
    );
  }

  return notFound(request);
}

async function handleRoles(request: Request, method: string, segments: string[]) {
  await ensureCrmAuthSchema();

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "manage_users");
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; slug: string; user_count: string }>(
          `
            select
              r.id::text as id,
              r.name,
              r.slug,
              count(u.id)::text as user_count
            from roles r
            left join users u on u.role_id = r.id
            group by r.id
            order by r.name asc
          `
        );
        return result.rows;
      });

      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "manage_users");
      const payload = await parseJson<{ name?: string }>(request);
      const name = String(payload.name || "").trim();
      if (!name) {
        return jsonResponse({ success: false, message: "Role name is required." }, 400, request);
      }

      const role = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; slug: string }>(
          `
            insert into roles (name, slug)
            values ($1, $2)
            returning id::text as id, name, slug
          `,
          [name, slugify(name)]
        );
        return result.rows[0];
      });

      return jsonResponse({ success: true, role }, 201, request);
    }
  }

  const roleId = segments[2];
  if (!roleId) {
    return notFound(request);
  }

  if (segments[3] === "permissions") {
    requirePermission(request, "manage_users");

    if (method === "GET") {
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ permission_key: string }>(
          `
            select p.permission_key
            from role_permissions rp
            join permissions p on p.id = rp.permission_id
            where rp.role_id = $1
            order by p.permission_key asc
          `,
          [Number(roleId)]
        );
        return result.rows.map((row) => row.permission_key);
      });

      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "PUT") {
      const payload = await parseJson<{ permissionKeys?: string[] }>(request);
      const permissionKeys = Array.isArray(payload.permissionKeys) ? payload.permissionKeys : [];
      await withDbClient(async (client) => {
        await client.query("delete from role_permissions where role_id = $1", [Number(roleId)]);
        if (!permissionKeys.length) {
          return;
        }
        await client.query(
          `
            insert into role_permissions (role_id, permission_id)
            select $1, p.id
            from permissions p
            where p.permission_key = any($2::text[])
          `,
          [Number(roleId), permissionKeys]
        );
      });

      return jsonResponse({ success: true, items: permissionKeys }, 200, request);
    }
  }

  if (method === "PUT") {
    requirePermission(request, "manage_users");
    const payload = await parseJson<{ name?: string }>(request);
    const name = String(payload.name || "").trim();
    if (!name) {
      return jsonResponse({ success: false, message: "Role name is required." }, 400, request);
    }

    const role = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; slug: string }>(
        `
          update roles
          set name = $2, slug = $3
          where id = $1
          returning id::text as id, name, slug
        `,
        [Number(roleId), name, slugify(name)]
      );

      if (!result.rows.length) {
        throw new Error("Role not found.");
      }
      return result.rows[0];
    });

    return jsonResponse({ success: true, role }, 200, request);
  }

  if (method === "DELETE") {
    requirePermission(request, "manage_users");
    await withDbClient(async (client) => {
      await client.query("delete from roles where id = $1", [Number(roleId)]);
    });
    return jsonResponse({ success: true, message: "Role deleted." }, 200, request);
  }

  return notFound(request);
}

async function handlePermissions(request: Request, method: string) {
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }
  requirePermission(request, "manage_users");
  await ensureCrmAuthSchema();
  const items = await withDbClient(async (client) => {
    const result = await client.query<{ permission_key: string; description: string | null }>(
      `
        select permission_key, description
        from permissions
        order by permission_key asc
      `
    );
    return result.rows.map((row) => ({
      key: row.permission_key,
      description: row.description
    }));
  });

  return jsonResponse({ success: true, items }, 200, request);
}

async function handleTeams(request: Request, method: string, segments: string[]) {
  await ensureCrmAuthSchema();

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_users");
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; description: string | null }>(
          `
            select id::text as id, name, description
            from teams
            order by name asc
          `
        );
        return result.rows;
      });
      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "manage_users");
      const payload = await parseJson<{ name?: string; description?: string }>(request);
      const name = String(payload.name || "").trim();
      if (!name) {
        return jsonResponse({ success: false, message: "Team name is required." }, 400, request);
      }

      const team = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; description: string | null }>(
          `
            insert into teams (name, description, updated_at)
            values ($1, $2, now())
            returning id::text as id, name, description
          `,
          [name, payload.description || null]
        );
        return result.rows[0];
      });

      return jsonResponse({ success: true, team }, 201, request);
    }
  }

  const teamId = segments[2];
  if (!teamId) {
    return notFound(request);
  }

  if (segments[3] === "permissions") {
    requirePermission(request, "manage_users");
    if (method === "GET") {
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ permission_key: string }>(
          `
            select p.permission_key
            from team_permissions tp
            join permissions p on p.id = tp.permission_id
            where tp.team_id = $1
            order by p.permission_key asc
          `,
          [Number(teamId)]
        );
        return result.rows.map((row) => row.permission_key);
      });
      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "PUT") {
      const payload = await parseJson<{ permissionKeys?: string[] }>(request);
      const permissionKeys = Array.isArray(payload.permissionKeys) ? payload.permissionKeys : [];
      await withDbClient(async (client) => {
        await client.query("delete from team_permissions where team_id = $1", [Number(teamId)]);
        if (!permissionKeys.length) {
          return;
        }
        await client.query(
          `
            insert into team_permissions (team_id, permission_id)
            select $1, p.id
            from permissions p
            where p.permission_key = any($2::text[])
          `,
          [Number(teamId), permissionKeys]
        );
      });

      return jsonResponse({ success: true, items: permissionKeys }, 200, request);
    }
  }

  if (method === "PUT") {
    requirePermission(request, "manage_users");
    const payload = await parseJson<{ name?: string; description?: string }>(request);
    const name = payload.name ? String(payload.name).trim() : "";
    if (!name && payload.description === undefined) {
      return jsonResponse({ success: false, message: "No changes provided." }, 400, request);
    }

    const team = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; description: string | null }>(
        `
          update teams
          set
            name = coalesce($2, name),
            description = coalesce($3, description),
            updated_at = now()
          where id = $1
          returning id::text as id, name, description
        `,
        [Number(teamId), name || null, payload.description ?? null]
      );
      if (!result.rows.length) {
        throw new Error("Team not found.");
      }
      return result.rows[0];
    });

    return jsonResponse({ success: true, team }, 200, request);
  }

  if (method === "DELETE") {
    requirePermission(request, "manage_users");
    await withDbClient(async (client) => {
      await client.query("delete from teams where id = $1", [Number(teamId)]);
    });
    return jsonResponse({ success: true, message: "Team deleted." }, 200, request);
  }

  return notFound(request);
}

async function handlePropertyTypes(request: Request, method: string, segments: string[]) {
  requirePermission(request, "manage_users");

  if (segments.length === 2 && method === "GET") {
    const items = (await getPropertyTypeOptions()).map((item) => ({
      id: String(item.id),
      name: item.name,
      slug: item.slug,
      property_count: "0"
    }));
    return jsonResponse({ success: true, items }, 200, request);
  }

  return jsonResponse(
    { success: false, message: "Property types are fixed in CRM and cannot be modified." },
    405,
    request
  );
}

function normalizeIndianPhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  const candidate = digits.length === 10 ? digits : digits.slice(-10);
  return /^[6-9]\d{9}$/.test(candidate) ? candidate : null;
}

async function getWebsiteLeadDefaults() {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const sourceResult = await client.query<{ id: string }>(
      "select id::text as id from crm_lead_sources where slug = 'website' limit 1"
    );
    if (!sourceResult.rows.length) {
      throw new Error("Website lead source is missing.");
    }

    const actorResult = await client.query<{ id: string }>(
      `
        select u.id::text as id
        from users u
        join roles r on r.id = u.role_id
        where u.is_active = true
        order by
          case when r.slug = 'admin' then 0
               when r.slug = 'sales-manager' then 1
               else 2 end,
          u.id asc
        limit 1
      `
    );
    if (!actorResult.rows.length) {
      throw new Error("No active CRM user available to own website enquiries.");
    }

    return {
      sourceId: Number(sourceResult.rows[0].id),
      actorUserId: actorResult.rows[0].id
    };
  });
}

async function handlePublic(request: Request, method: string, segments: string[]) {
  if (segments[2] === "localities" && method === "GET") {
    const url = new URL(request.url);
    const location = url.searchParams.get("location");
    const limit = url.searchParams.get("limit");
    const items = await listActiveLocalitiesForFooter({
      location,
      limit: limit ? Number(limit) : undefined
    });

    return jsonResponse(
      {
        success: true,
        location: (location || "Bareilly").trim() || "Bareilly",
        items
      },
      200,
      request
    );
  }

  if (segments[2] !== "enquiries" || method !== "POST") {
    return notFound(request);
  }

  const payload = await parseJson<{
    fullName?: string;
    phone?: string;
    message?: string;
    requirement?: string;
    propertyTitle?: string;
    propertyCode?: string;
  }>(request);

  const fullName = (payload.fullName || "").trim();
  if (fullName.length < 2) {
    return jsonResponse({ success: false, message: "Full name is required." }, 400, request);
  }

  const normalizedPhone = normalizeIndianPhone(payload.phone);
  if (!normalizedPhone) {
    return jsonResponse({ success: false, message: "Valid Indian mobile number is required." }, 400, request);
  }

  const { sourceId, actorUserId } = await getWebsiteLeadDefaults();
  const details = [
    "Website enquiry",
    payload.requirement?.trim() ? `Requirement: ${payload.requirement.trim()}` : null,
    payload.propertyTitle?.trim() ? `Property: ${payload.propertyTitle.trim()}` : null,
    payload.propertyCode?.trim() ? `Property Code: ${payload.propertyCode.trim()}` : null,
    payload.message?.trim() ? `Message: ${payload.message.trim()}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const lead = await createLead(
    {
      name: fullName,
      date: new Date().toISOString(),
      mobileNumber: normalizedPhone,
      whatsappNumber: normalizedPhone,
      sourceId,
      remark: details
    },
    actorUserId
  );

  return jsonResponse({ success: true, leadId: lead.id }, 201, request);
}

function normalizeHeader(value: string) {
  return value
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeComparableText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeComparableNumber(value: unknown) {
  const parsed = toOptionalNumber(value);
  if (parsed === null) {
    return "";
  }

  return String(parsed);
}

function normalizePropertyCode(value: unknown) {
  const normalized = normalizeComparableText(value).toUpperCase();
  return normalized || null;
}

function buildPropertyDuplicateSignature(input: {
  title?: unknown;
  listingType?: unknown;
  propertyType?: unknown;
  locality?: unknown;
  city?: unknown;
  state?: unknown;
  addressLine1?: unknown;
  pincode?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  builtupArea?: unknown;
  priceAmount?: unknown;
  rentAmount?: unknown;
}) {
  return [
    normalizeComparableText(input.title),
    normalizeComparableText(input.listingType),
    normalizeComparableText(input.propertyType),
    normalizeComparableText(input.locality),
    normalizeComparableText(input.city),
    normalizeComparableText(input.state),
    normalizeComparableText(input.addressLine1),
    normalizeComparableText(input.pincode),
    normalizeComparableNumber(input.bedrooms),
    normalizeComparableNumber(input.bathrooms),
    normalizeComparableNumber(input.builtupArea),
    normalizeComparableNumber(input.priceAmount),
    normalizeComparableNumber(input.rentAmount)
  ].join("|");
}

async function handlePropertiesApi(request: Request, method: string, segments: string[]) {
  if (segments.length === 1) {
    if (method === "GET") {
      const url = new URL(request.url);
      const page = ensureNumber(url.searchParams.get("page"), 1);
      const limit = ensureNumber(url.searchParams.get("limit"), 10);
      const data = await listApiPropertiesPaginated(page, limit, {
        search: url.searchParams.get("search"),
        listingType: url.searchParams.get("listingType"),
        propertyType: url.searchParams.get("propertyType"),
        status: url.searchParams.get("status"),
        city: url.searchParams.get("city"),
        isFeatured: url.searchParams.get("isFeatured"),
        isVerified: url.searchParams.get("isVerified")
      });
      const [propertyTypes, filterOptions] = await Promise.all([getPropertyTypeOptions(), listApiPropertyFilterOptions()]);
      return jsonResponse({ ok: true, items: data.items, pagination: data.pagination, propertyTypes, filterOptions }, 200, request);
    }

    if (method === "POST") {
      const payload = await parsePropertyPayload(request);
      const property = await createProperty(payload as Parameters<typeof createProperty>[0]);
      return jsonResponse({ ok: true, property }, 201, request);
    }
  }

  if (segments.length === 2 && segments[1] !== "import") {
    const propertyId = segments[1];

    if (method === "GET") {
      const property = await getApiPropertyById(propertyId);
      if (!property) {
        return jsonResponse({ ok: false, error: "Property not found.", message: "Property not found." }, 404, request);
      }
      return jsonResponse({ ok: true, property }, 200, request);
    }

    if (method === "PUT") {
      const payload = await parsePropertyPayload(request);
      const property = await updatePropertyById(propertyId, payload as Parameters<typeof updatePropertyById>[1]);
      return jsonResponse({ ok: true, property }, 200, request);
    }

    if (method === "DELETE") {
      await hardDeletePropertyById(propertyId);
      return jsonResponse({ ok: true }, 200, request);
    }
  }

  if (segments[1] === "import" && method === "POST") {
    const RESULT_PREVIEW_LIMIT = 200;

    const form = await parseForm(request);
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: "File is required." }, 400, request);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isJsonFile = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    let rows: Array<Record<string, unknown>> = [];

    if (isJsonFile) {
      const text = buffer.toString("utf-8").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return jsonResponse({ ok: false, error: "Invalid JSON file." }, 400, request);
      }

      if (Array.isArray(parsed)) {
        rows = parsed.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") as Array<Record<string, unknown>>;
      } else if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const candidateArrays = ["properties", "data", "listings", "items"]
          .map((key) => record[key])
          .filter((value): value is unknown[] => Array.isArray(value));
        const firstArray = candidateArrays[0];
        if (!firstArray) {
          return jsonResponse({ ok: false, error: "JSON must be an array of properties or contain a properties/data/listings/items array." }, 400, request);
        }
        rows = firstArray.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") as Array<Record<string, unknown>>;
      } else {
        return jsonResponse({ ok: false, error: "JSON must be an array of objects." }, 400, request);
      }
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return jsonResponse({ ok: false, error: "No worksheet found." }, 400, request);
      }
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    }

    const headers = rows.length ? Object.keys(rows[0]) : [];

    const aliases: Record<string, string[]> = {
      propertyCode: ["property code", "property_code", "property id", "property_id"],
      title: ["title", "name", "property title", "prop heading", "prop_heading", "heading"],
      description: ["description", "desc"],
      listingType: ["listing type", "listing_type", "listing", "listing type label", "preference"],
      propertyType: ["property type", "property_type", "property type id", "property_type_id"],
      locality: ["locality"],
      locationLocality: ["location locality name", "location_locality_name"],
      country: ["country"],
      subLocality: ["sub locality", "sub_locality", "sublocality"],
      city: ["city", "location city name", "location_city_name"],
      state: ["state"],
      availability: ["availability", "formatted availability", "formatted_availability"],
      addressLine1: ["address", "address line1", "address1", "location address", "location_address"],
      addressLine2: ["address line2", "address2", "address_line2"],
      landmark: ["landmark"],
      pincode: ["pincode", "pin"],
      status: ["status"],
      possessionStatus: ["possession status", "possession_status"],
      facing: ["facing"],
      latitude: ["latitude", "lat", "map latitude", "map_latitude"],
      longitude: ["longitude", "lng", "lon", "map longitude", "map_longitude"],
      priceAmount: ["price", "price amount", "price_amount"],
      rentAmount: ["rent", "rent amount", "rent_amount"],
      securityDeposit: ["security deposit", "security_deposit"],
      maintenanceAmount: ["maintenance", "maintenance amount", "maintenance_amount"],
      priceLabel: [
        "price label",
        "price_label",
        "formatted price in words",
        "formatted_price_in_words",
        "formatted price"
      ],
      bedrooms: ["bedrooms", "beds", "bedroom num", "bedroom_num"],
      bathrooms: ["bathrooms", "baths", "bathroom num", "bathroom_num"],
      balconies: ["balconies", "balcony num", "balcony_num"],
      floorNumber: ["floor number", "floor_number"],
      floorsTotal: ["floors total", "floors_total", "total floors", "total_floors", "total floor", "total_floor"],
      builtupArea: ["builtup area", "builtup_area", "super area", "super_area", "super sqft", "super_sqft"],
      builtupAreaUnit: ["builtup area unit", "builtup_area_unit", "superarea unit", "superarea_unit"],
      area: ["area"],
      secondaryArea: ["secondary area", "secondary_area"],
      carpetArea: ["carpet area", "carpet_area"],
      plotArea: ["plot area", "plot_area"],
      parkingCount: ["parking", "parking count", "parking_count"],
      furnishingStatus: ["furnishing status", "furnishing_status", "furnish"],
      ageOfProperty: ["age of property", "age_of_property", "age"],
      features: ["features", "amenities", "amenity"],
      coverImageUrl: [
        "cover image",
        "cover image url",
        "cover_image_url",
        "photo url",
        "photo_url",
        "medium photo url",
        "medium_photo_url"
      ],
      imageUrls: [
        "image urls",
        "image_urls",
        "images",
        "gallery",
        "gallery images",
        "property images",
        "property_images",
        "prop heading",
        "prop_heading",
        "price"
      ],
      isFeatured: ["is featured", "is_featured", "featured"],
      isVerified: ["is verified", "is_verified", "verified"]
    };

    const headerMap = new Map<string, string>();
    headers.forEach((header) => {
      const normalized = normalizeHeader(header);
      for (const [field, options] of Object.entries(aliases)) {
        if (options.includes(normalized) && !headerMap.has(field)) {
          headerMap.set(field, header);
          break;
        }
      }
    });

    const propertyTypes = await getPropertyTypeOptions();
    const propertyTypeByName = new Map(
      propertyTypes.map((type) => [normalizeHeader(type.name), type.name])
    );
    const propertyTypeBySlug = new Map(
      propertyTypes.map((type) => [normalizeHeader(type.slug), type.name])
    );

    const { existingPropertyCodes, existingSignatures } = await withDbClient(async (client) => {
      const existingRows = await client.query<{
        property_code: string;
        title: string;
        listing_type: string;
        property_type: string;
        locality: string | null;
        city: string | null;
        state: string | null;
        address_line1: string | null;
        pincode: string | null;
        bedrooms: number | null;
        bathrooms: number | null;
        builtup_area: string | null;
        price_amount: string | null;
        rent_amount: string | null;
      }>(
        `
          select
            property_code,
            title,
            listing_type,
            property_type,
            locality,
            city,
            state,
            address_line1,
            pincode,
            bedrooms,
            bathrooms,
            builtup_area::text,
            price_amount::text,
            rent_amount::text
          from properties
          where deleted_at is null
        `
      );

      const loadedPropertyCodes = new Set<string>();
      const loadedSignatures = new Set<string>();

      for (const existing of existingRows.rows) {
        const normalizedCode = normalizePropertyCode(existing.property_code);
        if (normalizedCode) {
          loadedPropertyCodes.add(normalizedCode);
        }

        loadedSignatures.add(
          buildPropertyDuplicateSignature({
            title: existing.title,
            listingType: existing.listing_type,
            propertyType: existing.property_type,
            locality: existing.locality,
            city: existing.city,
            state: existing.state,
            addressLine1: existing.address_line1,
            pincode: existing.pincode,
            bedrooms: existing.bedrooms,
            bathrooms: existing.bathrooms,
            builtupArea: existing.builtup_area,
            priceAmount: existing.price_amount,
            rentAmount: existing.rent_amount
          })
        );
      }

      return {
        existingPropertyCodes: loadedPropertyCodes,
        existingSignatures: loadedSignatures
      };
    });

    const imported: Array<{ row: number; propertyCode: string; slug: string }> = [];
    const skipped: Array<{ row: number; reason: string }> = [];
    const errors: Array<{ row: number; error: string }> = [];
    const importedPropertyCodes = new Set<string>();
    const importedSignatures = new Set<string>();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const getValue = (field: string) => {
          const header = headerMap.get(field);
          return header ? row[header] : undefined;
        };

        const titleRaw = String(getValue("title") ?? "").trim();
        const propertyCodeRaw = String(getValue("propertyCode") ?? "").trim();
        const listingTypeRaw = String(getValue("listingType") ?? "").trim();
        const propertyTypeRaw = getValue("propertyType");
        const rawLocality = String(getValue("locality") ?? "").trim();
        const fallbackLocality = String(getValue("locationLocality") ?? "").trim();
        const locality = isLikelyAreaValue(rawLocality) ? fallbackLocality : rawLocality || fallbackLocality;

        if (!locality || !propertyTypeRaw) {
          throw new Error("Missing required fields (propertyType, locality).");
        }

        const normalizedPropertyType = normalizeHeader(String(propertyTypeRaw));
        const propertyType =
          propertyTypeByName.get(normalizedPropertyType) ||
          propertyTypeBySlug.get(normalizedPropertyType) ||
          String(propertyTypeRaw).trim();

        if (!propertyType) {
          throw new Error("Invalid property type.");
        }

        const listingType =
          normalizeListingType(listingTypeRaw) ||
          normalizeListingType(String(getValue("availability") ?? "")) ||
          "sale";

        const fallbackTitle = `${propertyType} in ${locality}${String(getValue("city") ?? "").trim() ? `, ${String(getValue("city") ?? "").trim()}` : ""}`;
        const title = titleRaw && !/https?:\/\//i.test(titleRaw) ? titleRaw : fallbackTitle;

        const pincode = String(getValue("pincode") ?? "").trim() || undefined;
        const addressLine1 = String(getValue("addressLine1") ?? "").trim() || undefined;
        const city = String(getValue("city") ?? "").trim() || undefined;
        const state = String(getValue("state") ?? "").trim() || undefined;
        const bedrooms = toOptionalNumber(getValue("bedrooms")) ?? undefined;
        const bathrooms = toOptionalNumber(getValue("bathrooms")) ?? undefined;
        const builtupArea =
          toOptionalNumber(getValue("builtupArea")) ??
          parseAreaValue(getValue("area")).amount ??
          parseAreaValue(getValue("secondaryArea")).amount ??
          undefined;
        const priceAmount = toOptionalNumber(getValue("priceAmount")) ?? undefined;
        const rentAmount = toOptionalNumber(getValue("rentAmount")) ?? undefined;

        const normalizedPropertyCode = normalizePropertyCode(propertyCodeRaw);
        if (normalizedPropertyCode) {
          if (existingPropertyCodes.has(normalizedPropertyCode) || importedPropertyCodes.has(normalizedPropertyCode)) {
            skipped.push({ row: rowNumber, reason: `Skipped duplicate property code: ${normalizedPropertyCode}` });
            continue;
          }
        }

        const duplicateSignature = buildPropertyDuplicateSignature({
          title,
          listingType,
          propertyType,
          locality,
          city,
          state,
          addressLine1,
          pincode,
          bedrooms,
          bathrooms,
          builtupArea,
          priceAmount,
          rentAmount
        });

        if (existingSignatures.has(duplicateSignature) || importedSignatures.has(duplicateSignature)) {
          skipped.push({ row: rowNumber, reason: "Skipped duplicate property data." });
          continue;
        }

        const imageSources = Array.from(
          new Set([
            ...toImageSourceList(getValue("coverImageUrl")),
            ...toImageSourceList(getValue("imageUrls"))
          ])
        );

        const resolvedImageUrls: string[] = [];
        for (const imageSource of imageSources) {
          if (imageSource.startsWith("/uploads/")) {
            resolvedImageUrls.push(imageSource);
            continue;
          }

          // Keep remote URLs as-is (do not download and store in /uploads during import).
          resolvedImageUrls.push(imageSource);
        }

        const payload = {
          title,
          description: String(getValue("description") ?? "").trim() || undefined,
          listingType,
          propertyType,
          locality,
          country: String(getValue("country") ?? "").trim() || undefined,
          subLocality: String(getValue("subLocality") ?? "").trim() || undefined,
          city,
          state,
          addressLine1,
          addressLine2: String(getValue("addressLine2") ?? "").trim() || undefined,
          landmark: String(getValue("landmark") ?? "").trim() || undefined,
          pincode,
          status: String(getValue("status") ?? "").trim() || undefined,
          possessionStatus: String(getValue("possessionStatus") ?? "").trim() || undefined,
          facing: normalizeFacingValue(String(getValue("facing") ?? "")) || undefined,
          latitude: toOptionalNumber(getValue("latitude")) ?? undefined,
          longitude: toOptionalNumber(getValue("longitude")) ?? undefined,
          priceAmount,
          rentAmount,
          securityDeposit: toOptionalNumber(getValue("securityDeposit")) ?? undefined,
          maintenanceAmount: toOptionalNumber(getValue("maintenanceAmount")) ?? undefined,
          priceLabel: String(getValue("priceLabel") ?? "").trim() || undefined,
          bedrooms,
          bathrooms,
          balconies: toOptionalNumber(getValue("balconies")) ?? undefined,
          floorNumber: toOptionalNumber(getValue("floorNumber")) ?? undefined,
          floorsTotal: toOptionalNumber(getValue("floorsTotal")) ?? undefined,
          builtupArea,
          builtupAreaUnit:
            String(getValue("builtupAreaUnit") ?? "").trim() ||
            parseAreaValue(getValue("area")).unit ||
            parseAreaValue(getValue("secondaryArea")).unit ||
            undefined,
          carpetArea: toOptionalNumber(getValue("carpetArea")) ?? undefined,
          plotArea: toOptionalNumber(getValue("plotArea")) ?? undefined,
          parkingCount: toOptionalNumber(getValue("parkingCount")) ?? undefined,
          furnishingStatus: String(getValue("furnishingStatus") ?? "").trim() || undefined,
          ageOfProperty: toOptionalNumber(getValue("ageOfProperty")) ?? undefined,
          coverImageUrl: resolvedImageUrls[0] || undefined,
          imageUrls: resolvedImageUrls.length ? resolvedImageUrls : undefined,
          features: toStringList(getValue("features")) || undefined,
          isFeatured: toOptionalBoolean(getValue("isFeatured")) ?? undefined,
          isVerified: toOptionalBoolean(getValue("isVerified")) ?? undefined
        };

        const created = await createProperty(payload);
        imported.push({ row: rowNumber, propertyCode: created.propertyCode, slug: created.slug });
        if (normalizedPropertyCode) {
          importedPropertyCodes.add(normalizedPropertyCode);
        }
        importedSignatures.add(duplicateSignature);
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : "Failed to import row."
        });
      }
    }

    const mapping: Record<string, string | null> = {};
    headerMap.forEach((header, field) => {
      mapping[field] = header;
    });

    return jsonResponse(
      {
        ok: true,
        totalRows: rows.length,
        importedCount: imported.length,
        skippedCount: skipped.length,
        failedCount: errors.length,
        imported: imported.slice(0, RESULT_PREVIEW_LIMIT),
        skipped: skipped.slice(0, RESULT_PREVIEW_LIMIT),
        errors: errors.slice(0, RESULT_PREVIEW_LIMIT),
        importedTruncated: imported.length > RESULT_PREVIEW_LIMIT,
        skippedTruncated: skipped.length > RESULT_PREVIEW_LIMIT,
        errorsTruncated: errors.length > RESULT_PREVIEW_LIMIT,
        mapping,
        headers
      },
      200,
      request
    );
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404, request);
}

async function handleV1(request: Request, method: string, segments: string[]) {
  switch (segments[1]) {
    case "dashboard":
      return handleDashboard(request, method);
    case "leads":
      return handleLeads(request, method, segments);
    case "tasks":
      return handleTasks(request, method, segments);
    case "notifications":
      return handleNotifications(request, method, segments);
    case "projects":
      return handleProjectsEntity(request, method, segments);
    case "reports":
      return handleReports(request, method, segments);
    case "search":
      return handleSearch(request, method);
    case "settings":
      return handleSettings(request, method, segments);
    case "users":
      return handleUsers(request, method, segments);
    case "roles":
      return handleRoles(request, method, segments);
    case "permissions":
      return handlePermissions(request, method);
    case "teams":
      return handleTeams(request, method, segments);
    case "property-types":
      return handlePropertyTypes(request, method, segments);
    case "public":
      return handlePublic(request, method, segments);
    default:
      return notFound(request);
  }
}

async function handleRequest(request: Request, context: RouteContext, method: string) {
  const params = await context.params;
  const segments = params?.path || [];
  if (!segments.length) {
    return notFound(request);
  }

  try {
    if (segments[0] === "v1") {
      return await handleV1(request, method, segments);
    }
    if (segments[0] === "uploads") {
      return await handleUploads(request, method, segments);
    }
    if (segments[0] === "properties") {
      return await handlePropertiesApi(request, method, segments);
    }
    return notFound(request);
  } catch (error) {
    if (segments[0] === "properties") {
      const message = error instanceof Error ? error.message : "Request failed.";
      return jsonResponse({ ok: false, error: message, message }, 500, request);
    }
    return buildErrorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "POST");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "PUT");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "DELETE");
}
