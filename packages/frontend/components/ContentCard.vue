<template>
  <div class="content-card" @click="emit('select', item.id)">
    <div class="content-card__header">
      <span class="content-card__platform">{{ platformEmoji }}</span>
      <span class="content-card__format">{{ formatLabel }}</span>
      <span v-if="item.contentIdea.publishStatus === 'posted'" class="content-card__posted-badge">Posted</span>
      <span v-else-if="item.contentIdea.publishStatus === 'scheduled'" class="content-card__scheduled-badge">Scheduled</span>
      <span class="content-card__date">{{ formattedDate }}</span>
    </div>

    <p class="content-card__angle">{{ item.contentIdea.angle }}</p>

    <p v-if="preview" class="content-card__preview">{{ preview }}</p>

    <!-- Post analytics (only for posted Threads posts) -->
    <div
      v-if="item.contentIdea.publishStatus === 'posted' && item.contentIdea.threadsPostId && item.platform === 'threads'"
      class="content-card__insights"
      @click.stop
    >
      <template v-if="latestSnapshot">
        <span v-if="latestSnapshot.views !== null" class="content-card__metric">
          <span class="material-symbols-outlined" style="font-size:12px;">visibility</span>
          {{ latestSnapshot.views }}
        </span>
        <span v-if="latestSnapshot.likes !== null" class="content-card__metric">
          <span class="material-symbols-outlined" style="font-size:12px;">favorite</span>
          {{ latestSnapshot.likes }}
        </span>
        <span v-if="latestSnapshot.replies !== null" class="content-card__metric">
          <span class="material-symbols-outlined" style="font-size:12px;">chat_bubble</span>
          {{ latestSnapshot.replies }}
        </span>
        <span v-if="latestSnapshot.reposts !== null" class="content-card__metric">
          <span class="material-symbols-outlined" style="font-size:12px;">repeat</span>
          {{ latestSnapshot.reposts }}
        </span>
        <span v-if="latestSnapshot.quotes !== null" class="content-card__metric">
          <span class="material-symbols-outlined" style="font-size:12px;">format_quote</span>
          {{ latestSnapshot.quotes }}
        </span>
        <span v-if="latestSnapshot.shares !== null" class="content-card__metric">
          <span class="material-symbols-outlined" style="font-size:12px;">share</span>
          {{ latestSnapshot.shares }}
        </span>
        <span class="content-card__insights-fetched-at">{{ formattedFetchedAt }}</span>
      </template>
      <template v-else>
        <span class="content-card__insights-empty">No analytics yet</span>
      </template>

      <button
        class="content-card__refresh-btn"
        :disabled="refreshing"
        @click.stop="refreshInsights"
      >
        <span class="material-symbols-outlined" :class="{ 'content-card__refresh-icon--spinning': refreshing }" style="font-size:13px;">refresh</span>
        {{ refreshing ? 'Updating...' : 'Update Insights' }}
      </button>
      <span v-if="refreshError" class="content-card__refresh-error">Failed to update</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LibraryItem, ThreadsInsightsSnapshot } from '~/stores/library';

const props = defineProps<{
  item: LibraryItem;
}>();

const emit = defineEmits<{
  select: [contentId: string];
}>();

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

const refreshing = ref(false);
const refreshError = ref(false);
const localSnapshot = ref<ThreadsInsightsSnapshot | null>(null);

const latestSnapshot = computed<ThreadsInsightsSnapshot | null>(() => {
  if (localSnapshot.value) return localSnapshot.value;
  const snapshots = props.item.contentIdea.insightsSnapshots;
  return snapshots && snapshots.length > 0 ? snapshots[0] : null;
});

const formattedFetchedAt = computed(() => {
  if (!latestSnapshot.value) return '';
  const d = new Date(latestSnapshot.value.fetchedAt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
});

const platformEmojiMap: Record<string, string> = {
  threads: '\uD83E\uDDF5',
  linkedin: '\uD83D\uDCBC',
  tiktok: '\uD83C\uDFAC',
  instagram: '\uD83D\uDCF8',
  twitter: '\uD83D\uDC26',
  youtube: '\u25B6\uFE0F',
};

const formatLabels: Record<string, string> = {
  text_post: 'Text Post',
  video_script: 'Video Script',
  carousel: 'Carousel',
  stories: 'Stories',
};

const platformEmoji = computed(() => {
  const key = props.item.platform.toLowerCase();
  return platformEmojiMap[key] ?? '\uD83D\uDCA1';
});

const formatLabel = computed(() => {
  return formatLabels[props.item.format] ?? props.item.format;
});

const formattedDate = computed(() => {
  const date = new Date(props.item.createdAt);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});

const preview = computed(() => {
  const body = props.item.body;
  let text = '';

  if (typeof body === 'object' && body !== null) {
    if (typeof body.text === 'string') {
      text = body.text;
    } else if (typeof body.caption === 'string') {
      text = body.caption;
    } else if (Array.isArray(body.slides) && body.slides.length > 0) {
      const firstSlide = body.slides[0] as Record<string, unknown>;
      text = (firstSlide?.text as string) ?? '';
    } else if (Array.isArray(body.script) && body.script.length > 0) {
      const firstLine = body.script[0] as Record<string, unknown>;
      text = (firstLine?.text as string) ?? '';
    }
  }

  if (!text) return '';
  return text.length > 80 ? text.slice(0, 80) + '...' : text;
});

async function refreshInsights(): Promise<void> {
  refreshing.value = true;
  refreshError.value = false;
  try {
    const result = await $fetch<{ snapshot: ThreadsInsightsSnapshot }>(
      `${apiBaseUrl}/api/threads/insights/${props.item.contentIdea.id}/refresh`,
      { method: 'POST', credentials: 'include' },
    );
    localSnapshot.value = result.snapshot;
  } catch {
    refreshError.value = true;
  } finally {
    refreshing.value = false;
  }
}
</script>

<style scoped>
.content-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.content-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
}

.content-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.content-card__platform {
  font-size: 1.125rem;
}

.content-card__format {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.content-card__posted-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #065f46;
  background: #d1fae5;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.content-card__scheduled-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #4338ca;
  background: #eef2ff;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.content-card__date {
  margin-left: auto;
  font-size: 0.75rem;
  color: #9ca3af;
}

.content-card__angle {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-card__preview {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-card__insights {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid #f3f4f6;
}

.content-card__insights-empty {
  font-size: 0.75rem;
  color: #9ca3af;
}

.content-card__insights-fetched-at {
  font-size: 0.6875rem;
  color: #d1d5db;
  margin-left: auto;
}

.content-card__metric {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #374151;
  font-weight: 500;
}

.content-card__refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6366f1;
  background: none;
  border: 1px solid #e0e7ff;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  margin-left: auto;
  white-space: nowrap;
}

.content-card__refresh-btn:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.content-card__refresh-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.content-card__refresh-error {
  font-size: 0.6875rem;
  color: #ef4444;
  width: 100%;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-card__refresh-icon--spinning {
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
</style>
