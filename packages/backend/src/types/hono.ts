/**
 * Hono environment type for authenticated routes.
 * The auth middleware sets "user" and "session" on the context.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export type AppEnv = {
  Variables: {
    user: AuthUser;
    session: AuthSession;
  };
};
