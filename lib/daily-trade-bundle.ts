import { computeDaySessionMetrics } from "@/lib/session-efficiency";
import { prisma } from "@/lib/prisma";

export async function getUserDayTradingBundle(userId: string, dayStart: Date) {
  const dayEnd = new Date(dayStart.getTime() + 864e5);
  const trades = await prisma.trade.findMany({
    where: { userId, date: { gte: dayStart, lt: dayEnd } },
    select: { pnl: true, fees: true },
  });
  const dayPnl = trades.reduce((s, t) => s + t.pnl - t.fees, 0);
  return {
    dayPnl,
    tradesCount: trades.length,
    sessionMetrics: computeDaySessionMetrics(trades),
  };
}
