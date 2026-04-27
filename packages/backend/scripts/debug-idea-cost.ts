import { prisma } from "../src/lib/prisma.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/debug-idea-cost.ts <email>");
  process.exit(1);
}

const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });

const ideas = await prisma.contentIdea.findMany({
  where: { userId: user.id },
  select: { id: true, angle: true, status: true, createdAt: true },
  orderBy: { createdAt: "desc" },
  take: 10,
});

console.log(`Latest 10 ideas for ${email}:`);
for (const idea of ideas) {
  console.log(`  ${idea.id} | ${idea.status} | ${idea.angle.slice(0, 60)}`);
}

const txns = await prisma.creditTransaction.findMany({
  where: { userId: user.id },
  select: { id: true, type: true, reference: true, costCents: true, amount: true, createdAt: true },
  orderBy: { createdAt: "desc" },
  take: 20,
});

console.log(`\nLatest 20 transactions:`);
for (const txn of txns) {
  console.log(
    `  ${txn.type.padEnd(22)} | ref=${(txn.reference ?? "null").padEnd(28)} | costCents=${txn.costCents ?? "null"} | amount=${txn.amount}`,
  );
}

const ideaIds = ideas.map((idea) => idea.id);
const grouped = await prisma.creditTransaction.groupBy({
  by: ["reference"],
  where: {
    userId: user.id,
    reference: { in: ideaIds },
    costCents: { not: null },
  },
  _sum: { costCents: true },
});
console.log(`\nGroupBy result for these ideaIds:`, grouped);

await prisma.$disconnect();
