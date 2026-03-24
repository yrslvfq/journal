import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertTradeCreationAllowed } from "@/lib/kill-switch";
import { normalizeTagName } from "@/lib/trade-tags";

const createSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(["long", "short"]),
  instrumentType: z.enum(["options", "futures", "stocks"]),
  risk: z.number().positive(),
  rr: z.number().positive(), // risk:reward ratio, e.g. 2 = 1:2
  outcome: z.enum(["win", "loss", "be"]), // win = TP, loss = SL, be = break-even
  fees: z.number().default(0),
  date: z.string(), // YYYY-MM-DD
  marketCondition: z.string().optional().nullable(),
  notes: z.string().optional(),
  confirmationNotes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  setupIds: z.array(z.string()).optional(),
  confirmationIds: z.array(z.string()).optional(),
  energyLevel: z.number().int().min(1).max(5).optional().nullable(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  stressLevel: z.enum(["low", "medium", "high"]).optional().nullable(),
  stateMoodTag: z.string().max(64).optional().nullable(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "20", 10)));
  const symbol = searchParams.get("symbol") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const instrumentType = searchParams.get("instrumentType") || undefined;
  const setupId = searchParams.get("setupId") || undefined;
  const confirmationId = searchParams.get("confirmationId") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const includeImages = searchParams.get("includeImages") === "true";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (symbol) where.symbol = { contains: symbol };
  if (instrumentType) where.instrumentType = instrumentType;
  if (tag) {
    where.tags = { some: { name: tag } };
  }
  if (setupId) {
    where.setups = { some: { setupTypeId: setupId } };
  }
  if (confirmationId) {
    where.confirmations = { some: { confirmationTypeId: confirmationId } };
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom + "T00:00:00Z");
    if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo + "T23:59:59Z");
  }

  const includeOpt = {
    tags: true,
    setups: { include: { setupType: true } },
    confirmations: { include: { confirmationType: true } },
    ...(includeImages && { images: true }),
  };

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: includeOpt,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trade.count({ where }),
  ]);

  return NextResponse.json({
    trades,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const kill = await assertTradeCreationAllowed(prisma, session.user.id, data.date);
    if (!kill.ok) {
      return NextResponse.json({ error: kill.message }, { status: 403 });
    }

    const pnl =
      data.outcome === "win" ? data.risk * data.rr : data.outcome === "loss" ? -data.risk : 0;

    const tagNames = (data.tags ?? [])
      .map((name) => normalizeTagName(name))
      .filter(Boolean);
    const uniqueTags = Array.from(new Set(tagNames));

    const trade = await prisma.trade.create({
      data: {
        userId: session.user.id,
        symbol: data.symbol,
        direction: data.direction,
        instrumentType: data.instrumentType,
        risk: data.risk,
        rr: data.rr,
        outcome: data.outcome,
        pnl,
        fees: data.fees,
        date: new Date(data.date + "T12:00:00Z"),
        marketCondition: data.marketCondition ?? undefined,
        notes: data.notes,
        confirmationNotes: data.confirmationNotes ?? undefined,
        energyLevel: data.energyLevel ?? undefined,
        sleepHours: data.sleepHours ?? undefined,
        stressLevel: data.stressLevel ?? undefined,
        stateMoodTag: data.stateMoodTag?.trim() || undefined,
        tags: uniqueTags.length
          ? { create: uniqueTags.map((name) => ({ name })) }
          : undefined,
        setups: data.setupIds?.length
          ? { create: data.setupIds.map((setupTypeId) => ({ setupTypeId })) }
          : undefined,
        confirmations: data.confirmationIds?.length
          ? { create: data.confirmationIds.map((confirmationTypeId) => ({ confirmationTypeId })) }
          : undefined,
      },
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
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
}
