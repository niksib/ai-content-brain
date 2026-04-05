import { createMiddleware } from "hono/factory";
import { billingService } from "../services/billing.service.js";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export function requireCredits(cost: number, type: string) {
  return createMiddleware(async (context, next) => {
    const user = context.get("user" as never) as AuthUser;
    const balance = await billingService.getBalance(user.id);

    if (balance < cost) {
      return context.json(
        { error: "Insufficient credits", required: cost, balance },
        402
      );
    }

    context.set("creditCost" as never, cost);
    context.set("creditType" as never, type);
    await next();
  });
}
