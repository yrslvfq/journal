import type { PrismaClient } from "@prisma/client";

const COOLDOWN_MS = 30 * 60 * 1000;

export function dayBoundsUtc(ymd: string): { start: Date; end: Date } {
  const start = new Date(`${ymd}T00:00:00.000Z`);
  const end = new Date(`${ymd}T23:59:59.999Z`);
  return { start, end };
}

export type TradeForStreak = { pnl: number; fees: number; createdAt: Date };

export function consecutiveLossStreakAtEnd(trades: TradeForStreak[]): number {
  let c = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const net = trades[i].pnl - trades[i].fees;
    if (net < 0) c += 1;
    else break;
  }
  return c;
}

export async function loadTradesForDayOrdered(
  prisma: PrismaClient,
  userId: string,
  ymd: string
) {
  const { start, end } = dayBoundsUtc(ymd);
  return prisma.trade.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    orderBy: [{ createdAt: "asc" }],
    select: { pnl: true, fees: true, createdAt: true },
  });
}

export async function getLossStreakForDay(
  prisma: PrismaClient,
  userId: string,
  ymd: string
): Promise<number> {
  const trades = await loadTradesForDayOrdered(prisma, userId, ymd);
  return consecutiveLossStreakAtEnd(trades);
}

export async function getKillSwitchStatus(
  prisma: PrismaClient,
  userId: string,
  ymd: string
) {
  const streak = await getLossStreakForDay(prisma, userId, ymd);
  const now = new Date();

  if (streak < 3) {
    await prisma.killSwitchPause.deleteMany({ where: { userId } });
    return { blocked: false, streak, secondsRemaining: 0 as number };
  }

  let pause = await prisma.killSwitchPause.findUnique({ where: { userId } });

  if (!pause) {
    pause = await prisma.killSwitchPause.create({
      data: { userId, until: new Date(now.getTime() + COOLDOWN_MS) },
    });
  }

  if (pause.until > now) {
    const secondsRemaining = Math.max(0, Math.ceil((pause.until.getTime() - now.getTime()) / 1000));
    return { blocked: true, streak, secondsRemaining };
  }

  return { blocked: false, streak, secondsRemaining: 0 };
}

export async function assertTradeCreationAllowed(
  prisma: PrismaClient,
  userId: string,
  tradeDateYmd: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const streak = await getLossStreakForDay(prisma, userId, tradeDateYmd);
  if (streak < 3) {
    await prisma.killSwitchPause.deleteMany({ where: { userId } });
    return { ok: true };
  }

  const now = new Date();
  let pause = await prisma.killSwitchPause.findUnique({ where: { userId } });

  if (!pause) {
    await prisma.killSwitchPause.create({
      data: { userId, until: new Date(now.getTime() + COOLDOWN_MS) },
    });
    return {
      ok: false,
      message:
        "Pause required: 3 losing trades in a row today. Wait 30 minutes or open the add-trade page to see the cooldown timer.",
    };
  }

  if (pause.until > now) {
    return {
      ok: false,
      message: "Kill switch: cooldown active after 3 consecutive losses today.",
    };
  }

  return { ok: true };
}
