import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { memoryService } from "../services/memory.service.js";
import { isCanonicalKey, CANONICAL_KEYS } from "../memory/canonical-keys.js";
import type { AppEnv } from "../types/hono.js";

export const memoryRoutes = new Hono<AppEnv>();

// GET /memory — list all memory blocks for the current user (with canonical catalog)
memoryRoutes.get("/memory", requireAuth, async (context) => {
  const user = context.get("user");
  const blocks = await memoryService.getAllBlocks(user.id);
  return context.json({
    blocks,
    canonicalKeys: CANONICAL_KEYS,
  });
});

// PATCH /memory/:key — upsert a memory block (canonical or custom)
memoryRoutes.patch("/memory/:key", requireAuth, async (context) => {
  const user = context.get("user");
  const key = context.req.param("key").trim();
  if (!key) {
    return context.json({ error: "key is required" }, 400);
  }

  const body = await context.req.json() as {
    title?: string;
    description?: string;
    content?: string;
  };

  if (typeof body.content !== "string" || !body.content.trim()) {
    return context.json({ error: "content is required" }, 400);
  }

  const canonical = CANONICAL_KEYS.find((entry) => entry.key === key);
  const title = body.title?.trim() || canonical?.title || key;
  const description = body.description?.trim() || canonical?.description || "";

  await memoryService.upsertMemoryBlock(user.id, {
    key,
    title,
    description,
    content: body.content.trim(),
  });

  return context.json({ success: true });
});

// DELETE /memory/:key — remove a non-canonical block
memoryRoutes.delete("/memory/:key", requireAuth, async (context) => {
  const user = context.get("user");
  const key = context.req.param("key").trim();
  if (!key) {
    return context.json({ error: "key is required" }, 400);
  }

  if (isCanonicalKey(key)) {
    return context.json({ error: "Canonical memory blocks cannot be deleted" }, 400);
  }

  const removed = await memoryService.deleteMemoryBlock(user.id, key);
  if (!removed) {
    return context.json({ error: "Block not found" }, 404);
  }
  return context.json({ success: true });
});
