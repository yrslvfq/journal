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
  const { id: tradeId, imageId } = await params;

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId: session.user.id },
  });
  if (!trade) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const image = await prisma.tradeImage.findFirst({
    where: { id: imageId, tradeId },
  });
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const uploadsDir = getUploadsDir();
    const filepath = urlToFilePath(image.url, uploadsDir);
    await unlink(filepath);
  } catch {
    // File might not exist (e.g. was manually deleted); continue with DB delete
  }

  await prisma.tradeImage.delete({ where: { id: imageId } });
  return NextResponse.json({ success: true });
}
