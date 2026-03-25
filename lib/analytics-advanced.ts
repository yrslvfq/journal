/** Server-safe helpers for Monte Carlo, activity heatmap (MSK), and Kelly. */

const MONTE_CARLO_ITERATIONS = 1000;
const CHART_PATHS = 10;

const MSK_WEEKDAY_TO_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
};

export type MonteCarloBootstrapDto = {
  finalEquityP5: number;
  finalEquityP50: number;
  finalEquityP95: number;
  maxDdP5: number;
  maxDdP50: number;
  maxDdP95: number;
  meanFinalEquity: number;
  probFinalNegativePct: number;
};

export type MonteCarloDto = {
  tradeCount: number;
  iterations: number;
  historicalMaxDrawdown: number;
  /** Share of simulations whose max drawdown is at least the historical (chronological) max DD. */
  maxDrawdownProbabilityPct: number;
  medianSimulatedMaxDrawdown: number;
  /** Simulated max DD distribution (permutation). */
  maxDdPercentiles: { p5: number; p50: number; p95: number; simMax: number };
  /** Max consecutive losing trades (net &lt; 0). */
  historicalMaxLossStreak: number;
  lossStreakGeHistoricalProbPct: number;
  simulatedLossStreakMedian: number;
  simulatedLossStreakP95: number;
  /** Longest run of steps strictly below running peak equity. */
  historicalMaxUnderwater: number;
  underwaterGeHistoricalProbPct: number;
  simulatedUnderwaterMedian: number;
  simulatedUnderwaterP95: number;
  /** Mean of per-trade R-multiple (net/risk) on last shuffle sample path — informational. */
  historicalAvgR: number | null;
  simulatedAvgRMedian: number | null;
  bootstrap: MonteCarloBootstrapDto | null;
  ddHistogram: { binLabel: string; count: number }[];
  chartRows: { step: number; [key: string]: number | string }[];
  pathKeys: string[];
};

export type HeatmapCellDto = {
  weekday: number;
  weekdayLabel: string;
  hour: number;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitFactor: number | null;
  pnl: number;
};

export type ActivityHeatmapDto = {
  cells: HeatmapCellDto[];
  usSessionHoursMsk: [number, number];
};

export type KellyDto = {
  winRateDecimal: number;
  payoffRatio: number | null;
  fullKellyFraction: number | null;
  fractionalKellyFraction: number | null;
  recommendedRiskFraction: number | null;
  recommendedRiskPct: number | null;
  capFraction: number;
  decidedTrades: number;
};

function shuffleInPlace(arr: number[], rnd: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function maxDrawdownFromPnls(pnls: number[]): number {
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const x of pnls) {
    equity += x;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }
  return maxDd;
}

