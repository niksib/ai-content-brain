import { Hono } from "hono";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.middleware.js";
import { billingService } from "../services/billing.service.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const billingRoutes = new Hono();

// Get credit balance
billingRoutes.get("/billing/balance", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const balance = await billingService.getBalance(user.id);
  return context.json({ balance });
});

// Get transaction history (paginated)
billingRoutes.get("/billing/transactions", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const page = parseInt(context.req.query("page") || "1", 10);
  const limit = parseInt(context.req.query("limit") || "20", 10);
  const transactions = await billingService.getTransactions(user.id, page, limit);
  return context.json(transactions);
});

// Create Stripe Checkout session
billingRoutes.post("/billing/checkout", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const body = await context.req.json();
  const { priceId, mode } = body;

  if (!priceId || !mode) {
    return context.json({ error: "priceId and mode are required" }, 400);
  }

  if (mode !== "subscription" && mode !== "payment") {
    return context.json({ error: "mode must be 'subscription' or 'payment'" }, 400);
  }

  const checkoutUrl = await billingService.createCheckoutSession(
    user.id,
    priceId,
    mode
  );
  return context.json({ url: checkoutUrl });
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

  await billingService.handleWebhook(event);
  return context.json({ received: true });
});

// Subscription status placeholder
billingRoutes.get("/billing/subscription", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const balance = await billingService.getBalance(user.id);
  return context.json({ plan: "free_beta", credits: balance });
});
