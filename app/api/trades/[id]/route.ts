import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeTagName } from "@/lib/trade-tags";
import { computeStatedPnl } from "@/lib/trade-pnl";

const updateSchema = z.object({
  symbol: z.string().min(1).optional(),
  direction: z.enum(["long", "short"]).optional(),
  instrumentType: z.enum(["options", "futures", "stocks"]).optional(),
  risk: z.number().positive().optional(),
  rr: z.number().positive().optional(),
  outcome: z.enum(["win", "loss", "be"]).optional(),
  fees: z.number().optional(),
  date: z.string().optional(),
  marketCondition: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  confirmationNotes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  setupIds: z.array(z.string()).optional(),
  confirmationIds: z.array(z.string()).optional(),
  energyLevel: z.number().int().min(1).max(5).optional().nullable(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  stressLevel: z.enum(["low", "medium", "high"]).optional().nullable(),
  stateMoodTag: z.string().max(64).optional().nullable(),
  marketVolatility: z.enum(["low", "medium", "high"]).optional().nullable(),
  sessionType: z.enum(["trend", "range"]).optional().nullable(),
  exitType: z.enum(["system", "manual"]).optional(),
  realizedPnl: z.number().optional().nullable(),
  entryPrice: z.number().optional().nullable(),
  exitPrice: z.number().optional().nullable(),
  initialTp: z.number().optional().nullable(),
  initialSl: z.number().optional().nullable(),
  price5mAfter: z.number().optional().nullable(),
  price15mAfter: z.number().optional().nullable(),
  price60mAfter: z.number().optional().nullable(),
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
    if (data.fees != null) updateData.fees = data.fees;
    if (data.date != null) updateData.date = new Date(data.date + "T12:00:00Z");
    if (data.marketCondition !== undefined) updateData.marketCondition = data.marketCondition;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.confirmationNotes !== undefined) updateData.confirmationNotes = data.confirmationNotes;
    if (data.energyLevel !== undefined) updateData.energyLevel = data.energyLevel;
    if (data.sleepHours !== undefined) updateData.sleepHours = data.sleepHours;
    if (data.stressLevel !== undefined) updateData.stressLevel = data.stressLevel;
    if (data.stateMoodTag !== undefined) {
      updateData.stateMoodTag = data.stateMoodTag?.trim() || null;
    }
    if (data.marketVolatility !== undefined) updateData.marketVolatility = data.marketVolatility;
    if (data.sessionType !== undefined) updateData.sessionType = data.sessionType;
    if (data.exitType !== undefined) updateData.exitType = data.exitType;
    if (data.entryPrice !== undefined) updateData.entryPrice = data.entryPrice;
    if (data.exitPrice !== undefined) updateData.exitPrice = data.exitPrice;
    if (data.initialTp !== undefined) updateData.initialTp = data.initialTp;
    if (data.initialSl !== undefined) updateData.initialSl = data.initialSl;
    if (data.price5mAfter !== undefined) updateData.price5mAfter = data.price5mAfter;
    if (data.price15mAfter !== undefined) updateData.price15mAfter = data.price15mAfter;
    if (data.price60mAfter !== undefined) updateData.price60mAfter = data.price60mAfter;

    const ex = existing as {
      risk: number;
      rr: number;
      outcome: string;
      exitType?: string | null;
      pnl: number;
    };
    const mergedOutcome = (data.outcome ?? ex.outcome) as "win" | "loss" | "be";
    const mergedRisk = data.risk ?? ex.risk;
    const mergedRr = data.rr ?? ex.rr;
    const mergedExit = (data.exitType ?? ex.exitType ?? "system") as "system" | "manual";
    const realizedForPnl =
      mergedExit === "manual"
        ? data.realizedPnl !== undefined
          ? (data.realizedPnl ?? ex.pnl)
          : ex.pnl
        : undefined;
    updateData.pnl = computeStatedPnl({
      outcome: mergedOutcome,
      risk: mergedRisk,
      rr: mergedRr,
      exitType: mergedExit,
      realizedPnl: realizedForPnl,
    });

    if (data.tags !== undefined) {
      await prisma.tradeTag.deleteMany({ where: { tradeId: id } });
      const uniqueTags = Array.from(
        new Set(data.tags.map((name) => normalizeTagName(name)).filter(Boolean))
      );
      if (uniqueTags.length > 0) {
        await prisma.tradeTag.createMany({
          data: uniqueTags.map((name) => ({ tradeId: id, name })),
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
