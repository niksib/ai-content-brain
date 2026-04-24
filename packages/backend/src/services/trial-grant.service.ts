import { prisma } from "../lib/prisma.js";

export const TRIAL_CREDITS = 100;

export async function grantTrialCredits(userId: string): Promise<void> {
  const existingBalance = await prisma.creditBalance.findUnique({
    where: { userId },
  });
  if (existingBalance) return;

  await prisma.$transaction([
    prisma.creditBalance.create({
      data: { userId, balance: TRIAL_CREDITS },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: TRIAL_CREDITS,
        type: "trial_grant",
        reference: "signup",
      },
    }),
  ]);
}