function medianSorted(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export function maxConsecutiveLosses(pnls: number[]): number {
  let cur = 0;
  let best = 0;
  for (const x of pnls) {
    if (x < 0) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

export function maxUnderwaterLength(pnls: number[]): number {
  let equity = 0;
  let peak = 0;
  let span = 0;
  let maxSpan = 0;
  for (const x of pnls) {
    equity += x;
    if (equity >= peak) {
      peak = equity;
      span = 0;
    } else {
      span += 1;
      maxSpan = Math.max(maxSpan, span);
    }
  }
  return maxSpan;
}

function shuffleTwoInPlace(a: number[], b: number[] | null, rnd: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
    if (b) [b[i], b[j]] = [b[j], b[i]];
  }
}

function avgRMultiple(pnls: number[], risks: number[] | null): number | null {
  if (!risks || risks.length !== pnls.length) return null;
  let sum = 0;
  let k = 0;
  for (let i = 0; i < pnls.length; i++) {
    const r = risks[i]!;
    if (r > 0) {
      sum += pnls[i]! / r;
      k += 1;
    }
  }
  return k > 0 ? sum / k : null;
}

function buildDdHistogram(maxDds: number[], bins: number): { binLabel: string; count: number }[] {
  if (maxDds.length === 0) return [];
  const sorted = [...maxDds].sort((a, b) => a - b);
  const minV = sorted[0]!;
  const maxV = sorted[sorted.length - 1]!;
  if (minV === maxV) {
    return [{ binLabel: minV.toFixed(0), count: maxDds.length }];
  }
  const step = (maxV - minV) / bins;
  const counts = new Array(bins).fill(0);
  for (const d of maxDds) {
    let i = Math.floor((d - minV) / step);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    counts[i] += 1;
  }
  return counts.map((count, i) => {
    const lo = minV + i * step;
    const hi = minV + (i + 1) * step;
    return { binLabel: `${lo.toFixed(0)}–${hi.toFixed(0)}`, count };
  });
}

function computeBootstrapBlock(
  netPnls: number[],
  iterations: number,
  rnd: () => number
): MonteCarloBootstrapDto {
  const n = netPnls.length;
  const finals: number[] = [];
  const maxDdsB: number[] = [];
  const path: number[] = new Array(n);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      path[i] = netPnls[Math.floor(rnd() * n)]!;
    }
    finals.push(path.reduce((s, x) => s + x, 0));
    maxDdsB.push(maxDrawdownFromPnls(path));
  }
  const sortF = [...finals].sort((a, b) => a - b);
  const sortD = [...maxDdsB].sort((a, b) => a - b);
  const probNeg = finals.filter((x) => x < 0).length / iterations;
  return {
    finalEquityP5: percentileSorted(sortF, 5),
    finalEquityP50: percentileSorted(sortF, 50),
    finalEquityP95: percentileSorted(sortF, 95),
    maxDdP5: percentileSorted(sortD, 5),
    maxDdP50: percentileSorted(sortD, 50),
    maxDdP95: percentileSorted(sortD, 95),
    meanFinalEquity: finals.reduce((a, b) => a + b, 0) / finals.length,
    probFinalNegativePct: probNeg * 100,
  };
}

