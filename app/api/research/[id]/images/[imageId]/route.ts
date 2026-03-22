import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadsDir, urlToFilePath } from "@/lib/uploads";
import { unlink } from "fs/promises";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: researchId, imageId } = await params;

  const entry = await prisma.researchEntry.findFirst({
    where: { id: researchId, userId: session.user.id },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const image = await prisma.researchImage.findFirst({
    where: { id: imageId, researchId },
  });
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const uploadsDir = getUploadsDir();
    const filepath = urlToFilePath(image.url, uploadsDir);
    await unlink(filepath);
  } catch {
    // File might not exist; continue with DB delete
  }

  await prisma.researchImage.delete({ where: { id: imageId } });
  return NextResponse.json({ success: true });
}
