import path from "path";

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const SHARED_UPLOADS_DIR = process.env.UPLOADS_DIR?.trim();

export function getUploadsRootDir() {
  return SHARED_UPLOADS_DIR ? path.resolve(SHARED_UPLOADS_DIR) : PUBLIC_UPLOADS_DIR;
}

export function getUploadsSubpath(...segments: string[]) {
  return path.join(getUploadsRootDir(), ...segments);
}

export function resolveUploadRequestPath(segments: string[]) {
  const uploadsRoot = getUploadsRootDir();
  const resolvedPath = path.resolve(uploadsRoot, ...segments);

  if (resolvedPath !== uploadsRoot && !resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new Error("Invalid upload path.");
  }

  return resolvedPath;
}

