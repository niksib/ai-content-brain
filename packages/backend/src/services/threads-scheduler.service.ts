import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { threadsApiService } from "./threads-api.service.js";
import { redactSecrets } from "../lib/redact.js";

const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes — long enough for slow video uploads to Threads
const POST_PREVIEW_MAX_CHARS = 200;

function buildPostPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= POST_PREVIEW_MAX_CHARS) return trimmed;
  return trimmed.slice(0, POST_PREVIEW_MAX_CHARS - 1) + "…";
}

type MediaItem = { mediaType: "IMAGE" | "VIDEO"; mediaUrl: string };

function parseMediaItems(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return [];
  const items: MediaItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as { mediaType?: unknown; mediaUrl?: unknown };
    if ((candidate.mediaType === "IMAGE" || candidate.mediaType === "VIDEO") && typeof candidate.mediaUrl === "string") {
      items.push({ mediaType: candidate.mediaType, mediaUrl: candidate.mediaUrl });
    }
  }
  return items;
}

type ThreadEntry = { text: string; mediaItems?: MediaItem[] };

function parseThreadPosts(value: unknown): ThreadEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: ThreadEntry[] = [];
  for (const raw of value) {
    if (typeof raw === "string") {
      entries.push({ text: raw });
      continue;
    }
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as { text?: unknown; mediaItems?: unknown };
    if (typeof candidate.text !== "string") continue;
    const items = parseMediaItems(candidate.mediaItems);
    entries.push({ text: candidate.text, ...(items.length > 0 ? { mediaItems: items } : {}) });
  }
  return entries;
}

export class ThreadsSchedulerService {
  start(): void {
    cron.schedule("* * * * *", async () => {
      await this.processDuePosts();
    });

    console.log("[ThreadsScheduler] Started — checking every minute for due posts");
  }

  private async processDuePosts(): Promise<void> {
    const now = new Date();
    const stuckCutoff = new Date(now.getTime() - STUCK_THRESHOLD_MS);

    // Atomically claim all due scheduled posts in one pass.
    // updateMany with publishingAt = null filter prevents concurrent ticks
    // (or parallel workers) from claiming the same row twice.
    await prisma.post.updateMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
        publishingAt: null,
        attempts: { lt: MAX_ATTEMPTS },
      },
      data: {
        status: "publishing",
        publishingAt: now,
        attempts: { increment: 1 },
      },
    });

    // Reclaim stuck "publishing" posts whose worker never finished (crash, timeout).
    await prisma.post.updateMany({
      where: {
        status: "publishing",
        publishingAt: { lt: stuckCutoff },
        attempts: { lt: MAX_ATTEMPTS },
      },
      data: {
        publishingAt: now,
        attempts: { increment: 1 },
      },
    });

    // Any row still in publishing that has hit the attempt limit is failed permanently.
    await prisma.post.updateMany({
      where: {
        status: "publishing",
        attempts: { gte: MAX_ATTEMPTS },
        publishingAt: { lt: stuckCutoff },
      },
      data: {
        status: "failed",
        errorMessage: "Exceeded maximum retry attempts",
      },
    });

    // Load the rows we just claimed. `publishingAt` was just set to `now`,
    // so we filter tightly to avoid racing a concurrent tick.
    const duePosts = await prisma.post.findMany({
      where: {
        status: "publishing",
        publishingAt: now,
      },
      include: {
        threadsAccount: true,
      },
    });

    await Promise.allSettled(
      duePosts.map((post) => this.publishPost(post))
    );
  }

  private async publishPost(
    post: {
      id: string;
      userId: string;
      threadsAccountId: string;
      text: string | null;
      posts: unknown;
      mediaItems: unknown;
      threadsAccount: { threadsUserId: string; accessToken: string };
    }
  ): Promise<void> {
    const { id: postId, userId, threadsAccountId, threadsAccount } = post;
    const { threadsUserId, accessToken } = threadsAccount;

    try {
      const threadEntries = parseThreadPosts(post.posts);
      const isThread = threadEntries !== null && threadEntries.length > 1;
      const text = post.text ?? (threadEntries?.[0]?.text ?? "");
      const mediaItems = parseMediaItems(post.mediaItems);

      let firstPostId: string;

      if (isThread) {
        const result = await threadsApiService.publishThreadChain(threadsUserId, accessToken, threadEntries!);
        firstPostId = result.postIds[0];
        console.log(`[ThreadsScheduler] Published thread ${postId} → post IDs: ${result.postIds.join(", ")}`);
      } else if (mediaItems.length >= 2) {
        const result = await threadsApiService.publishCarousel(threadsUserId, accessToken, text, mediaItems);
        firstPostId = result.postId;
        console.log(`[ThreadsScheduler] Published carousel ${postId} (${mediaItems.length} items) → Threads ID ${firstPostId}`);
      } else if (mediaItems.length === 1) {
        const result = await threadsApiService.publishSingleMediaPost(threadsUserId, accessToken, text, mediaItems[0].mediaType, mediaItems[0].mediaUrl);
        firstPostId = result.postId;
        console.log(`[ThreadsScheduler] Published media post ${postId} → Threads ID ${firstPostId}`);
      } else {
        const result = await threadsApiService.publishTextPost(threadsUserId, accessToken, text);
        firstPostId = result.postId;
        console.log(`[ThreadsScheduler] Published post ${postId} → Threads ID ${firstPostId}`);
      }

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "published",
          publishedAt: new Date(),
          threadsPostId: firstPostId,
          publishingAt: null,
        },
      });

      await prisma.threadsAccount.update({
        where: { id: threadsAccountId },
        data: { postsCount: { increment: 1 } },
      });

      // Seed a ThreadsPostInsight row immediately so the streak endpoint and
      // dashboard totals reflect today's post without waiting for the 03:00
      // UTC snapshot cron. Metrics start at 0 — actual engagement numbers
      // backfill on the next snapshot run. Wrapped in try/catch because the
      // post is already live; an insight-write failure must not fail the
      // publish.
      try {
        const previewSourceRaw = threadEntries && threadEntries.length > 0 ? threadEntries[0] : null;
        const previewSource =
          typeof previewSourceRaw === "string"
            ? previewSourceRaw
            : previewSourceRaw?.text ?? text;
        const preview = buildPostPreview(previewSource);
        const publishedAt = new Date();

        await prisma.threadsPostInsight.upsert({
          where: {
            threadsAccountId_threadsPostId: {
              threadsAccountId,
              threadsPostId: firstPostId,
            },
          },
          create: {
            threadsAccountId,
            userId,
            threadsPostId: firstPostId,
            publishedAt,
            preview,
          },
          update: {
            publishedAt,
            preview,
          },
        });
      } catch (insightError) {
        console.error(
          `[ThreadsScheduler] Failed to seed ThreadsPostInsight for ${firstPostId}:`,
          redactSecrets(insightError),
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Release the claim so the next tick can retry (unless attempts exhausted).
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "scheduled",
          publishingAt: null,
          errorMessage,
        },
      });
      console.error(`[ThreadsScheduler] Failed to publish post ${postId}:`, redactSecrets(error));
    }
  }
}

export const threadsSchedulerService = new ThreadsSchedulerService();
