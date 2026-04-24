import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { threadsApiService } from "./threads-api.service.js";
import { redactSecrets } from "../lib/redact.js";

const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes — long enough for slow video uploads to Threads

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

    // Atomically claim all due pending posts in one pass.
    // updateMany with publishingAt = null filter prevents concurrent ticks
    // (or parallel workers) from claiming the same row twice.
    await prisma.scheduledPost.updateMany({
      where: {
        status: "pending",
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
    await prisma.scheduledPost.updateMany({
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
    await prisma.scheduledPost.updateMany({
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

    // Load the posts we just claimed. `publishingAt` was just set to `now`,
    // so we filter tightly to avoid racing a concurrent tick.
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: "publishing",
        publishingAt: now,
      },
      include: {
        threadsAccount: true,
      },
    });

    await Promise.allSettled(
      duePosts.map((scheduledPost) => this.publishScheduledPost(scheduledPost))
    );
  }

  private async publishScheduledPost(
    scheduledPost: {
      id: string;
      threadsAccountId: string;
      contentIdeaId: string | null;
      text: string;
      posts: unknown;
      mediaType: "TEXT" | "IMAGE" | "VIDEO";
      mediaUrl: string | null;
      threadsAccount: { threadsUserId: string; accessToken: string };
    }
  ): Promise<void> {
    const { id: postId, threadsAccountId, contentIdeaId, text, posts, mediaType, mediaUrl, threadsAccount } = scheduledPost;
    const { threadsUserId, accessToken } = threadsAccount;

    try {
      const postsArray = Array.isArray(posts)
        ? (posts as Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }>)
        : null;
      const isThread = postsArray !== null && postsArray.length > 1;

      let firstPostId: string;

      if (isThread) {
        const normalized = postsArray.map((entry) =>
          typeof entry === "string" ? { text: entry } : entry
        );
        const result = await threadsApiService.publishThreadChain(threadsUserId, accessToken, normalized);
        firstPostId = result.postIds[0];
        console.log(`[ThreadsScheduler] Published thread ${postId} → post IDs: ${result.postIds.join(", ")}`);
      } else if (mediaUrl && (mediaType === "IMAGE" || mediaType === "VIDEO")) {
        const result = await threadsApiService.publishSingleMediaPost(threadsUserId, accessToken, text, mediaType, mediaUrl);
        firstPostId = result.postId;
        console.log(`[ThreadsScheduler] Published media post ${postId} → Threads ID ${firstPostId}`);
      } else {
        const result = await threadsApiService.publishTextPost(threadsUserId, accessToken, text);
        firstPostId = result.postId;
        console.log(`[ThreadsScheduler] Published post ${postId} → Threads ID ${firstPostId}`);
      }

      await prisma.scheduledPost.update({
        where: { id: postId },
        data: { status: "published", threadsPostId: firstPostId, publishingAt: null },
      });

      await prisma.threadsAccount.update({
        where: { id: threadsAccountId },
        data: { postsCount: { increment: 1 } },
      });

      if (contentIdeaId) {
        await prisma.contentIdea.update({
          where: { id: contentIdeaId },
          data: { publishStatus: "posted", threadsPostId: firstPostId, publishedAt: new Date() },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Release the claim so the next tick can retry (unless attempts exhausted).
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "pending",
          publishingAt: null,
          errorMessage,
        },
      });
      console.error(`[ThreadsScheduler] Failed to publish post ${postId}:`, redactSecrets(error));
    }
  }
}

export const threadsSchedulerService = new ThreadsSchedulerService();
