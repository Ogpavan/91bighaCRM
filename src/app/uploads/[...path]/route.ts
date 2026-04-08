import { promises as fs } from "fs";
import path from "path";
import { resolveUploadRequestPath } from "@/lib/uploads";

type UploadRouteContext = {
  params: Promise<{ path: string[] }>;
};

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function getContentType(filePath: string) {
  return contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

export async function GET(_request: Request, context: UploadRouteContext) {
  const { path: segments } = await context.params;

  try {
    const filePath = resolveUploadRequestPath(segments);
    const file = await fs.readFile(filePath);

    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": getContentType(filePath)
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

