<template>
  <div class="pub-page">
    <div v-if="store.isLoading" class="pub-page__loading">Loading...</div>

    <PublishingCalendar
      v-else
      :items="store.items"
      :current-month="currentMonth"
      :current-year="currentYear"
      @navigate="navigateToIdea"
      @update:month="onMonthChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLibraryStore, type LibraryItem } from '~/stores/library';
import PublishingCalendar from '~/components/PublishingCalendar.vue';

definePageMeta({ layout: 'default' });

const store = useLibraryStore();
const router = useRouter();

const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());

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

onMounted(() => store.loadLibrary());
</script>

<style scoped>
.pub-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
}

.pub-page__loading {
  color: #9ca3af;
  font-size: 0.9375rem;
  padding: 3rem;
  text-align: center;
}
</style>
