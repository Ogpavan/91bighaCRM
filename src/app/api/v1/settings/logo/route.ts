import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { updateAppSettings } from "@/lib/app-settings";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"]
]);

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    requirePermission(request, "manage_settings");

    const formData = await request.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) {
      throw new Error("Logo file is required.");
    }

    if (file.size <= 0) {
      throw new Error("Uploaded logo file is empty.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("Logo file must be 2MB or smaller.");
    }

    const extension = ALLOWED_MIME_TYPES.get(file.type);
    if (!extension) {
      throw new Error("Only PNG, JPG, WEBP, and SVG logos are allowed.");
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "branding");
    await mkdir(uploadDirectory, { recursive: true });

    const filename = `logo-${randomUUID()}${extension}`;
    const filePath = path.join(uploadDirectory, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const settings = await updateAppSettings({
      brand_logo_url: `/uploads/branding/${filename}`
    });

    return withCors(
      NextResponse.json({
        success: true,
        settings
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to upload logo."
        },
        { status }
      ),
      request
    );
  }
}
