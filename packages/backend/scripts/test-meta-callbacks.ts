/**
 * E2E test for Threads/Meta deauthorize + data-deletion callbacks.
 * Seeds a test user with related rows, exercises both endpoints, asserts
 * DB state, then cleans up. Run with: pnpm tsx scripts/test-meta-callbacks.ts
 */
import "dotenv/config";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";

const API_BASE = "http://localhost:3001";
const APP_SECRET = process.env.THREADS_APP_SECRET;
if (!APP_SECRET) {
  console.error("THREADS_APP_SECRET missing — aborting test");
  process.exit(1);
}

const TEST_PREFIX = "meta-callback-test";
const THREADS_USER_DEAUTH = `${TEST_PREFIX}-deauth-${randomBytes(4).toString("hex")}`;
const THREADS_USER_DELETE = `${TEST_PREFIX}-delete-${randomBytes(4).toString("hex")}`;

let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string): void {
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ✘ ${message}`);
    failed++;
  }
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildSignedRequest(payload: object, secret: string): string {
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac("sha256", secret).update(encodedPayload).digest();
  return `${base64url(sig)}.${encodedPayload}`;
}

async function seedUser(label: string, threadsUserId: string): Promise<string> {
  const userId = `${label}-user-${randomBytes(6).toString("hex")}`;
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  await prisma.user.create({
    data: {
      id: userId,
      name: `Test ${label}`,
      email: `${userId}@test.local`,
    },
  });

  await prisma.threadsAccount.create({
    data: {
      userId,
      threadsUserId,
      username: `test_${label}`,
      accessToken: "test-access-token",
      tokenExpiresAt: new Date(Date.now() + 60 * 86_400_000),
      scopes: "threads_basic,threads_content_publish",
    },
  });

  // ChatSession + ContentPlan + ContentIdea + ProducedContent + ChatMessage
  // + ThreadsInsightsSnapshot + ScheduledPost + MediaFile + CreditBalance
  // — covers every relation deleteAllUserData walks.
  const chatSession = await prisma.chatSession.create({
    data: {
      userId,
      type: "daily",
      status: "active",
      sessionDate: date,
    },
  });

  const contentPlan = await prisma.contentPlan.create({
    data: { userId, chatSessionId: chatSession.id },
  });

  const contentIdea = await prisma.contentIdea.create({
    data: {
      contentPlanId: contentPlan.id,
      userId,
      platform: "threads",
      format: "text_post",
      angle: "test",
      description: "test idea",
    },
  });

  await prisma.producedContent.create({
    data: {
      contentIdeaId: contentIdea.id,
      userId,
      platform: "threads",
      format: "text_post",
      body: { text: "produced" },
    },
  });

  await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      role: "user",
      content: "hi",
      contentIdeaId: contentIdea.id,
    },
  });

  await prisma.threadsInsightsSnapshot.create({
    data: { contentIdeaId: contentIdea.id, userId, views: 1 },
  });

  const account = await prisma.threadsAccount.findUniqueOrThrow({ where: { userId } });
  await prisma.scheduledPost.create({
    data: {
      userId,
      threadsAccountId: account.id,
      text: "scheduled",
      scheduledAt: new Date(Date.now() + 86_400_000),
    },
  });

  await prisma.mediaFile.create({
    data: {
      userId,
      url: `https://storage.googleapis.com/fake/${userId}/test.jpg`,
      gcsPath: `${userId}/test/${randomUUID()}.jpg`,
      mimeType: "image/jpeg",
      size: 1024,
    },
  });

  await prisma.creditBalance.create({ data: { userId, balance: 100 } });
  await prisma.creditTransaction.create({
    data: { userId, amount: 100, type: "trial_grant" },
  });

  return userId;
}

