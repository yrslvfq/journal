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
  const period = searchParams.get("period") || "month";
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");

  const now = new Date();
  let from: Date;
  let to: Date | undefined;

  if (period === "all") {
    from = new Date(1970, 0, 1);
  } else if (period === "custom" && dateFromParam && dateToParam) {
    from = new Date(dateFromParam + "T00:00:00Z");
    to = new Date(dateToParam + "T23:59:59Z");
  } else if (period === "day") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    from = new Date(now.getFullYear(), now.getMonth(), diff);
  } else if (period === "year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const dateFilter: { gte: Date; lte?: Date } = { gte: from };
  if (to) dateFilter.lte = to;

  const trades = await prisma.trade.findMany({
    where: {
      userId: session.user.id,
      date: dateFilter,
    },
    select: {
      id: true,
      symbol: true,
      pnl: true,
      fees: true,
      risk: true,
      date: true,
      instrumentType: true,
      tags: { select: { name: true } },
      setups: { include: { setupType: true } },
      confirmations: { include: { confirmationType: true } },
    },
    orderBy: { date: "asc" },
  });

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl - t.fees, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const decidedTrades = wins + losses;
  const winRate = decidedTrades > 0 ? (wins / decidedTrades) * 100 : 0;
  const avgWin =
    wins > 0
      ? trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins
      : 0;
  const avgLoss =
    losses > 0
      ? trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0) / losses
      : 0;
  const expectancy =
    decidedTrades > 0
      ? (winRate / 100) * avgWin + ((100 - winRate) / 100) * avgLoss
      : 0;

  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl - t.fees, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl - t.fees, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  for (const t of trades) {
    const isWin = t.pnl - t.fees > 0;
    const isLoss = t.pnl - t.fees < 0;
    if (isWin) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (isLoss) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  const bySymbol: Record<string, { pnl: number; count: number }> = {};
  for (const t of trades) {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { pnl: 0, count: 0 };
    bySymbol[t.symbol].pnl += t.pnl - t.fees;
    bySymbol[t.symbol].count += 1;
  }

  const bySetup: Record<string, { pnl: number; count: number; name: string }> = {};
  for (const t of trades) {
    const pnlNet = t.pnl - t.fees;
    if (t.setups.length === 0) {
      const key = "_none";
      if (!bySetup[key]) bySetup[key] = { pnl: 0, count: 0, name: "None" };
      bySetup[key].pnl += pnlNet;
      bySetup[key].count += 1;
    } else {
      for (const s of t.setups) {
        const key = s.setupType.id;
        if (!bySetup[key]) bySetup[key] = { pnl: 0, count: 0, name: s.setupType.name };
        bySetup[key].pnl += pnlNet;
        bySetup[key].count += 1;
      }
    }
  }

  const byConfirmation: Record<string, { pnl: number; count: number; name: string }> = {};
  for (const t of trades) {
    const pnlNet = t.pnl - t.fees;
    if (t.confirmations.length === 0) {
      const key = "_none";
      if (!byConfirmation[key]) byConfirmation[key] = { pnl: 0, count: 0, name: "None" };
      byConfirmation[key].pnl += pnlNet;
      byConfirmation[key].count += 1;
    } else {
      for (const c of t.confirmations) {
        const key = c.confirmationType.id;
        if (!byConfirmation[key]) byConfirmation[key] = { pnl: 0, count: 0, name: c.confirmationType.name };
        byConfirmation[key].pnl += pnlNet;
        byConfirmation[key].count += 1;
      }
    }
  }

  const byDay: Record<string, number> = {};
  for (const t of trades) {
    const key = t.date.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = 0;
    byDay[key] += t.pnl - t.fees;
  }

  let running = 0;
  const cumulativeData = trades.map((t) => {
    running += t.pnl - t.fees;
    return {
      date: t.date.toISOString(),
      pnl: t.pnl - t.fees,
      cumulative: running,
    };
  });

  let peak = 0;
  let maxDrawdown = 0;
  const drawdownData = cumulativeData.map((item) => {
    peak = Math.max(peak, item.cumulative);
    const drawdown = peak - item.cumulative;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    return {
      date: item.date,
      cumulative: item.cumulative,
      drawdown,
    };
  });

  const dailyData = Object.entries(byDay)
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Professional metrics
  const pnlPerTrade = trades.map((t) => t.pnl - t.fees);
  const avgTrade = trades.length > 0 ? totalPnl / trades.length : 0;
  const variance =
    trades.length > 1
      ? pnlPerTrade.reduce((s, x) => s + (x - avgTrade) ** 2, 0) / (trades.length - 1)
      : 0;
  const stdDevPnl = Math.sqrt(variance);
  const sharpeRatio =
    trades.length >= 2 && stdDevPnl > 0
      ? (avgTrade / stdDevPnl) * Math.sqrt(trades.length)
      : null;
  const payoffRatio =
    losses > 0 && avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : wins > 0 ? Infinity : null;
  const recoveryFactor =
    maxDrawdown > 0 ? totalPnl / maxDrawdown : totalPnl > 0 ? Infinity : null;
  const calmarRatio =
    maxDrawdown > 0 ? totalPnl / maxDrawdown : totalPnl > 0 ? Infinity : null;
  const bestTrade = pnlPerTrade.length > 0 ? Math.max(...pnlPerTrade) : null;
  const worstTrade = pnlPerTrade.length > 0 ? Math.min(...pnlPerTrade) : null;
  const breakevenCount = trades.filter((t) => Math.abs(t.pnl - t.fees) < 0.01).length;
  const totalRisk = trades.reduce((s, t) => s + t.risk, 0);
  const expectancyPerRisk = totalRisk > 0 ? totalPnl / totalRisk : null;
  const sortedPnl = [...pnlPerTrade].sort((a, b) => a - b);
  const medianTrade =
    sortedPnl.length > 0
      ? sortedPnl.length % 2 === 1
        ? sortedPnl[Math.floor(sortedPnl.length / 2)]
        : (sortedPnl[sortedPnl.length / 2 - 1] + sortedPnl[sortedPnl.length / 2]) / 2
      : null;

  const daysWithTrades = new Set(trades.map((t) => t.date.toISOString().slice(0, 10))).size;
  const tradesPerDay = daysWithTrades > 0 ? trades.length / daysWithTrades : null;

  return NextResponse.json({
    summary: {
      totalPnl,
      tradesCount: trades.length,
      wins,
      losses,
      winRate,
      avgWin,
      avgLoss,
      expectancy,
      profitFactor: profitFactor === Infinity ? 999.99 : profitFactor,
      maxDrawdown,
      currentWinStreak,
      currentLossStreak,
      maxWinStreak,
      maxLossStreak,
      avgTrade,
      medianTrade,
      stdDevPnl,
      sharpeRatio: sharpeRatio != null ? Math.min(99, sharpeRatio) : null,
      payoffRatio: payoffRatio != null && payoffRatio !== Infinity ? Math.min(99, payoffRatio) : payoffRatio,
      recoveryFactor: recoveryFactor != null && recoveryFactor !== Infinity ? Math.min(99, recoveryFactor) : recoveryFactor,
      calmarRatio: calmarRatio != null && calmarRatio !== Infinity ? Math.min(99, calmarRatio) : calmarRatio,
      bestTrade,
      worstTrade,
      breakevenCount,
      expectancyPerRisk,
      totalRisk,
      tradesPerDay: tradesPerDay != null ? Math.round(tradesPerDay * 10) / 10 : null,
    },
    bySymbol: Object.entries(bySymbol).map(([symbol, data]) => ({
      symbol,
      ...data,
    })),
    bySetup: Object.entries(bySetup).map(([id, data]) => ({ id, ...data })),
    byConfirmation: Object.entries(byConfirmation).map(([id, data]) => ({ id, ...data })),
    dailyPnl: dailyData,
    cumulativeData,
    drawdownData,
  });
}
