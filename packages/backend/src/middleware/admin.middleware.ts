import { createMiddleware } from "hono/factory";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../types/hono.js";

// Must run after requireAuth — relies on context.get("user").
export const requireAdmin = createMiddleware<AppEnv>(async (context, next) => {
  const user = context.get("user");
  if (!user) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });

  if (!dbUser?.isAdmin) {
    return context.json({ error: "Forbidden" }, 403);
  }

  await next();
});
