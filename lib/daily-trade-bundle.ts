import { computeDaySessionMetrics } from "@/lib/session-efficiency";
import { prisma } from "@/lib/prisma";

export async function getUserDayTradingBundle(userId: string, dayStart: Date) {
  const dayEnd = new Date(dayStart.getTime() + 864e5);
  const trades = await prisma.trade.findMany({
    where: { userId, date: { gte: dayStart, lt: dayEnd } },
    select: { pnl: true, fees: true },
  });
  const dayPnl = trades.reduce((s, t) => s + t.pnl - t.fees, 0);
  let dayWins = 0;
  let dayLosses = 0;
  let dayBreakeven = 0;
  for (const t of trades) {
    const net = t.pnl - t.fees;
    if (net > 0) dayWins++;
    else if (net < 0) dayLosses++;
    else dayBreakeven++;
  }
  const sessionMetrics = computeDaySessionMetrics(trades);
  return {
    dayPnl,
    tradesCount: trades.length,
    dayWins,
    dayLosses,
    dayBreakeven,
    totalFees: sessionMetrics.totalFees,
    sessionMetrics,
  };
}
