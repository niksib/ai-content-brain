<template>
  <section class="card threads-performance">
    <header class="threads-performance__header">
      <div>
        <p class="threads-performance__eyebrow">Analytics</p>
        <h3 class="threads-performance__title">Threads Performance</h3>
      </div>
      <div class="threads-performance__controls">
        <button
          v-if="profileStore.isAdmin"
          type="button"
          class="refresh-button"
          :disabled="isRefreshing"
          :title="isRefreshing ? 'Refreshing — please wait' : 'Force snapshot refresh (admin)'"
          @click="handleAdminRefresh"
        >
          <span v-if="isRefreshing" class="refresh-button__spinner" aria-hidden="true"></span>
          <span v-else aria-hidden="true">⟳</span>
          <span>{{ isRefreshing ? 'Refreshing' : 'Refresh' }}</span>
        </button>

        <div class="period-switch" role="tablist" aria-label="Select period">
          <button
            v-for="option in periodOptions"
            :key="option.value"
            type="button"
            role="tab"
            :aria-selected="period === option.value"
            class="period-switch__option"
            :class="{ 'period-switch__option--active': period === option.value }"
            @click="setPeriod(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="isLoading" class="threads-performance__state">
      <span class="threads-performance__spinner"></span>
      <span>Loading performance data</span>
    </div>

    <div v-else-if="loadError" class="threads-performance__state threads-performance__state--error">
      {{ loadError }}
    </div>

    <template v-else-if="snapshot">
      <p v-if="!previousAvailable" class="threads-performance__hint">
        Building your baseline. Daily comparisons appear once a previous snapshot is recorded.
      </p>
      <p v-else-if="snapshot.partial" class="threads-performance__hint threads-performance__hint--warn">
        Last snapshot was partial. Numbers may be outdated until the next nightly refresh.
      </p>

      <div class="kpi-grid">
        <article class="kpi">
          <span class="kpi__label">Followers</span>
          <span class="kpi__value">{{ formatNumber(snapshot.followersCount) }}</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.followers"
            :percent="percentChange(snapshot.followersCount, delta.followers)"
          />
        </article>

        <article class="kpi">
          <span class="kpi__label">Likes</span>
          <span class="kpi__value">{{ formatNumber(snapshot.likesTotal) }}</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.likes"
            :percent="percentChange(snapshot.likesTotal, delta.likes)"
          />
        </article>

        <article class="kpi">
          <span class="kpi__label">Views</span>
          <span class="kpi__value">{{ formatNumber(snapshot.viewsTotal) }}</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.views"
            :percent="percentChange(snapshot.viewsTotal, delta.views)"
          />
        </article>

        <article class="kpi">
          <span class="kpi__label">Replies</span>
          <span class="kpi__value">{{ formatNumber(snapshot.repliesTotal) }}</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.replies"
            :percent="percentChange(snapshot.repliesTotal, delta.replies)"
          />
        </article>
      </div>

      <div class="lower-grid">
        <section class="top-posts">
          <header class="lower-grid__header">
            <h4 class="lower-grid__title">Top posts</h4>
            <span class="lower-grid__hint">By views in this period</span>
          </header>
          <ol v-if="topPosts.length > 0" class="top-posts__list">
            <li
              v-for="(post, index) in topPosts"
              :key="post.threadsPostId"
              class="top-post-item"
            >
              <span class="top-post-item__rank">{{ index + 1 }}</span>
              <div class="top-post-item__body">
                <p class="top-post-item__preview">{{ post.preview || '(no text)' }}</p>
                <ul class="top-post-item__metrics">
                  <li><span>{{ formatNumber(post.metrics.views) }}</span> views</li>
                  <li><span>{{ formatNumber(post.metrics.likes) }}</span> likes</li>
                  <li><span>{{ formatNumber(post.metrics.reposts + post.metrics.quotes) }}</span> reposts</li>
                </ul>
              </div>
            </li>
          </ol>
          <p v-else class="lower-grid__empty">
            No posts published in this period yet.
          </p>
        </section>

        <section class="streak-card">
          <header class="lower-grid__header">
            <h4 class="lower-grid__title">Posting streak</h4>
            <span class="lower-grid__hint">Consecutive days with a post</span>
          </header>
          <div class="streak-card__body">
            <span class="streak-card__value">{{ streak }}</span>
            <span class="streak-card__unit">{{ streak === 1 ? 'day' : 'days' }}</span>
          </div>
          <p class="streak-card__caption" :class="{ 'streak-card__caption--alert': streak === 0 }">
            <template v-if="streak === 0">
              No streak yet. Post today to start one.
            </template>
            <template v-else-if="todayPosted">
              You posted today — keep it going.
            </template>
            <template v-else>
              Today is open. Post to extend your streak.
            </template>
          </p>
        </section>
      </div>
    </template>

    <div v-else class="threads-performance__state">
      <p>No snapshot yet. We will capture your first one shortly after connecting Threads.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import DeltaBadge from './DeltaBadge.vue';
