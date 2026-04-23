import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { PLANS, getPlanById, getPlanByStripePriceId, type PlanId } from "../billing/plans.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class BillingService {
  async createCheckoutSession(userId: string, planId: PlanId): Promise<string> {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error(`Unknown plan: ${planId}`);
    }
    if (!plan.stripePriceId) {
      throw new Error(`Plan ${planId} is not purchasable`);
    }

    const customerId = await this.ensureStripeCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings?billing=success`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?billing=cancel`,
      metadata: { userId, planId },
      subscription_data: {
        metadata: { userId, planId },
      },
    });
    return session.url!;
  }

  async createPortalSession(userId: string): Promise<string> {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeCustomerId) {
      throw new Error("No Stripe customer on file");
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings`,
    });
    return session.url;
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId as PlanId | undefined;
        if (!userId || !planId) return;

        const plan = getPlanById(planId);
        if (!plan) return;

        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;

        const stripeSub = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
        const firstItem = stripeSub?.items.data[0];
        const periodEnd = firstItem?.current_period_end ?? stripeSub?.billing_cycle_anchor ?? null;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: planId,
            status: "active",
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
            stripePriceId: plan.stripePriceId ?? undefined,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          },
          update: {
            plan: planId,
            status: "active",
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
            stripePriceId: plan.stripePriceId ?? undefined,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: false,
          },
        });

        await this.resetCreditsForPlan(userId, plan.monthlyCredits, subscriptionId ?? session.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof (invoice as { subscription?: string | null }).subscription === "string"
          ? (invoice as { subscription: string }).subscription
          : null;
        if (!subscriptionId) return;

        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (!subscription) return;

        const plan = getPlanById(subscription.plan);
        if (!plan) return;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const firstItem = stripeSub.items.data[0];
        const periodEnd = firstItem?.current_period_end ?? null;

        await prisma.subscription.update({
          where: { userId: subscription.userId },
          data: {
            status: "active",
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          },
        });

        await this.resetCreditsForPlan(subscription.userId, plan.monthlyCredits, invoice.id ?? subscriptionId);
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!subscription) return;

        const priceId = stripeSub.items.data[0]?.price.id;
        const plan = priceId ? getPlanByStripePriceId(priceId) : null;

        await prisma.subscription.update({
          where: { userId: subscription.userId },
          data: {
            plan: plan?.id ?? subscription.plan,
            stripePriceId: priceId ?? subscription.stripePriceId,
            status: this.mapStripeStatus(stripeSub.status),
            currentPeriodEnd: stripeSub.items.data[0]?.current_period_end
              ? new Date(stripeSub.items.data[0].current_period_end * 1000)
              : subscription.currentPeriodEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!subscription) return;

        await prisma.subscription.update({
          where: { userId: subscription.userId },
          data: {
            plan: "free",
            status: "canceled",
            stripeSubscriptionId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
          },
        });

        await this.resetCreditsForPlan(subscription.userId, PLANS.free.monthlyCredits, stripeSub.id);
        break;
      }
    }
  }

  async grantCredits(
    userId: string,
    amount: number,
    type: "subscription_grant" | "topup_purchase" | "trial_grant",
    reference?: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: { userId, amount, type, reference },
      }),
      prisma.creditBalance.upsert({
        where: { userId },
        create: { userId, balance: amount },
        update: { balance: { increment: amount } },
      }),
    ]);
  }

  async deductCredits(
    userId: string,
    amount: number,
    type: "content_plan" | "content_production" | "voice_processing" | "agent_call",
    reference?: string
  ): Promise<boolean> {
    const balance = await prisma.creditBalance.findUnique({ where: { userId } });
    if (!balance || balance.balance < amount) return false;

    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: { userId, amount: -amount, type, reference },
      }),
      prisma.creditBalance.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      }),
    ]);
    return true;
  }

  async getBalance(userId: string): Promise<number> {
    const balance = await prisma.creditBalance.findUnique({ where: { userId } });
    return balance?.balance ?? 0;
  }

  async getSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) {
      return {
        plan: "free" as const,
        status: "active" as const,
        monthlyCredits: PLANS.free.monthlyCredits,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
    const plan = getPlanById(subscription.plan) ?? PLANS.free;
    return {
      plan: subscription.plan,
      status: subscription.status,
      monthlyCredits: plan.monthlyCredits,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.creditTransaction.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  private async ensureStripeCustomer(userId: string): Promise<string> {
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true },
    });

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    });

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: "free", status: "active", stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  private async resetCreditsForPlan(userId: string, monthlyCredits: number, reference: string): Promise<void> {
    await prisma.$transaction([
      prisma.creditBalance.upsert({
        where: { userId },
        create: { userId, balance: monthlyCredits },
        update: { balance: monthlyCredits },
      }),
      prisma.creditTransaction.create({
        data: { userId, amount: monthlyCredits, type: "subscription_grant", reference },
      }),
    ]);
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" | "incomplete" {
    switch (status) {
      case "active":
      case "trialing":
        return "active";
      case "past_due":
      case "unpaid":
        return "past_due";
      case "canceled":
        return "canceled";
      default:
        return "incomplete";
    }
  }
}

export const billingService = new BillingService();
