import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../types/hono.js";

const EDITABLE_FIELDS = [
  "platforms",
  "niche",
  "topics",
  "audienceDescription",
  "audiencePainPoints",
  "stage",
  "toneOfVoice",
  "toneExamples",
  "goals",
  "contentLanguage",
] as const;

export const profileRoutes = new Hono<AppEnv>();

// Get creator profile for authenticated user
profileRoutes.get("/profile", requireAuth, async (context) => {
  const user = context.get("user");

  const [profile, dbUser] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: user.id } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { isAdmin: true, name: true } }),
  ]);

  if (!profile) {
    return context.json({ error: "Profile not found" }, 404);
  }

  return context.json({
    profile,
    email: user.email,
    name: dbUser?.name ?? '',
    isAdmin: dbUser?.isAdmin ?? false,
  });
});

// Update editable fields on the creator profile
profileRoutes.patch("/profile", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json();

  // Only allow known editable fields
  const updateData: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return context.json({ error: "No valid fields to update" }, 400);
  }

  // Validate stage enum if provided
  if (
    updateData.stage &&
    !["starting", "growing", "established"].includes(updateData.stage as string)
  ) {
    return context.json({ error: "Invalid stage value" }, 400);
  }

  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!existingProfile) {
    return context.json({ error: "Profile not found" }, 404);
  }

  const updatedProfile = await prisma.creatorProfile.update({
    where: { userId: user.id },
    data: updateData,
  });

  return context.json({ profile: updatedProfile });
});
