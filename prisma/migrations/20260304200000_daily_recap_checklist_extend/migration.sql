-- SQLite: extend DailyRecap checklist (safe if columns already exist — avoid re-running blindly)
ALTER TABLE "DailyRecap" ADD COLUMN "madePlan" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "DailyRecap" ADD COLUMN "followedPlan" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "DailyRecap" ADD COLUMN "preMarketJournal" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "DailyRecap" ADD COLUMN "keptMaxTrades" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "DailyRecap" ADD COLUMN "keptRiskRules" BOOLEAN NOT NULL DEFAULT 0;
