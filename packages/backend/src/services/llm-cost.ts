import { prisma } from "../lib/prisma.js";

export type AnthropicModel =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

interface ModelRate {
  inputUncachedPerM: number;
  inputCachedPerM: number;
  cacheWritePerM: number;
  outputPerM: number;
}

export const MODEL_RATES: Record<AnthropicModel, ModelRate> = {
  "claude-opus-4-7": {
    inputUncachedPerM: 15.0,
    inputCachedPerM: 1.5,
    cacheWritePerM: 18.75,
    outputPerM: 75.0,
  },
  "claude-sonnet-4-6": {
    inputUncachedPerM: 3.0,
    inputCachedPerM: 0.3,
    cacheWritePerM: 3.75,
    outputPerM: 15.0,
  },
  "claude-haiku-4-5": {
    inputUncachedPerM: 1.0,
    inputCachedPerM: 0.1,
    cacheWritePerM: 1.25,
    outputPerM: 5.0,
  },
};

export interface AnthropicUsageLike {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
}

export interface NormalizedUsage {
  inputUncachedTokens: number;
  inputCachedTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}

export function normalizeUsage(usage: AnthropicUsageLike): NormalizedUsage {
  return {
    inputUncachedTokens: usage.input_tokens ?? 0,
    inputCachedTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
  };
}

export function calculateCostCents(params: {
  model: AnthropicModel;
  usage: NormalizedUsage;
}): number {
  const rate = MODEL_RATES[params.model];
  const { usage } = params;
  const dollarsPerMillion =
    (usage.inputUncachedTokens * rate.inputUncachedPerM +
      usage.inputCachedTokens * rate.inputCachedPerM +
      usage.cacheWriteTokens * rate.cacheWritePerM +
      usage.outputTokens * rate.outputPerM) /
    1_000_000;
  return Math.ceil(dollarsPerMillion * 100);
}

export type LlmActionType =
  | "agent_call"
  | "content_plan"
  | "content_production";

export interface DeductCreditsParams {
  userId: string;
  model: AnthropicModel;
  usage: AnthropicUsageLike;
  actionType: LlmActionType;
  reference?: string;
  /**
   * Credits already deducted by `requireCredits` middleware before the call ran.
   * The final deduction is `costCents - reservedCents`:
   *   - if positive, we charge the remainder (clamped to current balance)
   *   - if negative, we refund the excess to the user's balance
   */
  reservedCents?: number;
}

export interface DeductCreditsResult {
  costCents: number;
  newBalance: number;
}

export async function deductCreditsForLlmCall(
  params: DeductCreditsParams
): Promise<DeductCreditsResult> {
  const normalized = normalizeUsage(params.usage);
  const costCents = calculateCostCents({
    model: params.model,
    usage: normalized,
  });
  const reserved = Math.max(0, params.reservedCents ?? 0);

  // Adjustment = real cost minus what was already reserved in middleware.
  // Positive => charge the remainder (clamped at current balance).
  // Negative => refund the over-reservation to the user.
  const adjustment = costCents - reserved;

  const newBalance = await prisma.$transaction(async (tx) => {
    const existing = await tx.creditBalance.findUnique({
      where: { userId: params.userId },
      select: { balance: true },
    });
    const currentBalance = existing?.balance ?? 0;

    const actualAdjustment =
      adjustment >= 0 ? Math.min(currentBalance, adjustment) : adjustment;
    const nextBalance = Math.max(0, currentBalance - actualAdjustment);

    // Record the total credits actually deducted for this operation
    // (reservation + extra charge, minus any refund).
    const totalDeducted = reserved + actualAdjustment;

    await tx.creditTransaction.create({
      data: {
        userId: params.userId,
        amount: -totalDeducted,
        type: params.actionType,
        reference: params.reference,
        model: params.model,
        inputUncachedTokens: normalized.inputUncachedTokens,
        inputCachedTokens: normalized.inputCachedTokens,
        cacheWriteTokens: normalized.cacheWriteTokens,
        outputTokens: normalized.outputTokens,
        costCents,
      },
    });

    const updated = await tx.creditBalance.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, balance: nextBalance },
      update: { balance: nextBalance },
    });

    return updated.balance;
  });

  return { costCents, newBalance };
}
