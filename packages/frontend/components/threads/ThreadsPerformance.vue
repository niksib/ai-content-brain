<template>
  <section class="card threads-performance">
    <header class="threads-performance__header">
      <div>
        <p class="threads-performance__eyebrow">Analytics</p>
        <h3 class="threads-performance__title">Threads Performance</h3>
      </div>
      <div class="threads-performance__controls">
        <span
          v-if="isReloading && !isRefreshing"
          class="threads-performance__reload-indicator"
          aria-hidden="true"
        >
          <span class="threads-performance__spinner"></span>
        </span>

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

    <div v-if="isInitialLoad" class="threads-performance__state">
      <span class="threads-performance__spinner"></span>
      <span>Loading performance data</span>
    </div>

    <div v-else-if="loadError && !snapshot" class="threads-performance__state threads-performance__state--error">
      {{ loadError }}
    </div>

    <!-- Keep the body mounted during period reloads so the layout doesn't
         collapse and jump. isReloading dims the body and the header shows a
         spinner; stale data stays visible until the new fetch resolves. -->
    <div
      v-else-if="snapshot"
      class="threads-performance__body"
      :class="{ 'threads-performance__body--reloading': isReloading }"
      :aria-busy="isReloading"
    >
      <p v-if="loadError" class="threads-performance__hint threads-performance__hint--warn">
        {{ loadError }} Showing previous data.
      </p>
      <p v-else-if="!previousAvailable" class="threads-performance__hint">
        Building your baseline. Daily comparisons appear once a previous snapshot is recorded.
      </p>
      <p v-else-if="snapshot.partial" class="threads-performance__hint threads-performance__hint--warn">
        Last snapshot was partial. Numbers may be outdated until the next nightly refresh.
      </p>

      <div class="kpi-grid">
        <article class="kpi">
          <span class="kpi__label">Followers</span>
          <span class="kpi__value">{{ formatNumber(snapshot.followersCount) }}</span>
          <span class="kpi__hint">Lifetime</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.followers"
            :percent="percentChange(snapshot.followersCount, delta.followers)"
          />
        </article>

        <article class="kpi">
          <span class="kpi__label">Likes</span>
          <span class="kpi__value">{{ formatNumber(snapshot.likesTotal) }}</span>
          <span class="kpi__hint">Lifetime</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.likes"
            :percent="percentChange(snapshot.likesTotal, delta.likes)"
          />
        </article>

        <article class="kpi">
          <span class="kpi__label">Views</span>
          <span class="kpi__value">{{ formatNumber(snapshot.viewsTotal) }}</span>
          <span class="kpi__hint">Lifetime</span>
          <DeltaBadge
            v-if="delta"
            :value="delta.views"
            :percent="percentChange(snapshot.viewsTotal, delta.views)"
          />
        </article>

        <article class="kpi">
          <span class="kpi__label">Replies</span>
          <span class="kpi__value">{{ formatNumber(snapshot.repliesTotal) }}</span>
          <span class="kpi__hint">Lifetime</span>
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
                  <li><span>{{ formatNumber(post.metrics.replies) }}</span> {{ post.metrics.replies === 1 ? 'comment' : 'comments' }}</li>
                  <li><span>{{ formatNumber(post.metrics.reposts + post.metrics.quotes) }}</span> reposts</li>
                </ul>
              </div>
            </li>
          </ol>
          <p v-else class="lower-grid__empty">
            No posts published in this period yet.
          </p>
        </section>

        <section class="streak-card" :class="`streak-card--${streakTier}`">
          <Flame :size="120" class="streak-card__flame-bg" :stroke-width="1.2" />
          <header class="streak-card__head">
            <span class="streak-card__eyebrow">Posting streak</span>
            <Flame :size="22" class="streak-card__flame-icon" />
          </header>
          <div class="streak-card__body">
            <span class="streak-card__value">{{ streak }}</span>
            <span class="streak-card__unit">{{ streak === 1 ? 'day' : 'days' }}</span>
          </div>
          <p class="streak-card__hype">{{ streakHeadline }}</p>
          <p class="streak-card__caption">{{ streakSubline }}</p>
        </section>
      </div>
    </div>

    <div v-else class="threads-performance__state">
      <p>No snapshot yet. We will capture your first one shortly after connecting Threads.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { Flame } from 'lucide-vue-next';
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

// Streak tier drives both the visual treatment (color, glow) and the copy.
// Tier names mirror temperature: cold (no streak) -> spark -> warm -> hot ->
// blazing -> legendary. Boundaries chosen to celebrate common milestones
// (week, two weeks, month, hundred).
type StreakTier = 'cold' | 'spark' | 'warm' | 'hot' | 'blazing' | 'legendary';
const streakTier = computed<StreakTier>(() => {
  const days = streak.value;
  if (days === 0) return 'cold';
  if (days < 3) return 'spark';
  if (days < 7) return 'warm';
  if (days < 14) return 'hot';
  if (days < 30) return 'blazing';
  return 'legendary';
});

