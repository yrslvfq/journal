import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
    include: {
      tags: true,
      setups: true,
      confirmations: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const pnl = existing.outcome === "win" ? existing.risk * existing.rr : -existing.risk;

  const trade = await prisma.trade.create({
    data: {
      userId: session.user.id,
      symbol: existing.symbol,
      direction: existing.direction,
      instrumentType: existing.instrumentType,
      risk: existing.risk,
      rr: existing.rr,
      outcome: existing.outcome,
      pnl,
      fees: existing.fees,
      date: today,
      marketCondition: existing.marketCondition,
      notes: existing.notes,
      confirmationNotes: existing.confirmationNotes,
      tags: { create: existing.tags.map((t) => ({ name: t.name })) },
      setups: {
        create: existing.setups.map((s) => ({ setupTypeId: s.setupTypeId })),
      },
      confirmations: {
        create: existing.confirmations.map((c) => ({
          confirmationTypeId: c.confirmationTypeId,
        })),
      },
    },
  });

  return NextResponse.json(trade);
}
