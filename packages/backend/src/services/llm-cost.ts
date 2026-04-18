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

  const [, balanceRow] = await prisma.$transaction([
    prisma.creditTransaction.create({
      data: {
        userId: params.userId,
        amount: -costCents,
        type: params.actionType,
        reference: params.reference,
        model: params.model,
        inputUncachedTokens: normalized.inputUncachedTokens,
        inputCachedTokens: normalized.inputCachedTokens,
        cacheWriteTokens: normalized.cacheWriteTokens,
        outputTokens: normalized.outputTokens,
        costCents,
      },
    }),
    prisma.creditBalance.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, balance: -costCents },
      update: { balance: { decrement: costCents } },
    }),
  ]);

  return { costCents, newBalance: balanceRow.balance };
}
