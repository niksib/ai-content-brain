<template>
  <div class="loading-page">
    <p v-if="!authFailed">Loading...</p>
    <div v-else class="login-prompt">
      <h1>Daily Content Brain</h1>
      <p>Please sign in to continue.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useProfileStore } from '~/stores/profile';
import { useApiClient } from '~/services/api';

const router = useRouter();
const profileStore = useProfileStore();
const apiClient = useApiClient();
const authFailed = ref(false);

onMounted(async () => {
  try {
    // Check if user is authenticated by trying to load profile
    await profileStore.loadProfile();

    if (profileStore.profile) {
      // Authenticated with profile -> dashboard
      router.replace('/dashboard');
      return;
    }

    // Profile is null — either not authenticated or no profile yet
    // Try checking onboarding status (will 401 if not authenticated)
    const onboardingStatus = await apiClient.get<{ isComplete: boolean }>(
      '/api/onboarding/status',
    );

    if (onboardingStatus.isComplete) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  } catch {
    // Not authenticated
    authFailed.value = true;
  }
});
</script>

<style scoped>
.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.login-prompt {
  text-align: center;
}

.login-prompt h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.login-prompt p {
  color: #6b7280;
  font-size: 0.9375rem;
}
</style>
