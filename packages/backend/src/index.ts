import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { profileRoutes } from "./routes/profile.js";
import { memoryRoutes } from "./routes/memory.js";
import { voiceRoutes } from "./routes/voice.js";
import { sessionRoutes } from "./routes/sessions.js";
import { chatRoutes } from "./routes/chat.js";
import { ideaRoutes } from "./routes/ideas.js";
import { libraryRoutes } from "./routes/library.js";
import { billingRoutes } from "./routes/billing.js";
import { threadsRoutes } from "./routes/threads.js";
import { mediaRoutes } from "./routes/media.js";
import { devRoutes } from "./routes/dev.js";
import { threadsSchedulerService } from "./services/threads-scheduler.service.js";
import { threadsInsightsSnapshotService } from "./services/threads-insights-snapshot.service.js";
import { rateLimit } from "./middleware/rate-limit.middleware.js";

const app = new Hono();

app.use(logger());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Global fallback limiter — 120 req/min per user/IP covers normal UI polling
// with plenty of headroom. Stricter per-route limits apply below.
app.use("/api/*", rateLimit({ windowMs: 60_000, max: 120, keyPrefix: "global" }));

// Auth brute-force / password spraying: 10 attempts per 15 minutes.
app.use("/api/auth/*", rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "auth" }));

// Paid API calls (LLM, transcription, media upload): stricter to cap cost abuse.
app.use("/api/voice/*", rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "voice" }));
app.use("/api/media/*", rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "media" }));
app.use("/api/sessions/:id/message", rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "chat" }));
app.use("/api/ideas/:id/*", rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "ideas" }));

app.route("/api", healthRoute);
app.route("/api", authRoutes);
app.route("/api", onboardingRoutes);
app.route("/api", profileRoutes);
app.route("/api", memoryRoutes);
app.route("/api", voiceRoutes);
app.route("/api", sessionRoutes);
app.route("/api", chatRoutes);
app.route("/api", ideaRoutes);
app.route("/api", libraryRoutes);
app.route("/api", billingRoutes);
app.route("/api", threadsRoutes);
app.route("/api", mediaRoutes);

if (process.env.NODE_ENV !== "production") {
  app.route("/api", devRoutes);
}

const port = 3001;

console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

threadsSchedulerService.start();
threadsInsightsSnapshotService.start();

export { app };
