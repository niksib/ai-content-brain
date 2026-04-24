import { createMiddleware } from "hono/factory";

interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests permitted per key per window. */
  max: number;
  /** Key to bucket requests by. Defaults to authenticated user id, falling back to client IP. */
  keyPrefix: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

// Single-process in-memory store. Fine for MVP single-backend deployment.
// Swap for a Redis-backed store before scaling horizontally.
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup — prevents unbounded map growth on a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();

function resolveKey(context: {
  get: (key: string) => unknown;
  req: { header: (name: string) => string | undefined };
}): string {
  const user = context.get("user") as { id?: string } | undefined;
  if (user?.id) return `u:${user.id}`;
  // Hono on @hono/node-server exposes x-forwarded-for; fall back to a constant
  // so anonymous traffic is still collectively capped.
  const forwarded = context.req.header("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || context.req.header("x-real-ip") || "anon";
  return `ip:${ip}`;
}

export function rateLimit(options: RateLimitOptions) {
  return createMiddleware(async (context, next) => {
    const key = `${options.keyPrefix}:${resolveKey(context as unknown as { get: (key: string) => unknown; req: { header: (name: string) => string | undefined } })}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      context.header("Retry-After", String(retryAfter));
      return context.json(
        { error: "Too many requests", retryAfter },
        429
      );
    }

    bucket.count += 1;
    return next();
  });
}
