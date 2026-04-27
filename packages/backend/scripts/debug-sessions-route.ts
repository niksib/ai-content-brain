import { prisma } from "../src/lib/prisma.js";
import { getIdeaCostsMap, attachCostCents } from "../src/services/idea-cost.service.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/debug-sessions-route.ts <email>");
  process.exit(1);
}

const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });

// Mimic GET /sessions/:id
const session = await prisma.chatSession.findFirst({
  where: { userId: user.id },
  orderBy: { createdAt: "desc" },
  include: {
    messages: { orderBy: { createdAt: "asc" }, take: 1 },
    contentPlan: { include: { ideas: { orderBy: { createdAt: "asc" } } } },
  },
});

if (!session?.contentPlan) {
  console.log("No session/plan found");
  process.exit(0);
}

const costMap = await getIdeaCostsMap(user.id, session.contentPlan.ideas.map((i) => i.id));
console.log("costMap:", costMap);

const enriched = attachCostCents(session.contentPlan.ideas, costMap);
console.log("enriched:");
for (const idea of enriched) {
  console.log(`  ${idea.id} costCents=${idea.costCents} angle=${idea.angle.slice(0, 50)}`);
}

await prisma.$disconnect();
