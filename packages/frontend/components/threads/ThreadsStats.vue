<template>
  <div class="threads-stats">
    <div v-if="isLoading" class="threads-stats__loading">Loading stats...</div>

    <div v-else-if="error" class="threads-stats__error">{{ error }}</div>

    <div v-else-if="insights" class="threads-stats__grid">
      <div class="threads-stats__card">
        <span class="threads-stats__value">{{ insights.followersCount.toLocaleString() }}</span>
        <span class="threads-stats__label">Followers</span>
      </div>
      <div class="threads-stats__card">
        <span class="threads-stats__value">{{ insights.postsCount.toLocaleString() }}</span>
        <span class="threads-stats__label">Posts</span>
      </div>
      <div class="threads-stats__card">
        <span class="threads-stats__value">{{ insights.engagementRate.toFixed(2) }}%</span>
        <span class="threads-stats__label">Eng. Rate</span>
      </div>
      <div class="threads-stats__card">
        <span class="threads-stats__value">{{ insights.likes.toLocaleString() }}</span>
        <span class="threads-stats__label">Likes (30d)</span>
      </div>
      <div class="threads-stats__card">
        <span class="threads-stats__value">{{ insights.replies.toLocaleString() }}</span>
        <span class="threads-stats__label">Replies (30d)</span>
      </div>
      <div class="threads-stats__card">
        <span class="threads-stats__value">{{ (insights.reposts + insights.quotes).toLocaleString() }}</span>
        <span class="threads-stats__label">Reposts+Quotes (30d)</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface InsightsResponse {
  followersCount: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views: number;
  engagementRate: number;
  postsCount: number;
  period: { since: string; until: string };
}

const isLoading = ref(true);
const error = ref('');
const insights = ref<InsightsResponse | null>(null);

onMounted(async () => {
  try {
    const config = useRuntimeConfig();
    const response = await $fetch<{ insights: InsightsResponse }>(
      `${config.public.apiBaseUrl}/api/threads/insights`
    );
    insights.value = response.insights;
  } catch {
    error.value = 'Could not load Threads stats.';
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.threads-stats__loading,
.threads-stats__error {
  font-size: 0.875rem;
  color: #6b7280;
}

.threads-stats__error {
  color: #ef4444;
}

.threads-stats__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.threads-stats__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.threads-stats__value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.threads-stats__label {
  font-size: 0.6875rem;
  color: #6b7280;
  margin-top: 0.125rem;
  text-align: center;
}
</style>
