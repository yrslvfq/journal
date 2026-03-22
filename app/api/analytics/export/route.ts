import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function getDateFilter(
  period: string,
  dateFromParam: string | null,
  dateToParam: string | null
) {
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

  const filter: { gte: Date; lte?: Date } = { gte: from };
  if (to) filter.lte = to;
  return filter;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const dateFilter = getDateFilter(period, dateFrom, dateTo);

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id, date: dateFilter },
    select: {
      symbol: true,
      pnl: true,
      fees: true,
      risk: true,
      date: true,
      setups: { include: { setupType: true } },
      confirmations: { include: { confirmationType: true } },
    },
    orderBy: { date: "asc" },
  });

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl - t.fees, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const byDay: Record<string, number> = {};
  for (const t of trades) {
    const key = t.date.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = 0;
    byDay[key] += t.pnl - t.fees;
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

  const lines: string[] = [];

  lines.push("Summary");
  lines.push("Metric,Value");
  lines.push(`Total P&L,${escapeCsv(totalPnl.toFixed(2))}`);
  lines.push(`Trades,${trades.length}`);
  lines.push(`Wins,${wins}`);
  lines.push(`Losses,${losses}`);
  lines.push(`Win Rate %,${escapeCsv(winRate.toFixed(1))}`);
  lines.push("");

  lines.push("Daily P&L");
  lines.push("Date,P&L");
  const dailyData = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => `${escapeCsv(date)},${escapeCsv(pnl.toFixed(2))}`);
  lines.push(...dailyData);
  lines.push("");

  lines.push("By Symbol");
  lines.push("Symbol,P&L,Count");
  for (const [symbol, data] of Object.entries(bySymbol)) {
    lines.push(`${escapeCsv(symbol)},${escapeCsv(data.pnl.toFixed(2))},${data.count}`);
  }
  lines.push("");

  lines.push("By Setup");
  lines.push("Setup,P&L,Count");
  for (const { name, pnl, count } of Object.values(bySetup)) {
    lines.push(`${escapeCsv(name)},${escapeCsv(pnl.toFixed(2))},${count}`);
  }

  const csv = lines.join("\n");
  const filename = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
