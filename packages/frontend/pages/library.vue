<template>
  <div class="library-page">
    <h1 class="library-page__title">Content Library</h1>

    <!-- Filter bar -->
    <div class="library-page__filters">
      <select
        :value="store.filters.platform"
        class="library-page__select"
        @change="store.setFilter('platform', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">All Platforms</option>
        <option value="threads">Threads</option>
        <option value="linkedin">LinkedIn</option>
        <option value="tiktok">TikTok</option>
        <option value="instagram">Instagram</option>
      </select>

      <select
        :value="store.filters.format"
        class="library-page__select"
        @change="store.setFilter('format', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">All Formats</option>
        <option value="text_post">Text Post</option>
        <option value="video_script">Video Script</option>
        <option value="carousel">Carousel</option>
        <option value="stories">Stories</option>
      </select>
    </div>

    <!-- Loading state -->
    <div v-if="store.isLoading" class="library-page__loading">
      <p>Loading content...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="store.items.length === 0" class="library-page__empty">
      <p>No content produced yet</p>
    </div>

    <!-- Content grid -->
    <div v-else class="library-page__grid">
      <ContentCard
        v-for="item in store.items"
        :key="item.id"
        :item="item"
        @select="handleSelect"
      />
    </div>

    <!-- Pagination -->
    <div v-if="store.totalPages > 1" class="library-page__pagination">
      <button
        :disabled="!store.hasPrevPage"
        class="library-page__page-btn"
        @click="store.prevPage()"
      >
        Previous
      </button>
      <span class="library-page__page-info">
        Page {{ store.page }} of {{ store.totalPages }}
      </span>
      <button
        :disabled="!store.hasNextPage"
        class="library-page__page-btn"
        @click="store.nextPage()"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useLibraryStore } from '~/stores/library';

definePageMeta({
  layout: 'default',
});

const store = useLibraryStore();
const router = useRouter();

onMounted(() => {
  store.loadLibrary();
});

function handleSelect(contentId: string) {
  const item = store.items.find((contentItem) => contentItem.id === contentId);
  if (item) {
    router.push(`/sessions?idea=${item.contentIdeaId}`);
  }
}
</script>

<style scoped>
.library-page {
  max-width: 960px;
  margin: 0 auto;
}

.library-page__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1.5rem;
}

.library-page__filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.library-page__select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  background: white;
  cursor: pointer;
  min-width: 140px;
}

.library-page__select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.library-page__loading,
.library-page__empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
  font-size: 0.9375rem;
}

.library-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.library-page__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.library-page__page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.library-page__page-btn:hover:not(:disabled) {
  border-color: #6366f1;
  color: #6366f1;
}

.library-page__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.library-page__page-info {
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
