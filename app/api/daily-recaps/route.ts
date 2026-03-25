import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { disciplineScoreFromChecklist } from "@/lib/analytics-advanced";
import { getUserDayTradingBundle } from "@/lib/daily-trade-bundle";
import { prisma } from "@/lib/prisma";
import { utcDayStartFromIso } from "@/lib/utc-day";

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  keptLossLimit: z.boolean(),
  setupsOnly: z.boolean(),
  noStopMoving: z.boolean(),
  lessonOfDay: z.string().max(10_000).optional().default(""),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recaps = await prisma.dailyRecap.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json({ recaps });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, keptLossLimit, setupsOnly, noStopMoving, lessonOfDay } = parsed.data;
  const dayStart = utcDayStartFromIso(date);
  if (!dayStart) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const disciplineScore = disciplineScoreFromChecklist(keptLossLimit, setupsOnly, noStopMoving);

  const bundle = await getUserDayTradingBundle(session.user.id, dayStart);
  const eff = bundle.sessionMetrics.efficiencyPerFeeUsd;

  const recap = await prisma.dailyRecap.upsert({
    where: {
      userId_date: { userId: session.user.id, date: dayStart },
    },
    create: {
      userId: session.user.id,
      date: dayStart,
      keptLossLimit,
      setupsOnly,
      noStopMoving,
      disciplineScore,
      lessonOfDay,
      sessionEfficiency: eff,
      sessionStatus: bundle.sessionMetrics.persona,
    },
    update: {
      keptLossLimit,
      setupsOnly,
      noStopMoving,
      disciplineScore,
      lessonOfDay,
      sessionEfficiency: eff,
      sessionStatus: bundle.sessionMetrics.persona,
    },
  });

  return NextResponse.json({
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
