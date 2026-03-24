import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tradeId = searchParams.get("tradeId");
  if (!tradeId) {
    return NextResponse.json({ error: "Missing tradeId" }, { status: 400 });
  }

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId: session.user.id },
    include: { tags: true },
  });
  if (!trade) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tagNames = trade.tags.map((t) => t.name);
  if (tagNames.length < 2) {
    return NextResponse.json({ similar: [], reason: "need_at_least_two_tags" });
  }

  const others = await prisma.trade.findMany({
    where: {
      userId: session.user.id,
      id: { not: tradeId },
      tags: { some: { name: { in: tagNames } } },
    },
    include: { tags: true },
    orderBy: { date: "desc" },
    take: 80,
  });

  const similar = others.filter((o) => {
    const set = new Set(o.tags.map((t) => t.name));
    let overlap = 0;
    for (const n of tagNames) {
      if (set.has(n)) overlap += 1;
    }
    return overlap >= 2;
  });

  return NextResponse.json({
    similar: similar.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      date: t.date.toISOString(),
      pnl: t.pnl,
      fees: t.fees,
      tags: t.tags.map((x) => x.name),
    })),
  });
}
