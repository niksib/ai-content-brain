import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../types/hono.js";
import {
  processOnboardingAnswers,
  type OnboardingSubmission,
} from "../services/onboarding.service.js";

export const onboardingRoutes = new Hono<AppEnv>();

// Check if onboarding is complete
onboardingRoutes.get("/onboarding/status", requireAuth, async (context) => {
  const user = context.get("user");
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  return context.json({
    completed: !!profile,
    profile: profile || null,
  });
});

// Submit quiz answers for agent review + profile creation
onboardingRoutes.post("/onboarding/submit", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json() as OnboardingSubmission;

  if (!body.quiz || typeof body.quiz !== "object") {
    return context.json({ error: "quiz object is required" }, 400);
  }

  const { quiz } = body;

  if (!Array.isArray(quiz.platforms) || quiz.platforms.length === 0) {
    return context.json({ error: "quiz.platforms is required" }, 400);
  }
  if (!quiz.stage) {
    return context.json({ error: "quiz.stage is required" }, 400);
  }
  if (!Array.isArray(quiz.topics) || quiz.topics.length === 0) {
    return context.json({ error: "quiz.topics is required" }, 400);
  }
  if (!quiz.audience?.trim()) {
    return context.json({ error: "quiz.audience is required" }, 400);
  }
  if (!quiz.goal) {
    return context.json({ error: "quiz.goal is required" }, 400);
  }
  if (!Array.isArray(quiz.toneStyles) || quiz.toneStyles.length === 0) {
    return context.json({ error: "quiz.toneStyles is required" }, 400);
  }
  if (!quiz.toneExample?.trim()) {
    return context.json({ error: "quiz.toneExample is required" }, 400);
  }

  try {
    const result = await processOnboardingAnswers(user.id, body);
    return context.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isOverloaded = message.toLowerCase().includes("overloaded");
    console.error("[onboarding/submit]", err);
    return context.json(
      {
        error: isOverloaded
          ? "Service temporarily overloaded. Please try again."
          : "Something went wrong.",
      },
      503
    );
  }
});
