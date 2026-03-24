import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTagName } from "@/lib/trade-tags";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("tag");
  if (!raw) {
    return NextResponse.json({ error: "Missing tag" }, { status: 400 });
  }
  const tagName = normalizeTagName(raw);
  if (!tagName) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  const trades = await prisma.trade.findMany({
    where: {
      userId: session.user.id,
      tags: { some: { name: tagName } },
    },
    select: { pnl: true, fees: true },
  });

  const net = (t: { pnl: number; fees: number }) => t.pnl - t.fees;
  const wins = trades.filter((t) => net(t) > 0);
  const losses = trades.filter((t) => net(t) < 0);
  const decided = wins.length + losses.length;
  const winRate = decided > 0 ? (wins.length / decided) * 100 : 0;

  const grossProfit = wins.reduce((s, t) => s + net(t), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + net(t), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return NextResponse.json({
    tag: tagName,
    tradesCount: trades.length,
    winRate,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : null,
    totalPnl: trades.reduce((s, t) => s + net(t), 0),
  });
}
