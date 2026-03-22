import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadsDir, getUploadBaseUrl, urlToFilePath } from "@/lib/uploads";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.researchEntry.findFirst({
    where: { id, userId: session.user.id },
    include: { images: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = await prisma.researchEntry.create({
    data: {
      userId: session.user.id,
      title: `${existing.title} (copy)`,
      content: existing.content,
      type: existing.type,
    },
  });

  if (existing.images.length > 0) {
    const uploadsDir = getUploadsDir();
    const baseUrl = getUploadBaseUrl();
    const srcDir = path.join(uploadsDir, "research", existing.id);
    const dstDir = path.join(uploadsDir, "research", created.id);
    await mkdir(dstDir, { recursive: true });

    for (const img of existing.images) {
      try {
        const srcPath = urlToFilePath(img.url, uploadsDir);
        const filename = path.basename(srcPath);
        const dstPath = path.join(dstDir, filename);
        const buf = await readFile(srcPath);
        await writeFile(dstPath, buf);
        const newUrl = `${baseUrl}/research/${created.id}/${filename}`;
        await prisma.researchImage.create({
          data: { researchId: created.id, url: newUrl, caption: img.caption },
        });
      } catch {
        // Skip failed image copies
      }
    }

    const withImages = await prisma.researchEntry.findUnique({
      where: { id: created.id },
      include: { images: true },
    });
    return NextResponse.json(withImages);
  }

  return NextResponse.json(created);
}
