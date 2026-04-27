// Auth gate. Hits /api/profile to confirm the session cookie is still valid
// and caches the result for a short TTL so rapid client-side navigation
// (e.g. calendar ↔ settings) doesn't fan out into duplicate pings.
//
// IMPORTANT: the cache expires on its own after AUTH_CACHE_TTL_MS. Callers
// (layout logout handler, etc.) also reset `auth:authenticated` to false
// when they know the session is gone, so a stale `true` can't survive past
// the user actually signing out.

const AUTH_CACHE_TTL_MS = 30_000;

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/' || to.path === '/og-preview') return;

  const isAuthenticated = useState<boolean | null>('auth:authenticated', () => null);
  const checkedAt = useState<number>('auth:checked-at', () => 0);

  const now = Date.now();
  const stale = now - checkedAt.value > AUTH_CACHE_TTL_MS;
  const needsVerify = isAuthenticated.value === null || stale;

  if (needsVerify) {
    try {
      const config = useRuntimeConfig();
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {};
      await $fetch(`${config.public.apiBaseUrl}/api/profile`, {
        credentials: 'include',
        headers,
      });
      isAuthenticated.value = true;
    } catch {
      isAuthenticated.value = false;
    }
    checkedAt.value = now;
  }

  if (!isAuthenticated.value) {
    return navigateTo('/');
  }
});