import { useProfileStore } from '~/stores/profile';

type Period = 'day' | 'week' | 'month';

interface Snapshot {
  capturedDate: string;
  capturedAt: string;
  followersCount: number;
  likesTotal: number;
  repliesTotal: number;
  repostsTotal: number;
  quotesTotal: number;
  viewsTotal: number;
  clicksTotal: number;
  postsCount: number;
  partial: boolean;
}

interface Delta {
  followers: number;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  clicks: number;
  posts: number;
}

interface TimelineResponse {
  snapshot: Snapshot | null;
  delta: Delta | null;
  previousAvailable: boolean;
  period: { days: number; capturedFrom?: string; capturedTo?: string };
}

interface TopPost {
  threadsPostId: string;
  preview: string;
  publishedAt: string;
  metrics: {
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
  };
  metricsCapturedAt: string;
}

interface TopPostsResponse {
  posts: TopPost[];
  period: { days: number };
}

interface StreakResponse {
  streak: number;
  todayPosted: boolean;
}

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const period = ref<Period>('week');
const snapshot = ref<Snapshot | null>(null);
const delta = ref<Delta | null>(null);
const previousAvailable = ref(false);
const topPosts = ref<TopPost[]>([]);
const streak = ref(0);
const todayPosted = ref(false);

const isLoading = ref(true);
const isRefreshing = ref(false);
const loadError = ref('');

const profileStore = useProfileStore();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

async function loadAll(): Promise<void> {
  isLoading.value = true;
  loadError.value = '';
  try {
    const [timelineResponse, topPostsResponse, streakResponse] = await Promise.all([
      $fetch<TimelineResponse>(
        `${apiBaseUrl}/api/threads/insights/timeline?period=${period.value}`,
        { credentials: 'include' }
      ),
      $fetch<TopPostsResponse>(
        `${apiBaseUrl}/api/threads/insights/top-posts?period=${period.value}&limit=3`,
        { credentials: 'include' }
      ),
      $fetch<StreakResponse>(
        `${apiBaseUrl}/api/threads/insights/streak`,
        { credentials: 'include' }
      ),
    ]);

    snapshot.value = timelineResponse.snapshot;
    delta.value = timelineResponse.delta;
    previousAvailable.value = timelineResponse.previousAvailable;
    topPosts.value = topPostsResponse.posts;
    streak.value = streakResponse.streak;
    todayPosted.value = streakResponse.todayPosted;
  } catch (caughtError) {
    console.error('[ThreadsPerformance] load failed', caughtError);
    loadError.value = 'Could not load performance data. Try again in a moment.';
  } finally {
    isLoading.value = false;
  }
}

function setPeriod(next: Period): void {
  if (period.value === next) return;
  period.value = next;
}

