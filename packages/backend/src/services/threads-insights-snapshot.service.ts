import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { threadsApiService } from "./threads-api.service.js";
import { redactSecrets } from "../lib/redact.js";

// Posts older than this don't get re-fetched on every run — engagement curves
// flatten quickly on Threads, so the cost/value of polling old posts is poor.
// Posts beyond the window keep their last cached metrics in ThreadsPostInsight.
const POST_INSIGHTS_REFRESH_WINDOW_DAYS = 30;

// Concurrency caps. Threads doesn't document rate limits; 5 in-flight is a
// conservative ceiling that keeps the worker fast without risking 429s.
const MAX_CONCURRENT_ACCOUNTS = 5;
const MAX_CONCURRENT_POSTS = 5;

// Stop pagination after this many pages even when the cursor isn't found.
// 100 posts/page × 20 pages = 2000 posts cap per sync.
const POST_PAGINATION_PAGE_CAP = 20;

const PREVIEW_MAX_CHARS = 200;

interface AccountForSnapshot {
  id: string;
  userId: string;
  threadsUserId: string;
  accessToken: string;
  tokenExpiresAt: Date;
  lastSeenThreadsPostId?: string | null;
}

interface AggregatedTotals {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
  postsCount: number;
}

export class ThreadsInsightsSnapshotService {
  private isRunning = false;

  start(): void {
    // 03:00 UTC daily — well past midnight in any reasonable user TZ so the
    // captured snapshot represents a "yesterday's close" view for everyone.
    cron.schedule("0 3 * * *", async () => {
      await this.runDailySnapshot();
    });

    console.log("[ThreadsInsightsSnapshot] Scheduled daily snapshot at 03:00 UTC");
  }

  async runDailySnapshot(): Promise<void> {
    if (this.isRunning) {
      console.warn("[ThreadsInsightsSnapshot] Previous run still in progress — skipping");
      return;
    }
    this.isRunning = true;

    try {
      const accounts = await prisma.threadsAccount.findMany({
        where: { tokenExpiresAt: { gt: new Date() } },
        select: {
          id: true,
          userId: true,
          threadsUserId: true,
          accessToken: true,
          tokenExpiresAt: true,
          lastSeenThreadsPostId: true,
        },
      });

      console.log(`[ThreadsInsightsSnapshot] Snapshotting ${accounts.length} account(s)`);

      await runWithConcurrency(accounts, MAX_CONCURRENT_ACCOUNTS, (account) =>
        this.snapshotAccount(account)
      );

      console.log("[ThreadsInsightsSnapshot] Daily run complete");
    } finally {
      this.isRunning = false;
    }
  }

  // Public for OAuth callback backfill + admin manual refresh.
  async snapshotAccount(account: AccountForSnapshot): Promise<void> {
    try {
      // followers_count + clicks come from the account-level endpoint —
      // they're not available per-post. Everything else is post-aggregated.
      const accountSnapshot = await threadsApiService.fetchAccountSnapshot(
        account.threadsUserId,
        account.accessToken
      );

      const { totals, latestPostId, partial } = await this.refreshPostInsightsAndAggregate(account);

      const capturedDate = startOfUtcDay(new Date());
      const overallPartial = accountSnapshot.partial || partial;

      await prisma.threadsAccountSnapshot.upsert({
        where: {
          threadsAccountId_capturedDate: {
            threadsAccountId: account.id,
            capturedDate,
          },
        },
        create: {
          threadsAccountId: account.id,
          userId: account.userId,
          capturedDate,
          followersCount: accountSnapshot.followersCount,
          clicksTotal: accountSnapshot.clicksTotal,
          likesTotal: totals.likes,
          repliesTotal: totals.replies,
          repostsTotal: totals.reposts,
          quotesTotal: totals.quotes,
          viewsTotal: totals.views,
          postsCount: totals.postsCount,
          partial: overallPartial,
        },
        update: {
          capturedAt: new Date(),
          followersCount: accountSnapshot.followersCount,
          clicksTotal: accountSnapshot.clicksTotal,
          likesTotal: totals.likes,
          repliesTotal: totals.replies,
          repostsTotal: totals.reposts,
          quotesTotal: totals.quotes,
          viewsTotal: totals.views,
          postsCount: totals.postsCount,
          partial: overallPartial,
        },
      });

      if (latestPostId && latestPostId !== account.lastSeenThreadsPostId) {
        await prisma.threadsAccount.update({
          where: { id: account.id },
          data: { lastSeenThreadsPostId: latestPostId },
        });
      }
    } catch (snapshotError) {
      console.error(
        `[ThreadsInsightsSnapshot] Account ${account.id} failed:`,
        redactSecrets(snapshotError)
      );
    }
  }

