import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { adminService, AdminUserNotFoundError } from "../services/admin.service.js";
import type { AppEnv } from "../types/hono.js";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("/admin/*", requireAuth, requireAdmin);

adminRoutes.get("/admin/users", async (context) => {
  const users = await adminService.listUsers();
  return context.json({ users });
});

adminRoutes.post("/admin/users/:id/credits", async (context) => {
  const targetUserId = context.req.param("id");
  const admin = context.get("user");
  const body = await context.req.json().catch(() => null) as { amount?: unknown } | null;

  const rawAmount = body?.amount;
  const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return context.json({ error: "amount must be a positive integer" }, 400);
  }
  if (amount > 1_000_000) {
    return context.json({ error: "amount is too large" }, 400);
  }

  try {
    const balance = await adminService.grantCredits(targetUserId, amount, admin.id);
    return context.json({ balance });
  } catch (error) {
    if (error instanceof AdminUserNotFoundError) {
      return context.json({ error: "User not found" }, 404);
    }
    console.error("[admin/credits] Failed to grant credits:", error);
    return context.json({ error: "Failed to grant credits" }, 500);
  }
});
