import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../types/hono.js";
import { processOnboardingAnswers, type OnboardingAnswer } from "../services/onboarding.service.js";

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

// Submit all onboarding answers for agent processing
onboardingRoutes.post("/onboarding/submit", requireAuth, async (context) => {
  const user = context.get("user");
  const body = await context.req.json();
  const { answers } = body as { answers: OnboardingAnswer[] };

  if (!Array.isArray(answers) || answers.length === 0) {
    return context.json({ error: "answers array is required" }, 400);
  }

  for (const a of answers) {
    if (typeof a.question !== "string" || typeof a.answer !== "string") {
      return context.json({ error: "each answer must have question and answer strings" }, 400);
    }
  }

  try {
    const result = await processOnboardingAnswers(user.id, answers);
    return context.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isOverloaded = message.includes("overloaded");
    console.error("[onboarding/submit]", err);
    return context.json(
      { error: isOverloaded ? "Service temporarily overloaded. Please try again." : "Something went wrong." },
      503
    );
  }
});
