import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../types/hono.js";

export const profileRoutes = new Hono<AppEnv>();

// GET /profile — basic identity info for the current user
profileRoutes.get("/profile", requireAuth, async (context) => {
  const user = context.get("user");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true, name: true },
  });

  return context.json({
    email: user.email,
    name: dbUser?.name ?? "",
    isAdmin: dbUser?.isAdmin ?? false,
  });
});
