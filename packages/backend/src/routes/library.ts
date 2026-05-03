import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../types/hono.js";

export const libraryRoutes = new Hono<AppEnv>();

// List all completed ideas (= produced posts) for user with pagination and filters
libraryRoutes.get("/library", requireAuth, async (context) => {
  const user = context.get("user");

  const page = Math.max(1, Number(context.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(context.req.query("limit")) || 20));
  const platform = context.req.query("platform") || undefined;
  const format = context.req.query("format") || undefined;

  const where: Record<string, unknown> = {
    userId: user.id,
    body: { not: null as unknown as undefined },
  };
  if (platform) {
    where.platform = platform;
  }
  if (format) {
    where.format = format;
  }

  const [items, total] = await Promise.all([
    prisma.contentIdea.findMany({
      where,
      include: {
        contentPlan: {
          select: { chatSessionId: true },
        },
        insightsSnapshots: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            views: true,
            likes: true,
            replies: true,
            reposts: true,
            quotes: true,
            shares: true,
            fetchedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contentIdea.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return context.json({ items, total, page, limit, totalPages });
});

// Get specific idea by ID (used by library detail view)
libraryRoutes.get("/library/:id", requireAuth, async (context) => {
  const user = context.get("user");
  const ideaId = context.req.param("id");

  const item = await prisma.contentIdea.findUnique({
    where: { id: ideaId, userId: user.id },
    include: {
      contentPlan: { select: { chatSessionId: true } },
    },
  });

  if (!item) {
    return context.json({ error: "Content not found" }, 404);
  }

  return context.json({ content: item });
});
