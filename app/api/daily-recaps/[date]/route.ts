import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserDayTradingBundle } from "@/lib/daily-trade-bundle";
import { prisma } from "@/lib/prisma";
import { utcDayStartFromIso } from "@/lib/utc-day";

export async function GET(_req: Request, { params }: { params: { date: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayStart = utcDayStartFromIso(params.date);
  if (!dayStart) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [recap, bundle] = await Promise.all([
    prisma.dailyRecap.findUnique({
      where: {
        userId_date: { userId: session.user.id, date: dayStart },
      },
    }),
    getUserDayTradingBundle(session.user.id, dayStart),
  ]);

  return NextResponse.json({
    date: params.date,
    recap,
    dayPnl: bundle.dayPnl,
    tradesCount: bundle.tradesCount,
    dayWins: bundle.dayWins,
    dayLosses: bundle.dayLosses,
    dayBreakeven: bundle.dayBreakeven,
    totalFees: bundle.totalFees,
    sessionMetrics: bundle.sessionMetrics,
  });
}
