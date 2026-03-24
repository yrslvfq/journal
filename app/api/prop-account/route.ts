import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { distanceToLiquidation, type PropAccountInput } from "@/lib/prop-guard";

const DEFAULTS: PropAccountInput = {
  startingBalance: 50_000,
  maxDailyLossPercent: 5,
  maxDailyLossUsd: null,
  maxTrailingDrawdownPercent: 10,
  peakBalance: 50_000,
};

const putSchema = z.object({
  startingBalance: z.number().positive(),
  maxDailyLossPercent: z.number().min(0).max(100),
  maxDailyLossUsd: z.number().positive().nullable().optional(),
  maxTrailingDrawdownPercent: z.number().min(0).max(100),
});

function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dayParam = searchParams.get("day") || ymdUtc(new Date());

  const [row, allTrades, todayTrades] = await Promise.all([
    prisma.propAccount.findUnique({ where: { userId: session.user.id } }),
    prisma.trade.findMany({
      where: { userId: session.user.id },
      select: { id: true, date: true, pnl: true, fees: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.trade.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(`${dayParam}T00:00:00.000Z`),
          lte: new Date(`${dayParam}T23:59:59.999Z`),
        },
      },
      select: { pnl: true, fees: true },
    }),
  ]);

  const cfg: PropAccountInput = row
    ? {
        startingBalance: row.startingBalance,
        maxDailyLossPercent: row.maxDailyLossPercent,
        maxDailyLossUsd: row.maxDailyLossUsd,
        maxTrailingDrawdownPercent: row.maxTrailingDrawdownPercent,
        peakBalance: row.peakBalance,
      }
    : { ...DEFAULTS };

  const totalNet = allTrades.reduce((s, t) => s + (t.pnl - t.fees), 0);
  const currentBalance = cfg.startingBalance + totalNet;
  const todayNetPnl = todayTrades.reduce((s, t) => s + (t.pnl - t.fees), 0);

  const effectivePeak = Math.max(cfg.peakBalance, currentBalance);

  if (row && effectivePeak > row.peakBalance) {
    await prisma.propAccount.update({
      where: { userId: session.user.id },
      data: { peakBalance: effectivePeak },
    });
    cfg.peakBalance = effectivePeak;
  } else if (!row) {
    cfg.peakBalance = effectivePeak;
  }

  const metrics = distanceToLiquidation({
    ...cfg,
    peakBalance: effectivePeak,
    currentBalance,
    todayNetPnl,
  });

  let running = cfg.startingBalance;
  const equityCurve = allTrades.map((t) => {
    running += t.pnl - t.fees;
    return {
      id: t.id,
      date: t.date.toISOString(),
      netPnl: t.pnl - t.fees,
      equity: running,
    };
  });

  return NextResponse.json({
    configured: !!row,
    settings: row
      ? {
          startingBalance: row.startingBalance,
          maxDailyLossPercent: row.maxDailyLossPercent,
          maxDailyLossUsd: row.maxDailyLossUsd,
          maxTrailingDrawdownPercent: row.maxTrailingDrawdownPercent,
          peakBalance: effectivePeak,
        }
      : null,
    currentBalance,
    todayNetPnl,
    day: dayParam,
    metrics,
    equityCurve,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const [totalNet, existing] = await Promise.all([
      prisma.trade
        .findMany({
          where: { userId: session.user.id },
          select: { pnl: true, fees: true },
        })
        .then((trades) => trades.reduce((s, t) => s + (t.pnl - t.fees), 0)),
      prisma.propAccount.findUnique({ where: { userId: session.user.id } }),
    ]);

    const currentBalance = data.startingBalance + totalNet;
    const peakBalance = Math.max(
      existing?.peakBalance ?? data.startingBalance,
      currentBalance
    );

    const row = await prisma.propAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        startingBalance: data.startingBalance,
        maxDailyLossPercent: data.maxDailyLossPercent,
        maxDailyLossUsd: data.maxDailyLossUsd ?? null,
        maxTrailingDrawdownPercent: data.maxTrailingDrawdownPercent,
        peakBalance,
      },
      update: {
        startingBalance: data.startingBalance,
        maxDailyLossPercent: data.maxDailyLossPercent,
        maxDailyLossUsd: data.maxDailyLossUsd ?? null,
        maxTrailingDrawdownPercent: data.maxTrailingDrawdownPercent,
        peakBalance,
      },
    });

    return NextResponse.json({
      settings: {
        startingBalance: row.startingBalance,
        maxDailyLossPercent: row.maxDailyLossPercent,
        maxDailyLossUsd: row.maxDailyLossUsd,
        maxTrailingDrawdownPercent: row.maxTrailingDrawdownPercent,
        peakBalance: row.peakBalance,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
