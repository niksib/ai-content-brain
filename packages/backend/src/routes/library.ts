import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const libraryRoutes = new Hono();

// List all produced content for user with pagination and filters
libraryRoutes.get("/library", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;

  const page = Math.max(1, Number(context.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(context.req.query("limit")) || 20));
  const platform = context.req.query("platform") || undefined;
  const format = context.req.query("format") || undefined;

  const where: Record<string, unknown> = { userId: user.id };
  if (platform) {
    where.platform = platform;
  }
  if (format) {
    where.format = format;
  }

  const [items, total] = await Promise.all([
    prisma.producedContent.findMany({
      where,
      include: {
        contentIdea: {
          select: {
            id: true,
            angle: true,
            description: true,
            platform: true,
            format: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.producedContent.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return context.json({ items, total, page, limit, totalPages });
});

// Get specific produced content by ID
libraryRoutes.get("/library/:id", requireAuth, async (context) => {
  const user = context.get("user" as never) as AuthUser;
  const contentId = context.req.param("id");

  const content = await prisma.producedContent.findUnique({
    where: { id: contentId },
    include: {
      contentIdea: true,
    },
  });

  if (!content || content.userId !== user.id) {
    return context.json({ error: "Content not found" }, 404);
  }

  return context.json({ content });
});
