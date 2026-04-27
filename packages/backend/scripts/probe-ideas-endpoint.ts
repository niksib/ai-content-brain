// Probes a live ideas endpoint with a freshly-minted better-auth session, so
// we can see exactly what JSON the running server returns.
import { auth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";

const email = process.argv[2];
const path = process.argv[3];
if (!email || !path) {
  console.error("Usage: pnpm tsx scripts/probe-ideas-endpoint.ts <email> <path>");
  process.exit(1);
}

const user = await prisma.user.findUniqueOrThrow({ where: { email } });
const account = await prisma.account.findFirstOrThrow({
  where: { userId: user.id, providerId: "credential" },
});
if (!account.password) {
  console.error("No password on credential account — cannot create session");
  process.exit(1);
}

// Use the existing session_token from a recent active session — sign a probe
// request through better-auth's own signature path by reusing the live cookie
// via the response headers from a sign-in stub. Easier approach: ask the
// running better-auth instance to mint a session using the email+stored
// password isn't possible without the cleartext, so instead we lift a live
// session row and ALSO mint a signed cookie via auth's setSignedCookie path.
const liveSession = await prisma.session.findFirst({
  where: { userId: user.id, expiresAt: { gt: new Date() } },
  orderBy: { createdAt: "desc" },
});
if (!liveSession) {
  console.error("No live session for this user");
  process.exit(1);
}

const ctx = await auth.$context;
const secret = ctx.secret;

// better-auth signs cookies as `<value>.<base64url(hmac-sha256(value, secret))>`
// using @better-auth/utils createSignedCookie. We replicate that here.
const { createHmac } = await import("node:crypto");
function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const sig = base64url(createHmac("sha256", secret).update(liveSession.token).digest());
const signedCookieValue = `${liveSession.token}.${sig}`;

const cookieName = "better-auth.session_token";
const response = await fetch(`http://localhost:3001${path}`, {
  headers: { cookie: `${cookieName}=${signedCookieValue}` },
});

const text = await response.text();
console.log(`status: ${response.status}`);
try {
  const json = JSON.parse(text);
  console.log(JSON.stringify(json, null, 2).slice(0, 4000));
} catch {
  console.log(text.slice(0, 4000));
}

await prisma.$disconnect();
