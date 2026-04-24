export type PlanId = "free" | "creator" | "pro";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsd: number;
  monthlyCredits: number;
  stripePriceId: string | null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    monthlyCredits: 100,
    stripePriceId: null,
  },
  creator: {
    id: "creator",
    name: "Creator",
    priceUsd: 20,
    monthlyCredits: 1000,
    stripePriceId: process.env.STRIPE_PRICE_VOICE ?? null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 40,
    monthlyCredits: 2000,
    stripePriceId: process.env.STRIPE_PRICE_CHORUS ?? null,
  },
};

export function getPlanById(planId: string): PlanDefinition | null {
  if (planId === "free" || planId === "creator" || planId === "pro") {
    return PLANS[planId];
  }
  return null;
}

export function getPlanByStripePriceId(priceId: string): PlanDefinition | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) return plan;
  }
  return null;
}
