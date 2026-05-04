import { useProfileStore } from '~/stores/profile';

// Per-route guard for /admin/* pages. Runs after auth.global, so we can
// assume the user is signed in. Loads the profile if it has not been fetched
// yet (deep-link / hard refresh) before checking the isAdmin flag.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;

  const profileStore = useProfileStore();
  if (!profileStore.isLoaded) {
    await profileStore.loadProfile();
  }

  if (!profileStore.isAdmin) {
    return navigateTo('/dashboard');
  }
});
