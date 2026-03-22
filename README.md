# Flow Journal

Trading journal for options flow, order flow & Auction Market Theory (AMT) traders.

## Features

- **Trades**: Record trades with symbol, direction, entry/exit, P&L, tags, notes
- **Options Flow**: Track sweeps, blocks, unusual activity, strike, expiry, premium
- **Order Flow**: Footprint notes, volume delta, cumulative delta, imbalance zones
- **AMT**: Value area (VAH, VAL), POC, opening range, day type
- **Analytics**: P&L by period, win rate, expectancy, charts

## Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite (dev) / PostgreSQL (prod)
- NextAuth.js
- Tailwind CSS
- Recharts

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set NEXTAUTH_SECRET (openssl rand -base64 32)
npx prisma generate
npx prisma db push
npm run dev
```

## Deploy (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
4. For PostgreSQL: use Vercel Postgres or Neon
