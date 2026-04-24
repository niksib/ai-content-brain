import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  onboardingService,
  OnboardingBusinessRuleError,
  type QuestionAnswer,
} from "../services/onboarding.service.js";
import type { AppEnv } from "../types/hono.js";

export const onboardingRoutes = new Hono<AppEnv>();

/**
 * Standard 404/409/422 responses for the onboarding state-machine rules.
 * Any route that calls into onboardingService methods that may hit
 * `requireActiveSession` or atomic-complete guards funnels errors here.
 */
function respondWithOnboardingError(
  context: Context<AppEnv>,
  error: unknown,
): Response {
  if (error instanceof OnboardingBusinessRuleError) {
    return context.json(
      { error: error.message, code: error.code },
      error.httpStatus as ContentfulStatusCode,
    );
  }
  throw error;
}

onboardingRoutes.get("/onboarding/session", requireAuth, async (context) => {
  const user = context.get("user");
  const session = await onboardingService.getSession(user.id);
  return context.json({ session });
});

onboardingRoutes.post("/onboarding/session/start", requireAuth, async (context) => {
  const user = context.get("user");
  const session = await onboardingService.getOrCreateSession(user.id);
  return context.json({ session });
});

onboardingRoutes.post("/onboarding/session/analyze", requireAuth, async (context) => {
  const user = context.get("user");
  try {
    const session = await onboardingService.runAnalysis(user.id);
    return context.json({ session });
  } catch (error) {
    return respondWithOnboardingError(context, error);
  }
});

onboardingRoutes.post("/onboarding/session/analyze/fallback", requireAuth, async (context) => {
  const user = context.get("user");
  try {
    const session = await onboardingService.runAnalysisFallback(user.id);
    return context.json({ session });
  } catch (error) {
    return respondWithOnboardingError(context, error);
  }
});

onboardingRoutes.post("/onboarding/session/answer", requireAuth, async (context) => {
  const user = context.get("user");
  const body = (await context.req.json()) as {
    questionKey?: string;
    selected?: string[];
    text?: string;
  };

  if (!body.questionKey) {
    return context.json({ error: "questionKey is required" }, 400);
  }

  const answer: QuestionAnswer = {
    selected: Array.isArray(body.selected) ? body.selected : [],
    text: typeof body.text === "string" ? body.text : "",
  };

  if (answer.selected.length === 0 && !answer.text.trim()) {
    return context.json({ error: "Provide at least one selection or free text" }, 400);
  }

  try {
    const session = await onboardingService.saveAnswer(user.id, body.questionKey, answer);
    return context.json({ session });
  } catch (error) {
    return respondWithOnboardingError(context, error);
  }
});

onboardingRoutes.post("/onboarding/session/summary", requireAuth, async (context) => {
  const user = context.get("user");
  try {
    const session = await onboardingService.generateSummary(user.id);
    return context.json({ session });
  } catch (error) {
    if (error instanceof OnboardingBusinessRuleError) {
      return respondWithOnboardingError(context, error);
    }
    console.error("[onboarding/summary]", error);
    return context.json({ error: "Failed to generate summary" }, 503);
  }
});

onboardingRoutes.post("/onboarding/session/clarify", requireAuth, async (context) => {
  const user = context.get("user");
  const body = (await context.req.json()) as { clarification?: string };
  const clarification = (body.clarification ?? "").trim();
  if (!clarification) {
    return context.json({ error: "clarification is required" }, 400);
  }
  try {
    const session = await onboardingService.applyClarification(user.id, clarification);
    return context.json({ session });
  } catch (caughtError) {
    if (caughtError instanceof OnboardingBusinessRuleError) {
      return respondWithOnboardingError(context, caughtError);
    }
    console.error("[onboarding/clarify]", caughtError);
    return context.json({ error: "Failed to apply clarification" }, 503);
  }
});

onboardingRoutes.post("/onboarding/session/complete", requireAuth, async (context) => {
  const user = context.get("user");
  try {
    const session = await onboardingService.complete(user.id);
    return context.json({ session });
  } catch (error) {
    if (error instanceof OnboardingBusinessRuleError) {
      return respondWithOnboardingError(context, error);
    }
    console.error("[onboarding/complete]", error);
    return context.json({ error: "Failed to complete onboarding" }, 500);
  }
});
