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
    // so we filter tightly to avoid racing a concurrent tick. Text/media live
    // on the linked ContentIdea — JOIN to read the latest snapshot.
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: "publishing",
        publishingAt: now,
      },
      include: {
        threadsAccount: true,
        contentIdea: {
          select: { body: true, mediaUrl: true, mediaType: true },
        },
      },
    });

    await Promise.allSettled(
      duePosts.map((scheduledPost) => this.publishScheduledPost(scheduledPost))
    );
  }

  private async publishScheduledPost(
    scheduledPost: {
      id: string;
      userId: string;
      threadsAccountId: string;
      contentIdeaId: string | null;
      text: string | null;
      posts: unknown;
      mediaType: string | null;
      mediaUrl: string | null;
      threadsAccount: { threadsUserId: string; accessToken: string };
      contentIdea: { body: unknown; mediaUrl: string | null; mediaType: string | null } | null;
    }
  ): Promise<void> {
    const { id: postId, userId, threadsAccountId, contentIdeaId, threadsAccount, contentIdea } = scheduledPost;
    const { threadsUserId, accessToken } = threadsAccount;

    try {
      // Idea-linked: read snapshot from ContentIdea (autosaved edits flow through).
      // Standalone: snapshot lives on ScheduledPost itself.
      let text = "";
      let postsField: Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }> | null = null;
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (contentIdeaId) {
        if (!contentIdea || !contentIdea.body) {
          throw new Error("Scheduled post has no linked ContentIdea body");
        }
        const ideaBody = contentIdea.body as { text?: string; posts?: string[] };
        const ideaPosts = Array.isArray(ideaBody.posts) ? ideaBody.posts : null;
        postsField = ideaPosts ? ideaPosts.map((entryText) => ({ text: entryText })) : null;
        text = ideaPosts && ideaPosts.length > 1
          ? ""
          : (typeof ideaBody.text === "string" ? ideaBody.text : (ideaPosts?.[0] ?? ""));
        mediaUrl = contentIdea.mediaUrl;
        mediaType = contentIdea.mediaType;
      } else {
        postsField = Array.isArray(scheduledPost.posts)
          ? (scheduledPost.posts as Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }>)
          : null;
        text = scheduledPost.text ?? "";
        mediaUrl = scheduledPost.mediaUrl;
        mediaType = scheduledPost.mediaType;
      }

      const isThread = postsField !== null && postsField.length > 1;

      let firstPostId: string;

      if (isThread) {
        const normalized = postsField!.map((entry) =>
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

      // Seed a ThreadsPostInsight row immediately so the streak endpoint and
      // dashboard totals reflect today's post without waiting for the 03:00
      // UTC snapshot cron. Metrics start at 0 — actual engagement numbers
      // backfill on the next snapshot run. Wrapped in try/catch because the
      // post is already live; an insight-write failure must not fail the
      // publish.
      try {
        const previewSourceRaw = postsField && postsField.length > 0 ? postsField[0] : null;
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
