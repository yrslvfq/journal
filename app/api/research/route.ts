import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const type = searchParams.get("type") || "";

  const where: Prisma.ResearchEntryWhereInput = {
    userId: session.user.id,
  };
  if (type && ["note", "setup", "strategy"].includes(type)) {
    where.type = type;
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }

  const entries = await prisma.researchEntry.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { images: true },
  });
  return NextResponse.json(entries);
}

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  type: z.enum(["note", "setup", "strategy"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { title, content, type } = createSchema.parse(body);
    const created = await prisma.researchEntry.create({
      data: { userId: session.user.id, title, content, type },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