async function cleanup(threadsUserId: string): Promise<void> {
  // Belt-and-braces: even if the deletion endpoint succeeded, ensure no test
  // rows leak. ThreadsAccount drives userId discovery for any leftovers.
  const accounts = await prisma.threadsAccount.findMany({ where: { threadsUserId } });
  for (const account of accounts) {
    await prisma.threadsInsightsSnapshot.deleteMany({ where: { userId: account.userId } });
    await prisma.producedContent.deleteMany({ where: { userId: account.userId } });
    const sessions = await prisma.chatSession.findMany({
      where: { userId: account.userId },
      select: { id: true },
    });
    if (sessions.length > 0) {
      await prisma.chatMessage.deleteMany({
        where: { chatSessionId: { in: sessions.map((s) => s.id) } },
      });
    }
    await prisma.contentIdea.deleteMany({ where: { userId: account.userId } });
    await prisma.contentPlan.deleteMany({ where: { userId: account.userId } });
    await prisma.chatSession.deleteMany({ where: { userId: account.userId } });
    await prisma.scheduledPost.deleteMany({ where: { userId: account.userId } });
    await prisma.threadsAccount.deleteMany({ where: { userId: account.userId } });
    await prisma.mediaFile.deleteMany({ where: { userId: account.userId } });
    await prisma.creditTransaction.deleteMany({ where: { userId: account.userId } });
    await prisma.creditBalance.deleteMany({ where: { userId: account.userId } });
    await prisma.subscription.deleteMany({ where: { userId: account.userId } });
    await prisma.user.deleteMany({ where: { id: account.userId } });
  }
  await prisma.dataDeletionRequest.deleteMany({ where: { threadsUserId } });
}

async function postSignedRequest(path: string, signedRequest: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ signed_request: signedRequest }),
  });
}

async function testDeauthorize(): Promise<void> {
  console.log("\n── TEST 1: POST /api/threads/deauthorize ──");

  const userId = await seedUser("deauth", THREADS_USER_DEAUTH);
  console.log(`  seeded user ${userId} with threadsUserId ${THREADS_USER_DEAUTH}`);

  // Invalid signature → 400
  const badResponse = await postSignedRequest(
    "/api/threads/deauthorize",
    buildSignedRequest({ user_id: THREADS_USER_DEAUTH, algorithm: "HMAC-SHA256" }, "wrong-secret"),
  );
  assert(badResponse.status === 400, `invalid signature returns 400 (got ${badResponse.status})`);

  // Account untouched after invalid call
  const accountAfterBad = await prisma.threadsAccount.findUniqueOrThrow({ where: { userId } });
  assert(
    accountAfterBad.accessToken === "test-access-token",
    "invalid signature did NOT clear access token",
  );

  // Valid signature → 200, token cleared, user data intact
  const goodResponse = await postSignedRequest(
    "/api/threads/deauthorize",
    buildSignedRequest({ user_id: THREADS_USER_DEAUTH, algorithm: "HMAC-SHA256" }, APP_SECRET!),
  );
  assert(goodResponse.status === 200, `valid signature returns 200 (got ${goodResponse.status})`);

  const accountAfterGood = await prisma.threadsAccount.findUniqueOrThrow({ where: { userId } });
  assert(accountAfterGood.accessToken === "", "access token cleared");
  assert(accountAfterGood.scopes === "", "scopes cleared");
  assert(accountAfterGood.tokenExpiresAt.getTime() === 0, "tokenExpiresAt set to epoch");

  // User data still present (deauth should NOT delete)
  const userStillExists = await prisma.user.findUnique({ where: { id: userId } });
  assert(userStillExists !== null, "user row still exists");

  const ideasCount = await prisma.contentIdea.count({ where: { userId } });
  assert(ideasCount === 1, "content idea still exists");

  // Missing signed_request → 400
  const emptyResponse = await fetch(`${API_BASE}/api/threads/deauthorize`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "",
  });
  assert(emptyResponse.status === 400, `missing signed_request returns 400 (got ${emptyResponse.status})`);

  await cleanup(THREADS_USER_DEAUTH);
}

