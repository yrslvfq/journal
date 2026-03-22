import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  symbol: z.string().min(1).optional(),
  direction: z.enum(["long", "short"]).optional(),
  instrumentType: z.enum(["options", "futures", "stocks"]).optional(),
  risk: z.number().positive().optional(),
  rr: z.number().positive().optional(),
  outcome: z.enum(["win", "loss"]).optional(),
  fees: z.number().optional(),
  date: z.string().optional(),
  marketCondition: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  confirmationNotes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  setupIds: z.array(z.string()).optional(),
  confirmationIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const trade = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
    include: {
      tags: true,
      images: true,
      setups: { include: { setupType: true } },
      confirmations: { include: { confirmationType: true } },
    },
  });
  if (!trade) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(trade);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.symbol != null) updateData.symbol = data.symbol;
    if (data.direction != null) updateData.direction = data.direction;
    if (data.instrumentType != null) updateData.instrumentType = data.instrumentType;
    if (data.risk != null) updateData.risk = data.risk;
    if (data.rr != null) updateData.rr = data.rr;
    if (data.outcome != null) updateData.outcome = data.outcome;
    if (data.risk != null || data.rr != null || data.outcome != null) {
      const risk = (data.risk ?? (existing as { risk: number }).risk) as number;
      const rr = (data.rr ?? (existing as { rr: number }).rr) as number;
      const outcome = (data.outcome ?? (existing as { outcome: string }).outcome) as string;
      updateData.pnl = outcome === "win" ? risk * rr : -risk;
    }
    if (data.fees != null) updateData.fees = data.fees;
    if (data.date != null) updateData.date = new Date(data.date + "T12:00:00Z");
    if (data.marketCondition !== undefined) updateData.marketCondition = data.marketCondition;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.confirmationNotes !== undefined) updateData.confirmationNotes = data.confirmationNotes;

    if (data.tags !== undefined) {
      await prisma.tradeTag.deleteMany({ where: { tradeId: id } });
      if (data.tags.length > 0) {
        await prisma.tradeTag.createMany({
          data: data.tags.map((name) => ({ tradeId: id, name })),
        });
      }
    }

    if (data.setupIds !== undefined) {
      await prisma.tradeSetup.deleteMany({ where: { tradeId: id } });
      if (data.setupIds.length > 0) {
        await prisma.tradeSetup.createMany({
          data: data.setupIds.map((setupTypeId) => ({ tradeId: id, setupTypeId })),
        });
      }
    }

    if (data.confirmationIds !== undefined) {
      await prisma.tradeConfirmation.deleteMany({ where: { tradeId: id } });
      if (data.confirmationIds.length > 0) {
        await prisma.tradeConfirmation.createMany({
          data: data.confirmationIds.map((confirmationTypeId) => ({
            tradeId: id,
            confirmationTypeId,
          })),
        });
      }
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: updateData,
      include: {
        tags: true,
        setups: { include: { setupType: true } },
        confirmations: { include: { confirmationType: true } },
      },
    });
    return NextResponse.json(trade);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update trade" }, { status: 500 });
  }
}

export async function DELETE(
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
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.trade.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
