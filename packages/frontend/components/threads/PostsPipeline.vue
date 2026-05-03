<template>
  <section class="posts-pipeline">
    <div class="posts-pipeline__header">
      <h3 class="posts-pipeline__title">In progress</h3>
      <span class="posts-pipeline__count" v-if="!isLoading && hasAnyIdeas">{{ totalCount }}</span>
    </div>

    <div v-if="isLoading" class="posts-pipeline__skeleton">
      <div v-for="n in 3" :key="n" class="pipeline-idea-card pipeline-idea-card--skeleton" />
    </div>

    <div v-else-if="!hasAnyIdeas" class="posts-pipeline__empty">
      <Sparkles :size="20" class="posts-pipeline__empty-icon" />
      <p class="posts-pipeline__empty-title">Nothing in progress yet</p>
      <p class="posts-pipeline__empty-desc">Tell the AI what's on your mind, your ideas will land here</p>
    </div>

    <div v-else ref="carouselEl" class="posts-pipeline__carousel">
      <button
        v-for="idea in allIdeas"
        :key="idea.id"
        type="button"
        class="pipeline-idea-card"
        :class="`pipeline-idea-card--${idea.status}`"
        @click="navigate(idea)"
      >
        <div class="pipeline-idea-card__top">
          <div class="pipeline-idea-card__badges">
            <span class="pipeline-idea-card__platform">
              <PlatformIcon :platform="(idea.platform as any)" :size="12" />
            </span>
            <span class="pipeline-idea-card__format">{{ formatLabel(idea.format) }}</span>
          </div>
          <span class="pipeline-idea-card__status" :class="`pipeline-idea-card__status--${idea.status}`">
            {{ idea.status === 'proposed' ? 'Review' : 'Ready' }}
          </span>
        </div>
        <p class="pipeline-idea-card__title">{{ ideaTitle(idea) }}</p>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import PlatformIcon from '~/components/PlatformIcon.vue';

interface PipelineIdea {
  id: string;
  title: string | null;
  angle: string;
  platform: string;
  format: string;
  status: 'proposed' | 'completed';
  publishStatus: string | null;
  createdAt: string;
  contentPlan: { chatSessionId: string } | null;
}

interface PipelineIdeasResponse {
  toReview: PipelineIdea[];
  readyToPublish: PipelineIdea[];
}

const router = useRouter();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

const toReview = ref<PipelineIdea[]>([]);
const readyToPublish = ref<PipelineIdea[]>([]);
const isLoading = ref(true);
const carouselEl = ref<HTMLElement | null>(null);

const allIdeas = computed<PipelineIdea[]>(() => [...toReview.value, ...readyToPublish.value]);
const totalCount = computed(() => allIdeas.value.length);
const hasAnyIdeas = computed(() => totalCount.value > 0);

const FORMAT_LABELS: Record<string, string> = {
  text_post: 'Post',
  text_with_image: 'Post+img',
  image_series: 'Images',
  video_script: 'Video',
  carousel: 'Carousel',
  stories: 'Story',
};

const ANGLE_LABELS: Record<string, string> = {
  hot_take: 'Hot Take',
  reframe: 'Reframe',
  specific_story: 'Story',
  list_of_specifics: 'List',
  numbers: 'Numbers',
  observation: 'Observation',
  curiosity_gap: 'Curiosity Gap',
  identity_snapshot: 'Identity',
  comparison_frame: 'Comparison',
  question_to_audience: 'Question',
};

function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format;
}

function ideaTitle(idea: PipelineIdea): string {
  const t = (idea.title ?? '').trim();
  if (t) return t;
  return ANGLE_LABELS[idea.angle] ?? idea.angle;
}

function navigate(idea: PipelineIdea): void {
  const sessionId = idea.contentPlan?.chatSessionId;
  if (sessionId) {
    router.push(`/sessions/${sessionId}?idea=${idea.id}`);
  }
}

async function load(): Promise<void> {
  try {
    const response = await $fetch<PipelineIdeasResponse>(
      `${apiBaseUrl}/api/threads/pipeline-ideas`,
      { credentials: 'include' },
    );
    toReview.value = response.toReview;
    readyToPublish.value = response.readyToPublish;
  } catch {
    toReview.value = [];
    readyToPublish.value = [];
  } finally {
    isLoading.value = false;
  }
}

defineExpose({ reload: load });

onMounted(load);
</script>

<style scoped>
.posts-pipeline {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.posts-pipeline__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.posts-pipeline__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
}

.posts-pipeline__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: rgba(53, 37, 205, 0.09);
  color: #3525cd;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.posts-pipeline__carousel {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  /* Vertical padding so card hover-shadow + translateY isn't clipped by the
     overflow-x scroll context (which forces overflow-y to be non-visible). */
  padding: 0.5rem 0.25rem 0.875rem;
  margin: -0.5rem -0.25rem -0.875rem;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.posts-pipeline__carousel::-webkit-scrollbar {
  height: 3px;
}

.posts-pipeline__carousel::-webkit-scrollbar-track {
  background: transparent;
}

.posts-pipeline__carousel::-webkit-scrollbar-thumb {
  background: #c7c4d8;
  border-radius: 10px;
}

.posts-pipeline__skeleton {
  display: flex;
  gap: 0.75rem;
  overflow: hidden;
}

.posts-pipeline__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 2rem 1.5rem;
  background: #ffffff;
  border: 1.5px dashed #e5e7eb;
  border-radius: 16px;
  text-align: center;
}

.posts-pipeline__empty-icon {
  color: #c7c4d8;
  margin-bottom: 0.25rem;
}

.posts-pipeline__empty-title {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #464555;
  margin: 0;
}

.posts-pipeline__empty-desc {
  font-size: 0.8125rem;
  color: #9ca3af;
  margin: 0;
}

/* ── Idea card ── */
.pipeline-idea-card {
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #ffffff;
  border: 1.5px solid #f1f1f1;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(25, 28, 30, 0.05);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  scroll-snap-align: start;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.pipeline-idea-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(25, 28, 30, 0.1);
}

.pipeline-idea-card:active {
  transform: scale(0.98);
}

.pipeline-idea-card--skeleton {
  flex: 0 0 220px;
  height: 100px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 16px;
  border: none;
  cursor: default;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.pipeline-idea-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
}

.pipeline-idea-card__badges {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.pipeline-idea-card__platform {
  display: flex;
  align-items: center;
  color: #6b7280;
}

.pipeline-idea-card__format {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
}

.pipeline-idea-card__status {
  font-size: 0.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.pipeline-idea-card__status--proposed {
  background: rgba(234, 179, 8, 0.12);
  color: #92400e;
}

.pipeline-idea-card__status--completed {
  background: rgba(0, 106, 97, 0.09);
  color: #065f46;
}

.pipeline-idea-card__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #191c1e;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
