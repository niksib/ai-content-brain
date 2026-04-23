import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { threadsApiService } from "./threads-api.service.js";

export class ThreadsSchedulerService {
  start(): void {
    cron.schedule("* * * * *", async () => {
      await this.processDuePosts();
    });

    console.log("[ThreadsScheduler] Started — checking every minute for due posts");
  }

  private async processDuePosts(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        OR: [
          { status: "pending", scheduledAt: { lte: new Date() } },
          { status: "publishing", updatedAt: { lte: fiveMinutesAgo } },
        ],
      },
      include: {
        threadsAccount: true,
      },
    });

    await Promise.allSettled(
      duePosts.map((scheduledPost) =>
        this.publishScheduledPost(scheduledPost)
      )
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

    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "publishing" },
    });

    try {
      const postsArray = Array.isArray(posts) ? (posts as Array<string | { text: string; mediaType?: "IMAGE" | "VIDEO"; mediaUrl?: string }>) : null;
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
        data: { status: "published", threadsPostId: firstPostId },
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
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: { status: "failed", errorMessage },
      });
      console.error(`[ThreadsScheduler] Failed to publish post ${postId}:`, error);
    }
  }
}

export const threadsSchedulerService = new ThreadsSchedulerService();
