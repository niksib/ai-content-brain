<template>
  <div class="workspace-panel">
    <div class="workspace-panel__header">
      <h2 class="workspace-panel__title">Ideas</h2>
      <span v-if="ideas.length" class="workspace-panel__count">{{ ideas.length }}</span>
    </div>

    <div class="workspace-panel__content">
      <!-- Idea detail view -->
      <div v-if="store.selectedIdeaId" class="workspace-panel__detail">
        <IdeaPage
          :idea-id="store.selectedIdeaId"
          @back="store.selectedIdeaId = null"
          @approve="handleApprove"
          @reject="handleReject"
        />
      </div>

      <!-- Ideas list -->
      <div v-else-if="ideas.length" class="workspace-panel__list">
        <IdeaCard
          v-for="idea in ideas"
          :key="idea.id"
          :idea="idea"
          :is-updating="store.updatingIdeaIds.has(idea.id)"
          :is-updated="store.recentlyUpdatedIdeaIds.has(idea.id)"
          @select="store.selectedIdeaId = $event"
          @approve="handleApprove"
          @reject="handleReject"
          @seen="store.clearUpdatedIdea($event)"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="workspace-panel__empty">
        <p class="workspace-panel__empty-text">
          Ideas will appear here as the agent analyzes your dump
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionIdea } from '~/stores/session';
import { useSessionStore } from '~/stores/session';
import IdeaCard from '~/components/IdeaCard.vue';
import IdeaPage from '~/components/IdeaPage.vue';

defineProps<{
  ideas: SessionIdea[];
}>();

const emit = defineEmits<{
  approve: [ideaId: string];
  reject: [ideaId: string];
}>();

const store = useSessionStore();

function handleApprove(ideaId: string) {
  emit('approve', ideaId);
}

function handleReject(ideaId: string) {
  emit('reject', ideaId);
}
</script>

<style scoped>
.workspace-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafafa;
  overflow: hidden;
}

.workspace-panel__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.workspace-panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.workspace-panel__count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

.workspace-panel__content {
  flex: 1;
  overflow-y: auto;
}

.workspace-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.workspace-panel__detail {
  height: 100%;
}

.workspace-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.workspace-panel__empty-text {
  font-size: 0.9375rem;
  color: #9ca3af;
  text-align: center;
  line-height: 1.5;
  margin: 0;
}
</style>
