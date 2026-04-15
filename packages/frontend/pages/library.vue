<template>
  <div class="pub-page">
    <div v-if="store.isLoading" class="pub-page__loading">Loading...</div>

    <template v-else>
      <!-- Backlog: ready to publish -->
      <section v-if="backlogItems.length > 0" class="pub-backlog">
        <div class="pub-backlog__header">
          <h2 class="pub-section-title">Ready to publish</h2>
          <span class="pub-section-count">{{ backlogItems.length }}</span>
        </div>
        <div class="pub-backlog__scroll">
          <LibraryBacklogCard
            v-for="item in backlogItems"
            :key="item.id"
            :item="item"
            @open="navigateToIdea(item)"
            @published="onPublished"
            @scheduled="onScheduled"
          />
        </div>
      </section>

      <!-- Calendar -->
      <PublishingCalendar
        :items="calendarItems"
        :current-month="currentMonth"
        :current-year="currentYear"
        @navigate="navigateToIdea"
        @update:month="onMonthChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLibraryStore, type LibraryItem } from '~/stores/library';
import LibraryBacklogCard from '~/components/LibraryBacklogCard.vue';
import PublishingCalendar from '~/components/PublishingCalendar.vue';

definePageMeta({ layout: 'default' });

const store = useLibraryStore();
const router = useRouter();

const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());

const calendarItems = computed(() =>
  store.items.filter((item) =>
    item.contentIdea.publishStatus === 'scheduled' || item.contentIdea.publishStatus === 'posted',
  ),
);

const backlogItems = computed(() =>
  store.items.filter((item) => !item.contentIdea.publishStatus),
);

function onMonthChange(year: number, month: number): void {
  currentYear.value = year;
  currentMonth.value = month;
}

function navigateToIdea(item: LibraryItem): void {
  const sessionId = item.contentIdea.contentPlan?.chatSessionId;
  if (sessionId) {
    router.push(`/sessions/${sessionId}?idea=${item.contentIdeaId}`);
  }
}

function onPublished(contentIdeaId: string, threadsPostId: string): void {
  store.markPublished(contentIdeaId, threadsPostId);
}

function onScheduled(contentIdeaId: string, scheduledAt: string): void {
  store.markScheduled(contentIdeaId, scheduledAt);
}

onMounted(() => store.loadLibrary());
</script>

<style scoped>
.pub-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.pub-page__loading {
  color: #9ca3af;
  font-size: 0.9375rem;
  padding: 3rem;
  text-align: center;
}

.pub-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pub-section-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

.pub-backlog__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.875rem;
}

.pub-backlog__scroll {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-width: thin;
}

.pub-backlog__scroll::-webkit-scrollbar {
  height: 4px;
}

.pub-backlog__scroll::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 2px;
}

.pub-backlog__scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}
</style>
