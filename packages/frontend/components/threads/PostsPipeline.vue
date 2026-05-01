<template>
  <section class="posts-pipeline" :class="{ 'posts-pipeline--loading': isLoading }">
    <button
      type="button"
      class="pipeline-card pipeline-card--ideas"
      :disabled="!counts || counts.ideasToReview === 0"
      @click="$emit('open-ideas')"
    >
      <div class="pipeline-card__icon-wrap pipeline-card__icon-wrap--indigo">
        <Lightbulb :size="22" />
      </div>
      <div class="pipeline-card__body">
        <span class="pipeline-card__label">Ideas to review</span>
        <span class="pipeline-card__count">
          {{ isLoading ? '–' : counts?.ideasToReview ?? 0 }}
        </span>
        <span class="pipeline-card__hint">Approve or reject pending ideas</span>
      </div>
      <ChevronRight v-if="counts && counts.ideasToReview > 0" :size="18" class="pipeline-card__chevron" />
    </button>

    <button
      type="button"
      class="pipeline-card pipeline-card--ready"
      :disabled="!counts || counts.readyToPublish === 0"
      @click="$emit('open-ready')"
    >
      <div class="pipeline-card__icon-wrap pipeline-card__icon-wrap--teal">
        <Send :size="22" />
      </div>
      <div class="pipeline-card__body">
        <span class="pipeline-card__label">Ready to publish</span>
        <span class="pipeline-card__count">
          {{ isLoading ? '–' : counts?.readyToPublish ?? 0 }}
        </span>
        <span class="pipeline-card__hint">Drafts waiting to be scheduled</span>
      </div>
      <ChevronRight v-if="counts && counts.readyToPublish > 0" :size="18" class="pipeline-card__chevron" />
    </button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Lightbulb, Send, ChevronRight } from 'lucide-vue-next';

interface PipelineCounts {
  ideasToReview: number;
  readyToPublish: number;
}

defineEmits<{
  (event: 'open-ideas'): void;
  (event: 'open-ready'): void;
}>();

const counts = ref<PipelineCounts | null>(null);
const isLoading = ref(true);

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

async function load(): Promise<void> {
  try {
    const response = await $fetch<PipelineCounts>(
      `${apiBaseUrl}/api/threads/pipeline-counts`,
      { credentials: 'include' }
    );
    counts.value = response;
  } catch (caughtError) {
    console.error('[PostsPipeline] load failed', caughtError);
    counts.value = { ideasToReview: 0, readyToPublish: 0 };
  } finally {
    isLoading.value = false;
  }
}

defineExpose({ reload: load });

onMounted(load);
</script>

<style scoped>
.posts-pipeline {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .posts-pipeline { grid-template-columns: 1fr; }
}

.pipeline-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: #ffffff;
  border: 1px solid #f1f1f1;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.05);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.15s, box-shadow 0.15s;
}

.pipeline-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(25, 28, 30, 0.1);
}

.pipeline-card:disabled {
  cursor: default;
  opacity: 0.7;
}

.pipeline-card__icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pipeline-card__icon-wrap--indigo {
  background: rgba(53, 37, 205, 0.08);
  color: #3525cd;
}

.pipeline-card__icon-wrap--teal {
  background: rgba(0, 106, 97, 0.08);
  color: #006a61;
}

.pipeline-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pipeline-card__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}

.pipeline-card__count {
  font-family: 'Manrope', sans-serif;
  font-size: 1.875rem;
  font-weight: 800;
  color: #111827;
  line-height: 1;
}

.pipeline-card__hint {
  font-size: 0.8125rem;
  color: #6b7280;
}

.pipeline-card__chevron {
  color: #9ca3af;
  flex-shrink: 0;
}
</style>