const streakHeadline = computed<string>(() => {
  const days = streak.value;
  if (days === 0) return "Light it up.";
  if (days === 1) return "First spark!";
  if (days < 7) return "You're heating up!";
  if (days < 14) return "On fire!";
  if (days === 14) return "Two weeks unstoppable!";
  if (days < 30) return "Absolutely blazing!";
  if (days === 30) return "30 days. Legend status.";
  if (days < 100) return "Pure dedication.";
  if (days === 100) return "100 days. Iconic.";
  return "Untouchable streak.";
});

const streakSubline = computed<string>(() => {
  const days = streak.value;
  if (days === 0) return "Post today to start your streak.";
  if (todayPosted.value) {
    if (days < 7) return "Today is locked in. Same time tomorrow?";
    if (days < 30) return `${days} days strong. Stay relentless.`;
    return "Today's done. You're built different.";
  }
  return `Post today to make it ${days + 1} days.`;
});

// Separate the very first fetch (no data yet — show full loading state) from
// subsequent reloads triggered by period changes or admin refresh (keep KPI
// grid mounted with stale data so the layout doesn't collapse).
const isInitialLoad = ref(true);
const isReloading = ref(false);
const isRefreshing = ref(false);
const loadError = ref('');

const profileStore = useProfileStore();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

// Monotonic request id so rapid period switches don't leave stale callbacks
// flipping flags or overwriting newer data.
let loadRequestId = 0;

async function loadAll(): Promise<void> {
  const requestId = ++loadRequestId;
  if (snapshot.value === null) {
    isInitialLoad.value = true;
  } else {
    isReloading.value = true;
  }
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

    if (requestId !== loadRequestId) return;
    snapshot.value = timelineResponse.snapshot;
    delta.value = timelineResponse.delta;
    previousAvailable.value = timelineResponse.previousAvailable;
    topPosts.value = topPostsResponse.posts;
    streak.value = streakResponse.streak;
    todayPosted.value = streakResponse.todayPosted;
  } catch (caughtError) {
    if (requestId !== loadRequestId) return;
    console.error('[ThreadsPerformance] load failed', caughtError);
    loadError.value = 'Could not load performance data. Try again in a moment.';
  } finally {
    if (requestId === loadRequestId) {
      isInitialLoad.value = false;
      isReloading.value = false;
    }
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

.threads-performance__body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  transition: opacity 0.18s ease;
}

.threads-performance__body--reloading {
  opacity: 0.55;
  pointer-events: none;
}

.threads-performance__reload-indicator {
  display: inline-flex;
  align-items: center;
  margin-right: 0.25rem;
}

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

.kpi__hint {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-top: -0.125rem;
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

/* ─── Streak ─── */
.streak-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 1.125rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  color: #fff;
  isolation: isolate;
  transition: transform 0.2s, box-shadow 0.2s;
}

.streak-card:hover {
  transform: translateY(-1px);
}

/* Tiers — gradient + glow ramp from cool to legendary */
.streak-card--cold {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
  box-shadow: 0 8px 24px rgba(107, 114, 128, 0.18);
  color: #fff;
}
.streak-card--spark {
  background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
  box-shadow: 0 10px 28px rgba(251, 146, 60, 0.3);
}
.streak-card--warm {
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  box-shadow: 0 12px 30px rgba(249, 115, 22, 0.35);
}
.streak-card--hot {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
  box-shadow: 0 14px 32px rgba(239, 68, 68, 0.4);
}
.streak-card--blazing {
  background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%);
  box-shadow: 0 16px 36px rgba(234, 88, 12, 0.45);
}
.streak-card--legendary {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 30%, #f97316 70%, #dc2626 100%);
  box-shadow: 0 18px 40px rgba(245, 158, 11, 0.5);
}

/* Big background flame */
.streak-card__flame-bg {
  position: absolute;
  right: -28px;
  bottom: -28px;
  color: rgba(255, 255, 255, 0.16);
  pointer-events: none;
  z-index: 0;
  transition: transform 0.4s ease, color 0.3s;
}
.streak-card:hover .streak-card__flame-bg {
  transform: scale(1.08) rotate(-4deg);
  color: rgba(255, 255, 255, 0.22);
}
.streak-card--cold .streak-card__flame-bg {
  color: rgba(255, 255, 255, 0.1);
}
.streak-card--legendary .streak-card__flame-bg {
  color: rgba(255, 255, 255, 0.22);
  animation: streak-flicker 2.5s ease-in-out infinite;
}

@keyframes streak-flicker {
  0%, 100% { transform: scale(1) rotate(0); opacity: 1; }
  50% { transform: scale(1.04) rotate(-2deg); opacity: 0.85; }
}

.streak-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.streak-card__eyebrow {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.85);
}

.streak-card__flame-icon {
  color: rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.15));
}

.streak-card--cold .streak-card__flame-icon {
  color: rgba(255, 255, 255, 0.6);
}

.streak-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.streak-card__value {
  font-family: 'Manrope', sans-serif;
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.streak-card__unit {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.streak-card__hype {
  position: relative;
  z-index: 1;
  margin: 0.375rem 0 0;
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
}

.streak-card__caption {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}
</style>
