import { prisma } from "../src/lib/prisma.js";

const email = process.argv[2];
const path = process.argv[3];
if (!email || !path) {
  console.error("Usage: pnpm tsx scripts/curl-with-session.ts <email> <path>");
  process.exit(1);
}

const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
const session = await prisma.session.findFirst({
  where: { userId: user.id, expiresAt: { gt: new Date() } },
  orderBy: { createdAt: "desc" },
  select: { token: true },
});
if (!session) {
  console.error("No active better-auth session for this user");
  process.exit(1);
}

// better-auth default cookie name is "better-auth.session_token". Try a few
// variants in order until one works (config-dependent).
const cookieCandidates = [
  `better-auth.session_token=${session.token}`,
  `__Secure-better-auth.session_token=${session.token}`,
  `auth-session=${session.token}`,
];

let response: Response | null = null;
for (const cookie of cookieCandidates) {
  response = await fetch(`http://localhost:3001${path}`, { headers: { cookie } });
  if (response.status !== 401) {
    console.log(`auth via cookie: ${cookie.split("=")[0]}`);
    break;
  }
}
if (!response) throw new Error("no response");
const body = await response.text();
console.log("status:", response.status);
console.log("body:", body.slice(0, 4000));

await prisma.$disconnect();
