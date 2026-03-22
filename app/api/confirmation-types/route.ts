import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const types = await prisma.confirmationType.findMany({
    where: {
      OR: [{ userId: null }, { userId: session.user.id }],
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(types);
}

const createSchema = z.object({ name: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name } = createSchema.parse(body);
    const created = await prisma.confirmationType.create({
      data: { name, userId: session.user.id },
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
