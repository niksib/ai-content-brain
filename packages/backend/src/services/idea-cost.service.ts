import { prisma } from "../lib/prisma.js";

/**
 * True iff the user has the admin flag. Used to gate cost-attribution
 * data — non-admins must not see infrastructure spend per idea.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return row?.isAdmin === true;
}

/**
 * Sum of LLM costCents per content idea. Production-time agent runs
 * (content_production, agent_call) bill against the idea via
 * CreditTransaction.reference = ideaId — see routes/ideas.ts. Strategist
 * cost (content_plan) is keyed by chatSessionId, so it is NOT included
 * here; it cannot be attributed to any single idea.
 */
export async function getIdeaCostsMap(
  userId: string,
  ideaIds: string[],
): Promise<Map<string, number>> {
  if (ideaIds.length === 0) return new Map();

  const grouped = await prisma.creditTransaction.groupBy({
    by: ["reference"],
    where: {
      userId,
      reference: { in: ideaIds },
      costCents: { not: null },
    },
    _sum: { costCents: true },
  });

  const map = new Map<string, number>();
  for (const row of grouped) {
    if (row.reference) {
      map.set(row.reference, row._sum.costCents ?? 0);
    }
  }
  return map;
}

export function attachCostCents<T extends { id: string }>(
  ideas: T[],
  costMap: Map<string, number>,
): Array<T & { costCents: number }> {
  return ideas.map((idea) => ({ ...idea, costCents: costMap.get(idea.id) ?? 0 }));
}

/**
 * Convenience wrapper: returns ideas enriched with `costCents` only when the
 * caller is an admin. Non-admins get the original ideas array unchanged so
 * the field never leaves the server.
 */
export async function maybeAttachCostsForAdmin<T extends { id: string }>(
  userId: string,
  ideas: T[],
): Promise<T[] | Array<T & { costCents: number }>> {
  if (!(await isAdminUser(userId))) return ideas;
  const costMap = await getIdeaCostsMap(userId, ideas.map((idea) => idea.id));
  return attachCostCents(ideas, costMap);
}
