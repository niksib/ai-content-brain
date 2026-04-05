<template>
  <div class="idea-page">
    <!-- Back button -->
    <button type="button" class="idea-page__back" @click="emit('back')">
      &larr; Back to ideas
    </button>

    <!-- Loading state -->
    <div v-if="isLoading" class="idea-page__loading">
      Loading...
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="idea-page__error">
      {{ loadError }}
    </div>

    <!-- Idea content -->
    <div v-else-if="idea" class="idea-page__content">
      <!-- Title -->
      <h1 class="idea-page__title">{{ idea.angle }}</h1>

      <!-- Meta badges -->
      <div class="idea-page__meta">
        <span class="idea-page__badge idea-page__badge--platform">
          {{ platformEmoji }} {{ idea.platform }}
        </span>
        <span class="idea-page__badge idea-page__badge--format">
          {{ idea.format }}
        </span>
        <span
          class="idea-page__badge"
          :class="`idea-page__badge--${idea.status}`"
        >
          {{ statusLabel }}
        </span>
      </div>

      <!-- Description -->
      <div v-if="idea.description" class="idea-page__section">
        <h2 class="idea-page__section-title">Description</h2>
        <p class="idea-page__description">{{ idea.description }}</p>
      </div>

      <!-- Actions -->
      <div v-if="idea.status === 'proposed'" class="idea-page__actions">
        <button
          type="button"
          class="idea-page__action idea-page__action--approve"
          @click="handleApprove"
        >
          Approve
        </button>
        <button
          type="button"
          class="idea-page__action idea-page__action--reject"
          @click="handleReject"
        >
          Reject
        </button>
      </div>

      <!-- Produced content -->
      <div class="idea-page__section">
        <h2 class="idea-page__section-title">Produced Content</h2>

        <!-- Show produced content when completed -->
        <div v-if="idea.status === 'completed' && idea.producedContent" class="idea-page__produced">
          <pre class="idea-page__produced-content">{{ idea.producedContent }}</pre>
        </div>

        <!-- Producing state -->
        <div v-else-if="idea.status === 'producing'" class="idea-page__placeholder">
          <p class="idea-page__placeholder-text idea-page__placeholder-text--producing">
            Content is being generated...
          </p>
        </div>

        <!-- Placeholder for other states -->
        <div v-else class="idea-page__placeholder">
          <p class="idea-page__placeholder-text">
            Content will appear here after approval
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSessionStore, type SessionIdea } from '~/stores/session';

const props = defineProps<{
  ideaId: string;
}>();

const emit = defineEmits<{
  back: [];
  approve: [ideaId: string];
  reject: [ideaId: string];
}>();

const store = useSessionStore();
const idea = ref<SessionIdea | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const platformEmojiMap: Record<string, string> = {
  threads: '\uD83E\uDDF5',
  linkedin: '\uD83D\uDCBC',
  tiktok: '\uD83C\uDFAC',
  instagram: '\uD83D\uDCF8',
  twitter: '\uD83D\uDC26',
  youtube: '\u25B6\uFE0F',
};

const platformEmoji = computed(() => {
  if (!idea.value) return '';
  const key = idea.value.platform.toLowerCase();
  return platformEmojiMap[key] ?? '\uD83D\uDCA1';
});

const statusLabels: Record<string, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  rejected: 'Rejected',
  producing: 'Producing',
  completed: 'Completed',
};

const statusLabel = computed(() => {
  if (!idea.value) return '';
  return statusLabels[idea.value.status] ?? idea.value.status;
});

function handleApprove() {
  emit('approve', props.ideaId);
  if (idea.value) {
    idea.value.status = 'approved';
  }
}

function handleReject() {
  emit('reject', props.ideaId);
  if (idea.value) {
    idea.value.status = 'rejected';
  }
}

onMounted(async () => {
  isLoading.value = true;
  try {
    // Try to find idea in local store first
    const localIdea = store.ideas.find((item) => item.id === props.ideaId);
    if (localIdea) {
      idea.value = { ...localIdea };
    }
    // Also fetch fresh data from API
    const freshIdea = await store.loadIdea(props.ideaId);
    if (freshIdea) {
      idea.value = freshIdea;
    }
  } catch (error) {
    loadError.value = 'Failed to load idea details';
    console.error('Failed to load idea:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.idea-page {
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

.idea-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0;
  border: none;
  background: none;
  color: #6366f1;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: color 0.15s ease;
}

.idea-page__back:hover {
  color: #4f46e5;
}

.idea-page__loading {
  color: #9ca3af;
  font-size: 0.9375rem;
  font-style: italic;
}

.idea-page__error {
  color: #ef4444;
  font-size: 0.875rem;
  padding: 0.75rem;
  background: #fef2f2;
  border-radius: 8px;
}

.idea-page__title {
  margin: 0 0 1rem;
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2937;
}

.idea-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.idea-page__badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  text-transform: capitalize;
}

.idea-page__badge--platform {
  background: #eef2ff;
  color: #4338ca;
}

.idea-page__badge--format {
  background: #f3f4f6;
  color: #4b5563;
}

.idea-page__badge--proposed {
  background: #fef3c7;
  color: #92400e;
}

.idea-page__badge--approved {
  background: #d1fae5;
  color: #065f46;
}

.idea-page__badge--rejected {
  background: #f3f4f6;
  color: #6b7280;
}

.idea-page__badge--producing {
  background: #dbeafe;
  color: #1e40af;
}

.idea-page__badge--completed {
  background: #d1fae5;
  color: #065f46;
}

.idea-page__section {
  margin-bottom: 2rem;
}

.idea-page__section-title {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.idea-page__description {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
}

.idea-page__actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.idea-page__action {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.idea-page__action--approve {
  background: #6366f1;
  color: white;
}

.idea-page__action--approve:hover {
  background: #4f46e5;
}

.idea-page__action--reject {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.idea-page__action--reject:hover {
  background: #e5e7eb;
}

.idea-page__placeholder {
  padding: 2rem;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  text-align: center;
}

.idea-page__placeholder-text {
  margin: 0;
  font-size: 0.875rem;
  color: #9ca3af;
  font-style: italic;
}

.idea-page__placeholder-text--producing {
  color: #3b82f6;
  animation: producing-pulse 1.5s ease-in-out infinite;
}

@keyframes producing-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.idea-page__produced {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  overflow: hidden;
}

.idea-page__produced-content {
  margin: 0;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}
</style>
