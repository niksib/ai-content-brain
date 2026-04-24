import { createMiddleware } from "hono/factory";
import { prisma } from "../lib/prisma.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const CREDIT_RESERVATION_KEY = "creditReservation";

/**
 * Atomically reserves `cost` credits before the route handler runs.
 *
 * The reservation is applied via `updateMany WHERE balance >= cost`, so
 * concurrent requests can't both pass the gate with the same starting balance.
 * If reservation fails, returns 402 without invoking the handler.
 *
 * The final LLM cost is reconciled post-stream in `deductCreditsForLlmCall`,
 * which reads the reservation from context and only deducts the remainder
 * (or refunds the excess if the real call cost less than reserved).
 */
export function requireCredits(cost: number, type: string) {
  return createMiddleware(async (context, next) => {
    const user = context.get("user" as never) as AuthUser;

    const result = await prisma.creditBalance.updateMany({
      where: { userId: user.id, balance: { gte: cost } },
      data: { balance: { decrement: cost } },
    });

    if (result.count === 0) {
      const existing = await prisma.creditBalance.findUnique({
        where: { userId: user.id },
        select: { balance: true },
      });
      return context.json(
        { error: "Insufficient credits", required: cost, balance: existing?.balance ?? 0 },
        402
      );
    }

    context.set(CREDIT_RESERVATION_KEY as never, cost);
    context.set("creditType" as never, type);
    await next();
  });
}
