/** Deep behavior analytics: ghost stop, post-exit drift, volatility buckets, tilt warning. */

export type TradeBehaviorSlice = {
  direction: string;
  pnl: number;
  fees: number;
  risk: number;
  rr: number;
  outcome: string;
  marketVolatility: string | null;
  exitType: string;
  entryPrice: number | null;
  exitPrice: number | null;
  initialTp: number | null;
  initialSl: number | null;
  price5mAfter: number | null;
  price15mAfter: number | null;
  price60mAfter: number | null;
};

const VOL_ORDER = ["low", "medium", "high"] as const;
const VOL_LABEL: Record<string, string> = {
  low: "Low vol",
  medium: "Medium vol",
  high: "High vol",
  unspecified: "Not set",
};

export type VolatilityBucketDto = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitFactor: number | null;
  pnl: number;
};

export function ghostStopCostUsd(t: TradeBehaviorSlice): number {
  if (t.exitType !== "manual") return 0;
  const net = t.pnl - t.fees;
  if (t.outcome === "loss") return 0;

  const E = t.entryPrice;
  const X = t.exitPrice;
  const TP = t.initialTp;
  const SL = t.initialSl;
  if (E != null && X != null && TP != null && SL != null) {
    let slDist: number;
    let tpMove: number;
    let exMove: number;
    if (t.direction === "long") {
      slDist = E - SL;
      tpMove = TP - E;
      exMove = X - E;
    } else if (t.direction === "short") {
      slDist = SL - E;
      tpMove = E - TP;
      exMove = E - X;
    } else {
      return Math.max(0, t.risk * t.rr - net);
    }
    if (slDist <= 0 || tpMove <= 0) {
      return Math.max(0, t.risk * t.rr - net);
    }
    const perUnit = t.risk / slDist;
    const atTp = tpMove * perUnit;
    const atEx = exMove * perUnit;
    return Math.max(0, atTp - atEx);
  }

  return Math.max(0, t.risk * t.rr - net);
}

export function favorableDriftPoints(
  direction: string,
  exitPrice: number | null,
  afterPrice: number | null
): number | null {
  if (exitPrice == null || afterPrice == null) return null;
  if (direction === "long") return Math.max(0, afterPrice - exitPrice);
  if (direction === "short") return Math.max(0, exitPrice - afterPrice);
  return null;
}

export function buildVolatilityBuckets(trades: TradeBehaviorSlice[]): VolatilityBucketDto[] {
  type Acc = { wins: number; losses: number; gp: number; gl: number; pnl: number };
  const map = new Map<string, Acc>();
  const keyOf = (t: TradeBehaviorSlice) => {
    const v = t.marketVolatility?.toLowerCase();
    if (v === "low" || v === "medium" || v === "high") return v;
    return "unspecified";
  };
  for (const t of trades) {
    const k = keyOf(t);
    if (!map.has(k)) map.set(k, { wins: 0, losses: 0, gp: 0, gl: 0, pnl: 0 });
    const a = map.get(k)!;
    const net = t.pnl - t.fees;
    a.pnl += net;
    if (net > 0) {
      a.wins += 1;
      a.gp += net;
    } else if (net < 0) {
      a.losses += 1;
      a.gl += Math.abs(net);
    }
  }

  const rows: VolatilityBucketDto[] = [];
  for (const k of [...VOL_ORDER, "unspecified"]) {
    const a = map.get(k);
    if (!a) continue;
    const n = a.wins + a.losses;
    const wr = n > 0 ? (a.wins / n) * 100 : 0;
    let pf: number | null = null;
    if (a.gl > 0) pf = a.gp / a.gl;
    else if (a.gp > 0) pf = 999.99;
    rows.push({
      key: k,
      label: VOL_LABEL[k] ?? k,
      trades: n,
      wins: a.wins,
      losses: a.losses,
      winRatePct: wr,
      profitFactor: pf,
      pnl: a.pnl,
    });
  }
  return rows;
}

export function contextualTiltFromBuckets(buckets: VolatilityBucketDto[]): {
  show: boolean;
  winRatePct: number | null;
  sampleSize: number;
} {
  const low = buckets.find((b) => b.key === "low");
  if (!low || low.trades < 5) return { show: false, winRatePct: null, sampleSize: low?.trades ?? 0 };
  if (low.winRatePct < 30) {
    return { show: true, winRatePct: low.winRatePct, sampleSize: low.trades };
  }
  return { show: false, winRatePct: low.winRatePct, sampleSize: low.trades };
}

export type DriftHorizonDto = { horizon: string; avgFavorablePoints: number | null; samples: number };

export function postTradeDriftSeries(trades: TradeBehaviorSlice[]): DriftHorizonDto[] {
  const horizons: { key: keyof Pick<TradeBehaviorSlice, "price5mAfter" | "price15mAfter" | "price60mAfter">; label: string }[] = [
    { key: "price5mAfter", label: "5m" },
    { key: "price15mAfter", label: "15m" },
    { key: "price60mAfter", label: "60m" },
  ];
  return horizons.map(({ key, label }) => {
    const vals: number[] = [];
    for (const t of trades) {
      const drift = favorableDriftPoints(t.direction, t.exitPrice, t[key]);
      if (drift != null) vals.push(drift);
    }
    const samples = vals.length;
    const avg =
      samples > 0 ? vals.reduce((s, x) => s + x, 0) / samples : null;
    return { horizon: label, avgFavorablePoints: avg, samples };
  });
}
