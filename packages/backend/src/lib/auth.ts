import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { grantTrialCredits } from "../services/trial-grant.service.js";

export const auth = betterAuth({
  baseURL: process.env.BACKEND_URL || "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await grantTrialCredits(user.id);
        },
      },
    },
  },
});
