<template>
  <div class="pub-page">
    <div v-if="store.isLoading" class="pub-page__loading">Loading...</div>

    <PublishingCalendar
      v-else
      :items="store.items"
      :standalone-posts="standalonePosts"
      :current-month="currentMonth"
      :current-year="currentYear"
      @navigate="navigateToIdea"
      @navigate-session="navigateToSession"
      @navigate-standalone="openEdit"
      @schedule="openScheduler"
      @update:month="onMonthChange"
    />

    <SchedulePostModal
      :open="schedulerOpen"
      :edit="editingData"
      @close="onSchedulerClose"
      @scheduled="onScheduled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLibraryStore, type LibraryItem } from '~/stores/library';
import PublishingCalendar, {
  type StandalonePost,
  type StandalonePostThreadEntry,
} from '~/components/PublishingCalendar.vue';
import SchedulePostModal, { type SchedulePostEditData } from '~/components/SchedulePostModal.vue';

definePageMeta({ layout: 'default', ssr: false });

useHead({ title: 'Content Calendar — HeyPostrr' });

const store = useLibraryStore();
const router = useRouter();
const config = useRuntimeConfig();

const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());
const schedulerOpen = ref(false);
const editingData = ref<SchedulePostEditData | null>(null);
const standalonePosts = ref<StandalonePost[]>([]);

interface PostDto {
  id: string;
  contentIdeaId: string | null;
  text: string | null;
  posts: unknown;
  mediaItems: unknown;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  updatedAt: string;
}

function normalizeMediaItems(raw: unknown): Array<{ mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string }> {
  if (!Array.isArray(raw)) return [];
  const items: Array<{ mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as { mediaType?: unknown; mediaUrl?: unknown };
    if ((candidate.mediaType === 'IMAGE' || candidate.mediaType === 'VIDEO') && typeof candidate.mediaUrl === 'string') {
      items.push({ mediaType: candidate.mediaType, mediaUrl: candidate.mediaUrl });
    }
  }
  return items;
}

function normalizeThreadEntries(raw: unknown): StandalonePostThreadEntry[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry) => {
    if (typeof entry === 'string') return { text: entry, mediaItems: [] };
    const candidate = entry as { text?: unknown; mediaItems?: unknown };
    return {
      text: typeof candidate.text === 'string' ? candidate.text : '',
      mediaItems: normalizeMediaItems(candidate.mediaItems),
    };
  });
}

async function loadStandalonePosts(): Promise<void> {
  try {
    const response = await $fetch<{ posts: PostDto[] }>(
      `${config.public.apiBaseUrl}/api/threads/scheduled?status=all`,
      { credentials: 'include' },
    );
    standalonePosts.value = response.posts
      .filter((post) => !post.contentIdeaId)
      .map((post) => {
        const threadEntries = normalizeThreadEntries(post.posts);
        return {
          id: post.id,
          platform: 'threads',
          status: mapPostStatus(post.status),
          text: post.text ?? '',
          isThread: threadEntries !== null && threadEntries.length > 1,
          mediaItems: normalizeMediaItems(post.mediaItems),
          posts: threadEntries,
          scheduledAt: post.scheduledAt ?? '',
          publishedAt: post.publishedAt ?? (post.status === 'published' ? post.updatedAt : null),
        };
      });
  } catch {
    standalonePosts.value = [];
  }
}

function mapPostStatus(status: PostDto['status']): 'pending' | 'publishing' | 'published' | 'failed' {
  if (status === 'scheduled') return 'pending';
  if (status === 'draft') return 'pending';
  return status;
}

function onMonthChange(year: number, month: number): void {
  currentYear.value = year;
  currentMonth.value = month;
}

function navigateToIdea(item: LibraryItem): void {
  const sessionId = item.contentPlan?.chatSessionId;
  if (sessionId) {
    router.push(`/sessions/${sessionId}?idea=${item.id}`);
  }
}

function navigateToSession(sessionId: string): void {
  router.push(`/sessions/${sessionId}`);
}

function openScheduler(): void {
  editingData.value = null;
  schedulerOpen.value = true;
}

function openEdit(post: StandalonePost): void {
  if (post.status !== 'pending') return;
  const modalPosts = post.isThread && post.posts
    ? post.posts.map((entry) => ({
        text: entry.text,
        mediaItems: entry.mediaItems.slice(),
      }))
    : [{
        text: post.text,
        mediaItems: post.mediaItems.slice(),
      }];

  editingData.value = {
    id: post.id,
    platform: 'threads',
    scheduledAt: post.scheduledAt,
    text: post.text,
    isThread: post.isThread,
    posts: modalPosts,
  };
  schedulerOpen.value = true;
}

function onSchedulerClose(): void {
  schedulerOpen.value = false;
  editingData.value = null;
}

async function onScheduled(): Promise<void> {
  editingData.value = null;
  await Promise.all([store.loadLibrary(), loadStandalonePosts()]);
}

onMounted(async () => {
  await Promise.all([store.loadLibrary(), loadStandalonePosts()]);
});
</script>

<style scoped>
.pub-page {
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
}

@media (max-width: 899px) {
  .pub-page { padding: 1rem 0.75rem 3rem; }
}

.pub-page__loading {
  color: #9ca3af;
  font-size: 0.9375rem;
  padding: 3rem;
  text-align: center;
}
</style>