export function computeMonteCarlo(
  netPnlsChronological: number[],
  risksChronological: number[] | null,
  rnd: () => number = Math.random
): MonteCarloDto {
  const n = netPnlsChronological.length;
  const pathKeys = Array.from({ length: CHART_PATHS }, (_, i) => `p${i}`);

  const emptyExtras = () => ({
    maxDdPercentiles: { p5: 0, p50: 0, p95: 0, simMax: 0 },
    historicalMaxLossStreak: 0,
    lossStreakGeHistoricalProbPct: 0,
    simulatedLossStreakMedian: 0,
    simulatedLossStreakP95: 0,
    historicalMaxUnderwater: 0,
    underwaterGeHistoricalProbPct: 0,
    simulatedUnderwaterMedian: 0,
    simulatedUnderwaterP95: 0,
    historicalAvgR: null as number | null,
    simulatedAvgRMedian: null as number | null,
    ddHistogram: [] as { binLabel: string; count: number }[],
    bootstrap: null as MonteCarloBootstrapDto | null,
  });

  if (n < 2) {
    const histDd = n === 1 ? maxDrawdownFromPnls(netPnlsChronological) : 0;
    return {
      tradeCount: n,
      iterations: MONTE_CARLO_ITERATIONS,
      historicalMaxDrawdown: histDd,
      maxDrawdownProbabilityPct: 0,
      medianSimulatedMaxDrawdown: 0,
      ...emptyExtras(),
      chartRows: [],
      pathKeys,
    };
  }

  const historicalMaxDrawdown = maxDrawdownFromPnls(netPnlsChronological);
  const historicalMaxLossStreak = maxConsecutiveLosses(netPnlsChronological);
  const historicalMaxUnderwater = maxUnderwaterLength(netPnlsChronological);
  const historicalAvgR = avgRMultiple(netPnlsChronological, risksChronological);

  const risks =
    risksChronological && risksChronological.length === n ? [...risksChronological] : null;

  const maxDds: number[] = [];
  const lossStreaks: number[] = [];
  const underwaters: number[] = [];
  const avgRs: number[] = [];
  const chartPathEquities: number[][] = [];
  const chartIterIndices = new Set<number>();
  while (chartIterIndices.size < CHART_PATHS) {
    chartIterIndices.add(Math.floor(rnd() * MONTE_CARLO_ITERATIONS));
  }

  const working = [...netPnlsChronological];
  const riskWorking = risks ? [...risks] : null;

  for (let iter = 0; iter < MONTE_CARLO_ITERATIONS; iter++) {
    for (let i = 0; i < n; i++) working[i] = netPnlsChronological[i]!;
    if (riskWorking) {
      for (let i = 0; i < n; i++) riskWorking[i] = risksChronological![i]!;
    }
    shuffleTwoInPlace(working, riskWorking, rnd);
    const dd = maxDrawdownFromPnls(working);
    maxDds.push(dd);
    lossStreaks.push(maxConsecutiveLosses(working));
    underwaters.push(maxUnderwaterLength(working));
    const ar = avgRMultiple(working, riskWorking);
    if (ar != null) avgRs.push(ar);

    if (chartIterIndices.has(iter)) {
      let eq = 0;
      chartPathEquities.push(working.map((x) => (eq += x, eq)));
    }
  }

  const exceedDd = maxDds.filter((d) => d >= historicalMaxDrawdown - 1e-9).length;
  const maxDrawdownProbabilityPct = (exceedDd / MONTE_CARLO_ITERATIONS) * 100;
  const sortedDd = [...maxDds].sort((a, b) => a - b);
  const medianSimulatedMaxDrawdown = medianSorted(sortedDd);

  const maxDdPercentiles = {
    p5: percentileSorted(sortedDd, 5),
    p50: percentileSorted(sortedDd, 50),
    p95: percentileSorted(sortedDd, 95),
    simMax: sortedDd[sortedDd.length - 1]!,
  };

  const streakGe = lossStreaks.filter((s) => s >= historicalMaxLossStreak).length;
  const lossStreakGeHistoricalProbPct = (streakGe / MONTE_CARLO_ITERATIONS) * 100;
  const sortedStreak = [...lossStreaks].sort((a, b) => a - b);
  const simulatedLossStreakMedian = medianSorted(sortedStreak);
  const simulatedLossStreakP95 = percentileSorted(sortedStreak, 95);

  const uwGe = underwaters.filter((u) => u >= historicalMaxUnderwater).length;
  const underwaterGeHistoricalProbPct = (uwGe / MONTE_CARLO_ITERATIONS) * 100;
  const sortedUw = [...underwaters].sort((a, b) => a - b);
  const simulatedUnderwaterMedian = medianSorted(sortedUw);
  const simulatedUnderwaterP95 = percentileSorted(sortedUw, 95);

  const sortedAvgR = [...avgRs].sort((a, b) => a - b);
  const simulatedAvgRMedian = avgRs.length > 0 ? medianSorted(sortedAvgR) : null;

  const ddHistogram = buildDdHistogram(maxDds, 12);
  const bootstrap = computeBootstrapBlock(netPnlsChronological, MONTE_CARLO_ITERATIONS, rnd);

  const chartRows: { step: number; [key: string]: number | string }[] = [];
  for (let step = 0; step <= n; step++) {
    const row: { step: number; [key: string]: number | string } = { step };
    for (let p = 0; p < chartPathEquities.length; p++) {
      row[`p${p}`] = step === 0 ? 0 : chartPathEquities[p]![step - 1]!;
    }
    chartRows.push(row);
  }

  return {
    tradeCount: n,
    iterations: MONTE_CARLO_ITERATIONS,
    historicalMaxDrawdown,
    maxDrawdownProbabilityPct,
    medianSimulatedMaxDrawdown,
    maxDdPercentiles,
    historicalMaxLossStreak,
    lossStreakGeHistoricalProbPct,
    simulatedLossStreakMedian,
    simulatedLossStreakP95,
    historicalMaxUnderwater,
    underwaterGeHistoricalProbPct,
    simulatedUnderwaterMedian,
    simulatedUnderwaterP95,
    historicalAvgR,
    simulatedAvgRMedian,
    bootstrap,
    ddHistogram,
    chartRows,
    pathKeys,
  };
}

