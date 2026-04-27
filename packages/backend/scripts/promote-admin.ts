import { prisma } from "../src/lib/prisma.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/promote-admin.ts <email>");
  process.exit(1);
}

const updated = await prisma.user.update({
  where: { email },
  data: { isAdmin: true },
  select: { id: true, name: true, email: true, isAdmin: true },
});

console.log(updated);
await prisma.$disconnect();