async function handleAdminRefresh(): Promise<void> {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await $fetch(`${apiBaseUrl}/api/threads/insights/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    await loadAll();
  } catch (caughtError) {
    console.error('[ThreadsPerformance] admin refresh failed', caughtError);
    loadError.value = 'Refresh failed. Check the backend logs.';
  } finally {
    isRefreshing.value = false;
  }
}

watch(period, () => {
  void loadAll();
});

onMounted(() => {
  void loadAll();
});

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function percentChange(current: number, deltaValue: number): number | null {
  const previous = current - deltaValue;
  if (previous <= 0) return null;
  return (deltaValue / previous) * 100;
}
</script>

<style scoped>
.threads-performance {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.threads-performance__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.threads-performance__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3525cd;
  margin: 0 0 0.25rem;
}

.threads-performance__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #191c1e;
  margin: 0;
}

.threads-performance__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
  background: rgba(53, 37, 205, 0.06);
  border-radius: 12px;
  padding: 0.625rem 0.875rem;
}

.threads-performance__hint--warn {
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
}

.threads-performance__state {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: #6b7280;
  font-size: 0.875rem;
  padding: 1rem 0;
}

.threads-performance__state--error { color: #b91c1c; }

.threads-performance__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(53, 37, 205, 0.2);
  border-top-color: #3525cd;
  border-radius: 9999px;
  animation: threads-performance-spin 0.8s linear infinite;
}

@keyframes threads-performance-spin {
  to { transform: rotate(360deg); }
}

/* Controls */
.threads-performance__controls {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #4b5563;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.refresh-button:hover:not(:disabled) {
  background: #f9fafb;
  color: #3525cd;
  border-color: #c7d2fe;
}

.refresh-button:disabled { opacity: 0.6; cursor: not-allowed; }

.refresh-button__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(53, 37, 205, 0.2);
  border-top-color: #3525cd;
  border-radius: 9999px;
  animation: threads-performance-spin 0.8s linear infinite;
}

.period-switch {
  display: inline-flex;
  background: #f3f4f6;
  border-radius: 9999px;
  padding: 4px;
  gap: 2px;
}

.period-switch__option {
  border: none;
  background: transparent;
  border-radius: 9999px;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.period-switch__option:hover { color: #191c1e; }

.period-switch__option--active {
  background: #ffffff;
  color: #3525cd;
  box-shadow: 0 2px 6px rgba(25, 28, 30, 0.08);
}

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1rem 1.125rem;
  background: #f9fafb;
  border: 1px solid #eef0f3;
  border-radius: 16px;
}

.kpi__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.kpi__value {
  font-family: 'Manrope', sans-serif;
  font-size: 1.625rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #111827;
  line-height: 1.1;
}

/* Lower grid */
.lower-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

@media (max-width: 900px) {
  .lower-grid { grid-template-columns: 1fr; }
}

.lower-grid__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.625rem;
}

.lower-grid__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.lower-grid__hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.lower-grid__empty {
  margin: 0;
  font-size: 0.8125rem;
  color: #9ca3af;
}

.top-posts {
  background: #f9fafb;
  border: 1px solid #eef0f3;
  border-radius: 16px;
  padding: 1rem 1.125rem;
}

.top-posts__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.top-post-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #f1f1f1;
}

.top-post-item__rank {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: rgba(53, 37, 205, 0.1);
  color: #3525cd;
  font-size: 0.75rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.top-post-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.top-post-item__preview {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.top-post-item__metrics {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.top-post-item__metrics span {
  font-weight: 700;
  color: #111827;
  margin-right: 3px;
}

/* Streak */
.streak-card {
  background: linear-gradient(135deg, rgba(53, 37, 205, 0.08), rgba(0, 106, 97, 0.05));
  border: 1px solid rgba(53, 37, 205, 0.12);
  border-radius: 16px;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.streak-card__body {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.streak-card__value {
  font-family: 'Manrope', sans-serif;
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #3525cd;
  line-height: 1;
}

.streak-card__unit {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.streak-card__caption {
  margin: 0;
  font-size: 0.8125rem;
  color: #4b5563;
}

.streak-card__caption--alert {
  color: #b45309;
  font-weight: 500;
}
</style>
