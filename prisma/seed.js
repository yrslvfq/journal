const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SETUP_TYPES = [
  "Put wall / Call wall",
  "Gamma flip",
  "Volume trigger",
  "Unusual flow",
  "Sweep / Block",
  "VAH / VAL / POC touch",
  "Opening range breakout",
];

const CONFIRMATION_TYPES = [
  "Absorption in DOM",
  "Absorption in Bookmap",
  "Exhaustion",
  "Delta divergence",
  "Imbalance",
  "Footprint confirmation",
];

async function main() {
  const existingSetups = await prisma.setupType.findMany({
    where: { userId: null },
    select: { name: true },
  });
  const existingNames = new Set(existingSetups.map((s) => s.name));
  for (const name of SETUP_TYPES) {
    if (!existingNames.has(name)) {
      await prisma.setupType.create({ data: { name, userId: null } });
    }
  }

  const existingConfs = await prisma.confirmationType.findMany({
    where: { userId: null },
    select: { name: true },
  });
  const existingConfNames = new Set(existingConfs.map((c) => c.name));
  for (const name of CONFIRMATION_TYPES) {
    if (!existingConfNames.has(name)) {
      await prisma.confirmationType.create({ data: { name, userId: null } });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