async function testDataDeletion(): Promise<void> {
  console.log("\n── TEST 2: POST /api/threads/data-deletion ──");

  const userId = await seedUser("delete", THREADS_USER_DELETE);
  console.log(`  seeded user ${userId} with threadsUserId ${THREADS_USER_DELETE}`);

  // Invalid signature → 400
  const badResponse = await postSignedRequest(
    "/api/threads/data-deletion",
    buildSignedRequest({ user_id: THREADS_USER_DELETE, algorithm: "HMAC-SHA256" }, "wrong-secret"),
  );
  assert(badResponse.status === 400, `invalid signature returns 400 (got ${badResponse.status})`);

  const userStillExistsAfterBad = await prisma.user.findUnique({ where: { id: userId } });
  assert(userStillExistsAfterBad !== null, "invalid signature did NOT delete user");

  // Valid signature → 200 with {url, confirmation_code}
  const goodResponse = await postSignedRequest(
    "/api/threads/data-deletion",
    buildSignedRequest({ user_id: THREADS_USER_DELETE, algorithm: "HMAC-SHA256" }, APP_SECRET!),
  );
  assert(goodResponse.status === 200, `valid signature returns 200 (got ${goodResponse.status})`);

  const body = (await goodResponse.json()) as { url?: string; confirmation_code?: string };
  assert(typeof body.confirmation_code === "string" && body.confirmation_code.length === 32, "got 32-char confirmation_code");
  assert(typeof body.url === "string" && body.url.includes(body.confirmation_code!), "url contains confirmation_code");

  const code = body.confirmation_code!;

  // Poll status until completed (max 5s)
  let status: string | null = null;
  for (let i = 0; i < 25; i++) {
    const statusResponse = await fetch(`${API_BASE}/api/threads/data-deletion-status/${code}`);
    const statusBody = (await statusResponse.json()) as { status?: string };
    status = statusBody.status ?? null;
    if (status === "completed" || status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert(status === "completed", `deletion completed (final status: ${status})`);

  // Verify EVERY related row is gone
  const userGone = await prisma.user.findUnique({ where: { id: userId } });
  assert(userGone === null, "user row deleted");

  const accountGone = await prisma.threadsAccount.count({ where: { userId } });
  assert(accountGone === 0, "ThreadsAccount deleted");

  const ideasGone = await prisma.contentIdea.count({ where: { userId } });
  assert(ideasGone === 0, "ContentIdea deleted");

  const plansGone = await prisma.contentPlan.count({ where: { userId } });
  assert(plansGone === 0, "ContentPlan deleted");

  const sessionsGone = await prisma.chatSession.count({ where: { userId } });
  assert(sessionsGone === 0, "ChatSession deleted");

  const insightsGone = await prisma.threadsInsightsSnapshot.count({ where: { userId } });
  assert(insightsGone === 0, "ThreadsInsightsSnapshot deleted");

  const scheduledGone = await prisma.scheduledPost.count({ where: { userId } });
  assert(scheduledGone === 0, "ScheduledPost deleted");

  const mediaGone = await prisma.mediaFile.count({ where: { userId } });
  assert(mediaGone === 0, "MediaFile deleted");

  const creditsGone = await prisma.creditBalance.count({ where: { userId } });
  assert(creditsGone === 0, "CreditBalance deleted");

  const txnsGone = await prisma.creditTransaction.count({ where: { userId } });
  assert(txnsGone === 0, "CreditTransaction deleted");

  // Status endpoint with unknown code → 404
  const unknownStatusResponse = await fetch(`${API_BASE}/api/threads/data-deletion-status/nonexistent-code`);
  assert(unknownStatusResponse.status === 404, `unknown code returns 404 (got ${unknownStatusResponse.status})`);

  // Cleanup the DataDeletionRequest row
  await prisma.dataDeletionRequest.deleteMany({ where: { threadsUserId: THREADS_USER_DELETE } });
}

async function main(): Promise<void> {
  try {
    await testDeauthorize();
    await testDataDeletion();
  } catch (error) {
    console.error("\n💥 Test crashed:", error);
    failed++;
  } finally {
    // Final cleanup just in case
    await cleanup(THREADS_USER_DEAUTH).catch(() => {});
    await cleanup(THREADS_USER_DELETE).catch(() => {});
    await prisma.$disconnect();
  }

  console.log(`\n────────────────────────────────`);
  console.log(`  Passed: ${passed}   Failed: ${failed}`);
  console.log(`────────────────────────────────`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
