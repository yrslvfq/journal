import { NextResponse } from "next/server";
import { getUploadsDir, urlToFilePath } from "@/lib/uploads";
import { readFile } from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploadsDir = getUploadsDir();
  const relativePath = pathSegments.join("/");
  const requestedPath = path.join(uploadsDir, relativePath);

  const resolved = path.resolve(requestedPath);
  const baseResolved = path.resolve(uploadsDir);
  if (!resolved.startsWith(baseResolved)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buf = await readFile(resolved);
    const ext = path.extname(resolved).slice(1).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
