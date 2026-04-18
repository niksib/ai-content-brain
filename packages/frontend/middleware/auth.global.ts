export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/') return;

  const isAuthenticated = useState<boolean | null>('auth:authenticated', () => null);

  if (isAuthenticated.value === null) {
    try {
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/api/profile`, {
        credentials: 'include',
      });
      isAuthenticated.value = true;
    } catch {
      isAuthenticated.value = false;
    }
  }

  if (!isAuthenticated.value) {
    return navigateTo('/');
  }
});
