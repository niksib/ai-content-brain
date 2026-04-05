import { Hono } from "hono";

const healthRoute = new Hono();

healthRoute.get("/health", (context) => {
  return context.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export { healthRoute };
