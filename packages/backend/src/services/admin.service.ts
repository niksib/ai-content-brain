import { prisma } from "../lib/prisma.js";
import { PLANS, getPlanById } from "../billing/plans.js";

export interface AdminUserSocialAccount {
  platform: "threads" | "instagram" | "linkedin" | "tiktok";
  handle: string;
  profileUrl: string;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  handle: string | null;
  isAdmin: boolean;
  createdAt: string;
  plan: "free" | "creator" | "pro";
  planName: string;
  monthlyCredits: number;
  balance: number;
  creditsUsed: number;
  creditsUsedPercent: number;
  socialAccounts: AdminUserSocialAccount[];
}

export class AdminService {
  async listUsers(): Promise<AdminUserListItem[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (users.length === 0) return [];

    const userIds = users.map((user) => user.id);

    const [subscriptions, balances, threadsAccounts] = await Promise.all([
      prisma.subscription.findMany({ where: { userId: { in: userIds } } }),
      prisma.creditBalance.findMany({ where: { userId: { in: userIds } } }),
      prisma.threadsAccount.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, username: true, profilePictureUrl: true },
      }),
    ]);

    const subscriptionByUserId = new Map(subscriptions.map((sub) => [sub.userId, sub]));
    const balanceByUserId = new Map(balances.map((bal) => [bal.userId, bal.balance]));
    const threadsByUserId = new Map(threadsAccounts.map((acc) => [acc.userId, acc]));

    return users.map((user) => {
      const subscription = subscriptionByUserId.get(user.id);
      const planId = subscription?.plan ?? "free";
      const plan = getPlanById(planId) ?? PLANS.free;
      const balance = balanceByUserId.get(user.id) ?? 0;
      const monthlyCredits = plan.monthlyCredits;
      const creditsUsed = Math.max(0, monthlyCredits - balance);
      const creditsUsedPercent = monthlyCredits > 0
        ? Math.min(100, Math.round((creditsUsed / monthlyCredits) * 100))
        : 0;

      const threadsAccount = threadsByUserId.get(user.id);
      const socialAccounts: AdminUserSocialAccount[] = [];
      if (threadsAccount && threadsAccount.username) {
        socialAccounts.push({
          platform: "threads",
          handle: threadsAccount.username,
          profileUrl: `https://www.threads.net/@${threadsAccount.username}`,
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: threadsAccount?.profilePictureUrl ?? user.image ?? null,
        handle: threadsAccount?.username ?? null,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
        plan: plan.id,
        planName: plan.name,
        monthlyCredits,
        balance,
        creditsUsed,
        creditsUsedPercent,
        socialAccounts,
      };
    });
  }

  async grantCredits(userId: string, amount: number, adminId: string): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new AdminUserNotFoundError(userId);
    }

    const reference = `admin:${adminId}`;
    const [, updatedBalance] = await prisma.$transaction([
      prisma.creditTransaction.create({
        data: { userId, amount, type: "topup_purchase", reference },
      }),
      prisma.creditBalance.upsert({
        where: { userId },
        create: { userId, balance: amount },
        update: { balance: { increment: amount } },
      }),
    ]);

    return updatedBalance.balance;
  }
}

export class AdminUserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`User not found: ${userId}`);
    this.name = "AdminUserNotFoundError";
  }
}

export const adminService = new AdminService();
