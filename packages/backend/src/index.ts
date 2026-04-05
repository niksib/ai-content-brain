import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { profileRoutes } from "./routes/profile.js";
import { voiceRoutes } from "./routes/voice.js";
import { sessionRoutes } from "./routes/sessions.js";
import { chatRoutes } from "./routes/chat.js";
import { ideaRoutes } from "./routes/ideas.js";
import { libraryRoutes } from "./routes/library.js";

const app = new Hono();

app.use(logger());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.route("/api", healthRoute);
app.route("/api", authRoutes);
app.route("/api", onboardingRoutes);
app.route("/api", profileRoutes);
app.route("/api", voiceRoutes);
app.route("/api", sessionRoutes);
app.route("/api", chatRoutes);
app.route("/api", ideaRoutes);
app.route("/api", libraryRoutes);

const port = 3001;

console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export { app };
