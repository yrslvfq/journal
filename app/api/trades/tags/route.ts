import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tags = await prisma.tradeTag.findMany({
    where: { trade: { userId: session.user.id } },
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });

  const names = Array.from(new Set(tags.map((t) => t.name)));
  return NextResponse.json(names);
}
