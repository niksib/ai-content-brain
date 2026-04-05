import { Hono } from "hono";
import { auth } from "../lib/auth.js";

export const authRoutes = new Hono();

authRoutes.on(["POST", "GET"], "/auth/*", (context) => {
  return auth.handler(context.req.raw);
});
