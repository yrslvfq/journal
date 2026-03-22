import path from "path";

/**
 * Directory for file uploads. On Amvera use /data/uploads for persistence.
 * Locally defaults to public/uploads.
 */
export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
}

/**
 * Base URL for served uploads. When using UPLOADS_DIR (e.g. /data/uploads),
 * we serve via API since files are outside public/. Otherwise /uploads works via Next.js static.
 */
export function getUploadBaseUrl(): string {
  return process.env.UPLOADS_DIR ? "/api/uploads" : "/uploads";
}

/**
 * Resolve stored URL to filesystem path. Handles both /uploads/ and /api/uploads/ formats.
 */
export function urlToFilePath(url: string, uploadsDir: string): string {
  let relative = url.startsWith("/api/uploads/")
    ? url.slice("/api/uploads/".length)
    : url.startsWith("/uploads/")
    ? url.slice("/uploads/".length)
    : url.startsWith("/")
    ? url.slice(1)
    : url;
  return path.join(uploadsDir, relative);
}
