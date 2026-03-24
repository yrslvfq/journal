import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  psychSegmentStats,
  sleepBandId,
  SLEEP_BAND_ORDER,
  stressLevelToIndex,
  tradeNet,
  type SleepBandId,
  type TradePsychSlice,
} from "@/lib/analytics-psych";

const SEGMENT_HIGHLIGHT_MIN = 3;

function pickBestWorstEnergy(rows: { energy: number; avgPnl: number; count: number }[]) {
  if (rows.length === 0) {
    return { best: null as null, worst: null as null };
  }
  let best = rows[0];
  let worst = rows[0];
  for (const r of rows) {
    if (r.avgPnl > best.avgPnl) best = r;
    if (r.avgPnl < worst.avgPnl) worst = r;
  }
  return { best, worst };
}

function pickBestWorstStress(rows: { level: string; avgPnl: number; count: number }[]) {
  if (rows.length === 0) {
    return { best: null as null, worst: null as null };
  }
  let best = rows[0];
  let worst = rows[0];
  for (const r of rows) {
    if (r.avgPnl > best.avgPnl) best = r;
    if (r.avgPnl < worst.avgPnl) worst = r;
  }
  return { best, worst };
}

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
      energyLevel: true,
      sleepHours: true,
      stressLevel: true,
      stateMoodTag: true,
    },
    orderBy: { date: "asc" },
  });

  const psychTrades: TradePsychSlice[] = trades;

  const withAnyPsych = psychTrades.filter(
    (t) =>
      t.energyLevel != null ||
      t.sleepHours != null ||
      !!t.stressLevel ||
      !!(t.stateMoodTag && t.stateMoodTag.trim())
  );
  const psychTotal = psychTrades.length;
  const fieldPct = (n: number) => (psychTotal > 0 ? (n / psychTotal) * 100 : 0);
  const countEnergy = psychTrades.filter((t) => t.energyLevel != null).length;
  const countSleep = psychTrades.filter((t) => t.sleepHours != null).length;
  const countStress = psychTrades.filter((t) => !!t.stressLevel).length;
  const countMood = psychTrades.filter((t) => !!(t.stateMoodTag && t.stateMoodTag.trim())).length;
  const psychCoverage = {
    total: psychTotal,
    withAny: withAnyPsych.length,
    percent: psychTotal > 0 ? (withAnyPsych.length / psychTotal) * 100 : 0,
    byField: {
      energy: { count: countEnergy, percent: fieldPct(countEnergy) },
      sleep: { count: countSleep, percent: fieldPct(countSleep) },
      stress: { count: countStress, percent: fieldPct(countStress) },
      mood: { count: countMood, percent: fieldPct(countMood) },
    },
  };

  const byStress = (["low", "medium", "high"] as const).map((level) => {
    const subset = psychTrades.filter((t) => t.stressLevel === level);
    const s = psychSegmentStats(subset);
    return {
      level,
      ...s,
    };
  });

  const byEnergy = [1, 2, 3, 4, 5].map((energy) => {
    const subset = psychTrades.filter((t) => t.energyLevel === energy);
    const s = psychSegmentStats(subset);
    return { energy, ...s };
  });

  const sleepBuckets = new Map<SleepBandId, TradePsychSlice[]>();
  for (const t of psychTrades) {
    if (t.sleepHours == null) continue;
    const band = sleepBandId(t.sleepHours);
    if (!sleepBuckets.has(band)) sleepBuckets.set(band, []);
    sleepBuckets.get(band)!.push(t);
  }
  const bySleepBand = SLEEP_BAND_ORDER.filter((band) => sleepBuckets.has(band)).map((band) => {
    const subset = sleepBuckets.get(band)!;
    return { band, ...psychSegmentStats(subset) };
  });

  const moodMap = new Map<string, TradePsychSlice[]>();
  for (const t of psychTrades) {
    const tag = t.stateMoodTag?.trim();
    if (!tag) continue;
    if (!moodMap.has(tag)) moodMap.set(tag, []);
    moodMap.get(tag)!.push(t);
  }
  const byMoodTag = Array.from(moodMap.entries())
    .map(([tag, subset]) => ({ tag, ...psychSegmentStats(subset) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);

  const psychWinTrades = psychTrades.filter((t) => tradeNet(t) > 0);
  const psychLossTrades = psychTrades.filter((t) => tradeNet(t) < 0);
  const withEnergy = (arr: TradePsychSlice[]) =>
    arr.filter((t): t is TradePsychSlice & { energyLevel: number } => t.energyLevel != null);
  const withSleep = (arr: TradePsychSlice[]) =>
    arr.filter((t): t is TradePsychSlice & { sleepHours: number } => t.sleepHours != null);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const stressIndices = (arr: TradePsychSlice[]) =>
    arr
      .map((t) => stressLevelToIndex(t.stressLevel))
      .filter((v): v is number => v != null);

  const fragileSubset = psychTrades.filter(
    (t) => t.stressLevel === "high" && t.energyLevel != null && t.energyLevel <= 2
  );
  const fragileState = psychSegmentStats(fragileSubset);

  const stressEnergyMap = new Map<string, TradePsychSlice[]>();
  for (const t of psychTrades) {
    if (t.stressLevel !== "low" && t.stressLevel !== "medium" && t.stressLevel !== "high") continue;
    if (t.energyLevel == null) continue;
    const key = `${t.stressLevel}\t${t.energyLevel}`;
    if (!stressEnergyMap.has(key)) stressEnergyMap.set(key, []);
    stressEnergyMap.get(key)!.push(t);
  }
  const stressEnergyGrid = Array.from(stressEnergyMap.entries())
    .map(([key, subset]) => {
      const [stressLevel, energyStr] = key.split("\t");
      const energy = Number(energyStr);
      return { stressLevel, energy, ...psychSegmentStats(subset) };
    })
    .sort((a, b) => b.count - a.count);

  const energyForHighlight = byEnergy
    .filter((r) => r.count >= SEGMENT_HIGHLIGHT_MIN)
    .map((r) => ({ energy: r.energy, avgPnl: r.avgPnl, count: r.count }));
  const stressForHighlight = byStress
    .filter((r) => r.count >= SEGMENT_HIGHLIGHT_MIN)
    .map((r) => ({ level: r.level, avgPnl: r.avgPnl, count: r.count }));
  const eHw = pickBestWorstEnergy(energyForHighlight);
  const sHw = pickBestWorstStress(stressForHighlight);
  const segmentHighlights = {
    bestEnergy:
      eHw.best != null ? { energy: eHw.best.energy, avgPnl: eHw.best.avgPnl, count: eHw.best.count } : null,
    worstEnergy:
      eHw.worst != null ? { energy: eHw.worst.energy, avgPnl: eHw.worst.avgPnl, count: eHw.worst.count } : null,
    bestStress:
      sHw.best != null ? { level: sHw.best.level, avgPnl: sHw.best.avgPnl, count: sHw.best.count } : null,
    worstStress:
      sHw.worst != null ? { level: sHw.worst.level, avgPnl: sHw.worst.avgPnl, count: sHw.worst.count } : null,
  };

  const psychInsights = {
    avgEnergyWins: avg(withEnergy(psychWinTrades).map((t) => t.energyLevel)),
    avgEnergyLosses: avg(withEnergy(psychLossTrades).map((t) => t.energyLevel)),
    avgSleepWins: avg(withSleep(psychWinTrades).map((t) => t.sleepHours)),
    avgSleepLosses: avg(withSleep(psychLossTrades).map((t) => t.sleepHours)),
    avgStressIndexWins: avg(stressIndices(psychWinTrades)),
    avgStressIndexLosses: avg(stressIndices(psychLossTrades)),
  };

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
    psych: {
      coverage: psychCoverage,
      byStress,
      byEnergy,
      bySleepBand,
      byMoodTag,
      insights: psychInsights,
      fragileState,
      stressEnergyGrid,
      segmentHighlights,
    },
  });
}
