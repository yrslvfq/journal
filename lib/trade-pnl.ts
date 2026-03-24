export type ExitType = "system" | "manual";

export function computeStatedPnl(params: {
  outcome: "win" | "loss" | "be";
  risk: number;
  rr: number;
  exitType: ExitType;
  realizedPnl?: number | null | undefined;
}): number {
  if (
    params.exitType === "manual" &&
    params.realizedPnl != null &&
    Number.isFinite(params.realizedPnl)
  ) {
    return params.realizedPnl;
  }
  if (params.outcome === "win") return params.risk * params.rr;
  if (params.outcome === "loss") return -params.risk;
  return 0;
}
