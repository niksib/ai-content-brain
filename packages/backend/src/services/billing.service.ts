import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class BillingService {
  async createCheckoutSession(
    userId: string,
    priceId: string,
    mode: "subscription" | "payment"
  ): Promise<string> {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/profile?billing=success`,
      cancel_url: `${process.env.FRONTEND_URL}/profile?billing=cancel`,
      metadata: { userId },
    });
    return session.url!;
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) return;

        if (session.mode === "subscription") {
          await this.grantCredits(
            userId,
            1000,
            "subscription_grant",
            session.subscription as string
          );
        } else if (session.mode === "payment") {
          await this.grantCredits(
            userId,
            500,
            "topup_purchase",
            session.payment_intent as string
          );
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = (invoice.metadata as Record<string, string> | null)?.userId;
        if (userId) {
          await this.grantCredits(
            userId,
            1000,
            "subscription_grant",
            invoice.id
          );
        }
        break;
      }
    }
  }

  async grantCredits(
    userId: string,
    amount: number,
    type: string,
    reference?: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          type: type as "subscription_grant" | "topup_purchase",
          reference,
        },
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
    type: string,
    reference?: string
  ): Promise<boolean> {
    const balance = await prisma.creditBalance.findUnique({
      where: { userId },
    });
    if (!balance || balance.balance < amount) return false;

    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: type as "content_plan" | "content_production" | "voice_processing",
          reference,
        },
      }),
      prisma.creditBalance.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      }),
    ]);
    return true;
  }

  async getBalance(userId: string): Promise<number> {
    const balance = await prisma.creditBalance.findUnique({
      where: { userId },
    });
    return balance?.balance ?? 0;
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
}

export const billingService = new BillingService();
