import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadsDir, getUploadBaseUrl } from "@/lib/uploads";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_TRADE = 10;
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
  const { id: tradeId } = await params;

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId: session.user.id },
    include: { images: true },
  });
  if (!trade) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const currentCount = trade.images.length;
  if (currentCount >= MAX_IMAGES_PER_TRADE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES_PER_TRADE} screenshots per trade` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const files = formData.getAll("files");
  const fileList = Array.isArray(files)
    ? files
    : files
    ? [files]
    : [];
  const validFiles = fileList.filter((f): f is File => f instanceof File);

  if (validFiles.length === 0) {
    return NextResponse.json(
      { error: "No files provided" },
      { status: 400 }
    );
  }

  if (currentCount + validFiles.length > MAX_IMAGES_PER_TRADE) {
    return NextResponse.json(
      { error: `Cannot add ${validFiles.length} files. Maximum ${MAX_IMAGES_PER_TRADE - currentCount} more allowed.` },
      { status: 400 }
    );
  }

  const uploadsDir = getUploadsDir();
  const uploadDir = path.join(uploadsDir, "trades", tradeId);
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

    const url = `${baseUrl}/trades/${tradeId}/${filename}`;
    const img = await prisma.tradeImage.create({
      data: { tradeId, url, caption: null },
    });
    created.push({ id: img.id, url: img.url, caption: img.caption });
  }

  return NextResponse.json(created);
}
