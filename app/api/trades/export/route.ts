import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const instrumentType = searchParams.get("instrumentType") || undefined;
  const setupId = searchParams.get("setupId") || undefined;
  const confirmationId = searchParams.get("confirmationId") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const idsParam = searchParams.get("ids");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length > 0) (where as { id?: { in: string[] } }).id = { in: ids };
  }
  if (symbol) where.symbol = { contains: symbol };
  if (instrumentType) where.instrumentType = instrumentType;
  if (tag) where.tags = { some: { name: tag } };
  if (setupId) where.setups = { some: { setupTypeId: setupId } };
  if (confirmationId) {
    where.confirmations = { some: { confirmationTypeId: confirmationId } };
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom + "T00:00:00Z");
    if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo + "T23:59:59Z");
  }

  const trades = await prisma.trade.findMany({
    where,
    include: {
      tags: true,
      setups: { include: { setupType: true } },
      confirmations: { include: { confirmationType: true } },
    },
    orderBy: { date: "desc" },
  });

  const headers = [
    "Date",
    "Symbol",
    "Direction",
    "Instrument",
    "Risk",
    "R:R",
    "Outcome",
    "P&L",
    "Fees",
    "Market Condition",
    "Tags",
    "Setups",
    "Confirmations",
    "Notes",
    "Confirmation Notes",
  ];

  const rows = trades.map((t) => {
    const pnlNet = t.pnl - t.fees;
    return [
      new Date(t.date).toISOString().slice(0, 10),
      t.symbol,
      t.direction,
      t.instrumentType,
      String(t.risk),
      String(t.rr),
      t.outcome,
      String(pnlNet),
      String(t.fees),
      t.marketCondition || "",
      t.tags.map((tg) => tg.name).join("; "),
      t.setups.map((s) => s.setupType.name).join("; "),
      t.confirmations.map((c) => c.confirmationType.name).join("; "),
      t.notes || "",
      t.confirmationNotes || "",
    ].map(escapeCsv);
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `trades-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
