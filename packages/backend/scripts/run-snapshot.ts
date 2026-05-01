import { prisma } from "../src/lib/prisma.js";
import { threadsInsightsSnapshotService } from "../src/services/threads-insights-snapshot.service.js";

console.log("[run-snapshot] Starting one-off daily snapshot run");
const startedAt = Date.now();

await threadsInsightsSnapshotService.runDailySnapshot();

const elapsedMs = Date.now() - startedAt;
console.log(`[run-snapshot] Done in ${elapsedMs}ms`);

await prisma.$disconnect();
