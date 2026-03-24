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

export type MonteCarloDto = {
  tradeCount: number;
  iterations: number;
  historicalMaxDrawdown: number;
  /** Share of simulations whose max drawdown is at least the historical (chronological) max DD. */
  maxDrawdownProbabilityPct: number;
  medianSimulatedMaxDrawdown: number;
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

export function computeMonteCarlo(netPnlsChronological: number[], rnd: () => number = Math.random): MonteCarloDto {
  const n = netPnlsChronological.length;
  const pathKeys = Array.from({ length: CHART_PATHS }, (_, i) => `p${i}`);
  if (n < 2) {
    return {
      tradeCount: n,
      iterations: MONTE_CARLO_ITERATIONS,
      historicalMaxDrawdown: n === 1 ? 0 : maxDrawdownFromPnls(netPnlsChronological),
      maxDrawdownProbabilityPct: 0,
      medianSimulatedMaxDrawdown: 0,
      chartRows: [],
      pathKeys,
    };
  }

  const historicalMaxDrawdown = maxDrawdownFromPnls(netPnlsChronological);
  const maxDds: number[] = [];
  const chartPathEquities: number[][] = [];
  const chartIterIndices = new Set<number>();
  while (chartIterIndices.size < CHART_PATHS) {
    chartIterIndices.add(Math.floor(rnd() * MONTE_CARLO_ITERATIONS));
  }

  const working = [...netPnlsChronological];

  for (let iter = 0; iter < MONTE_CARLO_ITERATIONS; iter++) {
    for (let i = 0; i < n; i++) working[i] = netPnlsChronological[i]!;
    shuffleInPlace(working, rnd);
    const dd = maxDrawdownFromPnls(working);
    maxDds.push(dd);

    if (chartIterIndices.has(iter)) {
      let eq = 0;
      chartPathEquities.push(working.map((x) => (eq += x, eq)));
    }
  }

  const exceedCount = maxDds.filter((d) => d >= historicalMaxDrawdown - 1e-9).length;
  const maxDrawdownProbabilityPct = (exceedCount / MONTE_CARLO_ITERATIONS) * 100;
  const sorted = [...maxDds].sort((a, b) => a - b);
  const medianSimulatedMaxDrawdown = medianSorted(sorted);

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

const WD_LABELS: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
};

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
        weekdayLabel: WD_LABELS[weekday]!,
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
