import { Hono } from "hono";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.middleware.js";
import { billingService } from "../services/billing.service.js";
import { PLANS, getPlanById, type PlanId } from "../billing/plans.js";
import type { AppEnv } from "../types/hono.js";

export const billingRoutes = new Hono<AppEnv>();

// Get credit balance
billingRoutes.get("/billing/balance", requireAuth, async (context) => {
  const user = context.get("user");
  const balance = await billingService.getBalance(user.id);
  return context.json({ balance });
});

// Get transaction history (paginated)
billingRoutes.get("/billing/transactions", requireAuth, async (context) => {
  const user = context.get("user");
  const page = parseInt(context.req.query("page") || "1", 10);
  const limit = parseInt(context.req.query("limit") || "20", 10);
  const transactions = await billingService.getTransactions(user.id, page, limit);
  return context.json(transactions);
});

// List available plans
billingRoutes.get("/billing/plans", async (context) => {
  return context.json({
    plans: Object.values(PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceUsd: plan.priceUsd,
      monthlyCredits: plan.monthlyCredits,
      purchasable: Boolean(plan.stripePriceId),
    })),
  });
});

// Get current subscription status
billingRoutes.get("/billing/subscription", requireAuth, async (context) => {
  const user = context.get("user");
  const [subscription, balance] = await Promise.all([
    billingService.getSubscription(user.id),
    billingService.getBalance(user.id),
  ]);
  return context.json({ ...subscription, balance });
});

// Create Stripe Checkout session for a plan
billingRoutes.post("/billing/checkout", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as { planId?: string };

  if (!body.planId) {
    return context.json({ error: "planId is required" }, 400);
  }

  const plan = getPlanById(body.planId);
  if (!plan) {
    return context.json({ error: "Unknown plan" }, 400);
  }
  if (!plan.stripePriceId) {
    return context.json({ error: "This plan is not purchasable" }, 400);
  }

  try {
    const url = await billingService.createCheckoutSession(user.id, plan.id as PlanId);
    return context.json({ url });
  } catch (error) {
    console.error("[billing/checkout] Failed to create checkout:", error);
    return context.json({ error: "Failed to start checkout" }, 500);
  }
});

// Stripe Customer Portal (manage subscription)
billingRoutes.post("/billing/portal", requireAuth, async (context) => {
  const user = context.get("user");
  try {
    const url = await billingService.createPortalSession(user.id);
    return context.json({ url });
  } catch (error) {
    console.error("[billing/portal] Failed to open portal:", error);
    return context.json({ error: "No active subscription" }, 400);
  }
});

// Stripe webhook (no auth — uses Stripe signature verification)
billingRoutes.post("/billing/webhook", async (context) => {
  const signature = context.req.header("stripe-signature");
  if (!signature) {
    return context.json({ error: "Missing stripe-signature header" }, 400);
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return context.json({ error: "Webhook not configured" }, 500);
  }

  const rawBody = await context.req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return context.json({ error: "Invalid signature" }, 400);
  }

  try {
    await billingService.handleWebhook(event);
  } catch (error) {
    console.error("[billing/webhook] Failed to handle event:", event.type, error);
    return context.json({ error: "Webhook handler failed" }, 500);
  }

  return context.json({ received: true });
});