export function tradeMskWeekdayHour(date: Date): { weekday: number; hour: number } | null {
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
  }).format(date);
  const day = MSK_WEEKDAY_TO_INDEX[weekdayShort];
  if (day == null) return null;
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    hour: "numeric",
    hour12: false,
  }).format(date);
  const hour = Number.parseInt(hourStr, 10);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  return { weekday: day, hour };
}

export function buildActivityHeatmap(
  trades: { date: Date; pnl: number; fees: number }[]
): ActivityHeatmapDto {
  type Acc = {
    pnl: number;
    wins: number;
    losses: number;
    grossProfit: number;
    grossLoss: number;
  };
  const grid = new Map<string, Acc>();

  for (const t of trades) {
    const slot = tradeMskWeekdayHour(t.date);
    if (!slot) continue;
    const net = t.pnl - t.fees;
    const key = `${slot.weekday}\t${slot.hour}`;
    if (!grid.has(key)) {
      grid.set(key, { pnl: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0 });
    }
    const cell = grid.get(key)!;
    cell.pnl += net;
    if (net > 0) {
      cell.wins += 1;
      cell.grossProfit += net;
    } else if (net < 0) {
      cell.losses += 1;
      cell.grossLoss += Math.abs(net);
    }
  }

  const cells: HeatmapCellDto[] = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${weekday}\t${hour}`;
      const acc = grid.get(key) ?? {
        pnl: 0,
        wins: 0,
        losses: 0,
        grossProfit: 0,
        grossLoss: 0,
      };
      const tradesCount = acc.wins + acc.losses;
      const decided = acc.wins + acc.losses;
      const winRatePct = decided > 0 ? (acc.wins / decided) * 100 : 0;
      let profitFactor: number | null = null;
      if (acc.grossLoss > 0) profitFactor = acc.grossProfit / acc.grossLoss;
      else if (acc.grossProfit > 0) profitFactor = 999.99;

      cells.push({
        weekday,
        weekdayLabel: "",
        hour,
        trades: tradesCount,
        wins: acc.wins,
        losses: acc.losses,
        winRatePct,
        profitFactor,
        pnl: acc.pnl,
      });
    }
  }

  return {
    cells,
    usSessionHoursMsk: [16, 23],
  };
}

const KELLY_FRACTION = 0.25;
const KELLY_CAP_FRACTION = 0.025;

export function computeKelly(
  wins: number,
  losses: number,
  avgWin: number,
  avgLossAbs: number
): KellyDto {
  const decided = wins + losses;
  if (decided === 0) {
    return {
      winRateDecimal: 0,
      payoffRatio: null,
      fullKellyFraction: null,
      fractionalKellyFraction: null,
      recommendedRiskFraction: null,
      recommendedRiskPct: null,
      capFraction: KELLY_CAP_FRACTION,
      decidedTrades: 0,
    };
  }

  const W = wins / decided;
  const R = avgLossAbs > 0 ? avgWin / avgLossAbs : null;
  let fullKellyFraction: number | null = null;
  if (losses === 0 && wins > 0) {
    fullKellyFraction = 1;
  } else if (R != null && R > 0 && W > 0 && W < 1) {
    const k = W - (1 - W) / R;
    fullKellyFraction = k > 0 ? k : 0;
  } else if (R != null && R > 0 && W >= 1) {
    fullKellyFraction = W;
  }

  const fractional =
    fullKellyFraction != null ? Math.max(0, fullKellyFraction * KELLY_FRACTION) : null;
  const recommended =
    fractional != null ? Math.min(fractional, KELLY_CAP_FRACTION) : null;

  return {
    winRateDecimal: W,
    payoffRatio: R,
    fullKellyFraction,
    fractionalKellyFraction: fractional,
    recommendedRiskFraction: recommended,
    recommendedRiskPct: recommended != null ? recommended * 100 : null,
    capFraction: KELLY_CAP_FRACTION,
    decidedTrades: decided,
  };
}

export function disciplineScoreFromChecklist(
  keptLossLimit: boolean,
  setupsOnly: boolean,
  noStopMoving: boolean
): number {
  const n = [keptLossLimit, setupsOnly, noStopMoving].filter(Boolean).length;
  return Math.max(1, Math.round((n / 3) * 100));
}
