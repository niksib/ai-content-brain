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
      duePosts.map((post) =>
        this.publishScheduledPost(
          post.id,
          post.threadsAccountId,
          post.threadsAccount.threadsUserId,
          post.threadsAccount.accessToken,
          post.text
        )
      )
    );
  }

  private async publishScheduledPost(
    postId: string,
    threadsAccountId: string,
    threadsUserId: string,
    accessToken: string,
    text: string
  ): Promise<void> {
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "publishing" },
    });

    try {
      const result = await threadsApiService.publishTextPost(threadsUserId, accessToken, text);

      await prisma.scheduledPost.update({
        where: { id: postId },
        data: { status: "published", threadsPostId: result.postId },
      });

      await prisma.threadsAccount.update({
        where: { id: threadsAccountId },
        data: { postsCount: { increment: 1 } },
      });

      console.log(`[ThreadsScheduler] Published post ${postId} → Threads ID ${result.postId}`);
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