  // 1) Walks /me/threads since the cursor, upserts NEW posts into
  //    ThreadsPostInsight (no metrics yet, just publishedAt + preview).
  // 2) Refreshes /insights for every post whose publishedAt is within the
  //    POST_INSIGHTS_REFRESH_WINDOW (covers brand-new and recently-updated).
  // 3) SUMs every cached row for this account → returns aggregate totals.
  // partial=true when at least one /insights call failed; the saved aggregate
  // still uses cached values for failed posts.
  private async refreshPostInsightsAndAggregate(
    account: AccountForSnapshot
  ): Promise<{ totals: AggregatedTotals; latestPostId: string | null; partial: boolean }> {
    let latestPostId: string | null = null;
    let partial = false;

    try {
      const cursor = account.lastSeenThreadsPostId ?? null;
      const walk = await threadsApiService.fetchUserPostsSince(
        account.threadsUserId,
        account.accessToken,
        cursor,
        POST_PAGINATION_PAGE_CAP
      );

      latestPostId = walk.latestPostId;

      if (walk.cursorStale) {
        console.warn(
          `[ThreadsInsightsSnapshot] Stale post cursor for account ${account.id} — clearing`
        );
        await prisma.threadsAccount.update({
          where: { id: account.id },
          data: { lastSeenThreadsPostId: null },
        });
        partial = true;
      }

      // Persist new non-reply posts as bare rows (insights filled in below).
      const newOwnPosts = walk.newPosts.filter((post) => !post.isReply);
      for (const post of newOwnPosts) {
        await prisma.threadsPostInsight.upsert({
          where: {
            threadsAccountId_threadsPostId: {
              threadsAccountId: account.id,
              threadsPostId: post.id,
            },
          },
          create: {
            threadsAccountId: account.id,
            userId: account.userId,
            threadsPostId: post.id,
            publishedAt: post.publishedAt,
            preview: buildPreview(post.text),
          },
          update: {
            publishedAt: post.publishedAt,
            preview: buildPreview(post.text),
          },
        });
      }
    } catch (walkError) {
      console.error(
        `[ThreadsInsightsSnapshot] Post pagination failed for ${account.id}:`,
        redactSecrets(walkError)
      );
      partial = true;
    }

    // Refresh insights for posts published within the refresh window. Older
    // posts keep their last known values (engagement plateaued, polling them
    // every day is wasteful).
    const refreshCutoff = new Date(
      Date.now() - POST_INSIGHTS_REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const postsToRefresh = await prisma.threadsPostInsight.findMany({
      where: {
        threadsAccountId: account.id,
        publishedAt: { gte: refreshCutoff },
      },
      select: { id: true, threadsPostId: true },
    });

    let refreshFailures = 0;

    await runWithConcurrency(postsToRefresh, MAX_CONCURRENT_POSTS, async (post) => {
      try {
        const insights = await threadsApiService.fetchPostInsights(
          post.threadsPostId,
          account.accessToken
        );
        await prisma.threadsPostInsight.update({
          where: { id: post.id },
          data: {
            views: insights.views,
            likes: insights.likes,
            replies: insights.replies,
            reposts: insights.reposts,
            quotes: insights.quotes,
            shares: insights.shares,
            fetchedAt: new Date(),
          },
        });
      } catch (postError) {
        refreshFailures += 1;
        console.error(
          `[ThreadsInsightsSnapshot] Insights refresh for post ${post.threadsPostId} failed:`,
          redactSecrets(postError)
        );
      }
    });

    if (refreshFailures > 0) partial = true;

    // Aggregate every cached post for this account. SUM in SQL is cheaper
    // than pulling all rows into memory.
    const aggregate = await prisma.threadsPostInsight.aggregate({
      where: { threadsAccountId: account.id },
      _sum: {
        views: true,
        likes: true,
        replies: true,
        reposts: true,
        quotes: true,
        shares: true,
      },
      _count: { _all: true },
    });

    return {
      latestPostId,
      partial,
      totals: {
        views: aggregate._sum.views ?? 0,
        likes: aggregate._sum.likes ?? 0,
        replies: aggregate._sum.replies ?? 0,
        reposts: aggregate._sum.reposts ?? 0,
        quotes: aggregate._sum.quotes ?? 0,
        shares: aggregate._sum.shares ?? 0,
        postsCount: aggregate._count._all,
      },
    };
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

function buildPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= PREVIEW_MAX_CHARS) return trimmed;
  return trimmed.slice(0, PREVIEW_MAX_CHARS - 1) + "…";
}

async function runWithConcurrency<TItem>(
  items: TItem[],
  limit: number,
  worker: (item: TItem) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;

  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });

  await Promise.all(runners);
}

export const threadsInsightsSnapshotService = new ThreadsInsightsSnapshotService();
