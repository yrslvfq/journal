import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadsDir, getUploadBaseUrl } from "@/lib/uploads";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_ENTRY = 10;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function getExt(mime: string, filename: string): string {
  if (EXT_MAP[mime]) return EXT_MAP[mime];
  const ext = path.extname(filename || "").slice(1);
  return ext && ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: researchId } = await params;

  const entry = await prisma.researchEntry.findFirst({
    where: { id: researchId, userId: session.user.id },
    include: { images: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const currentCount = entry.images.length;
  if (currentCount >= MAX_IMAGES_PER_ENTRY) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES_PER_ENTRY} screenshots per entry` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = formData.getAll("files");
  const fileList = Array.isArray(files) ? files : files ? [files] : [];
  const validFiles = fileList.filter((f): f is File => f instanceof File);

  if (validFiles.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (currentCount + validFiles.length > MAX_IMAGES_PER_ENTRY) {
    return NextResponse.json(
      {
        error: `Cannot add ${validFiles.length} files. Maximum ${MAX_IMAGES_PER_ENTRY - currentCount} more allowed.`,
      },
      { status: 400 }
    );
  }

  const uploadsDir = getUploadsDir();
  const uploadDir = path.join(uploadsDir, "research", researchId);
  await mkdir(uploadDir, { recursive: true });
  const baseUrl = getUploadBaseUrl();

  const created: { id: string; url: string; caption: string | null }[] = [];

  for (const file of validFiles) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: png, jpeg, webp` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds 5MB limit` },
        { status: 413 }
      );
    }

    const ext = getExt(file.type, file.name);
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `${baseUrl}/research/${researchId}/${filename}`;
    const img = await prisma.researchImage.create({
      data: { researchId, url, caption: null },
    });
    created.push({ id: img.id, url: img.url, caption: img.caption });
  }

  return NextResponse.json(created);
}
