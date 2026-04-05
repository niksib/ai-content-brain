import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js";

export const requireAuth = createMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  if (!session) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  context.set("user", session.user);
  context.set("session", session.session);

  await next();
});
