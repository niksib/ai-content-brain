<template>
  <div class="backlog-card">
    <div class="backlog-card__meta">
      <PlatformIcon :platform="item.platform" :size="16" />
      <span class="backlog-card__format">{{ formatLabel }}</span>
    </div>

    <p class="backlog-card__title">{{ displayTitle }}</p>
    <span class="backlog-card__angle-badge">{{ angleLabel }}</span>
    <p v-if="preview" class="backlog-card__preview">{{ preview }}</p>

    <div class="backlog-card__actions">
      <template v-if="item.platform === 'threads'">
        <button
          class="backlog-card__btn backlog-card__btn--primary"
          :disabled="isPublishing"
          @click.stop="publishNow"
        >
          <span v-if="isPublishing">Publishing...</span>
          <span v-else>Publish now</span>
        </button>

        <div ref="scheduleWrapEl" class="backlog-card__schedule-wrap">
          <button
            ref="scheduleButtonEl"
            class="backlog-card__btn backlog-card__btn--secondary"
            @click.stop="togglePopover"
          >
            Schedule
            <ChevronDown :size="16" class="backlog-card__chevron" />
          </button>

          <Teleport v-if="showPopover" to="body">
            <div
              ref="popoverEl"
              class="backlog-card__popover"
              :style="popoverStyle"
            >
              <div class="backlog-card__popover-fields">
                <input
                  v-model="scheduleDateInput"
                  type="date"
                  class="backlog-card__date-input"
                  :min="minDate"
                />
                <input
                  v-model="scheduleTimeInput"
                  type="time"
                  class="backlog-card__time-input"
                />
              </div>
              <div class="backlog-card__popover-footer">
                <button class="backlog-card__btn backlog-card__btn--ghost" @click.stop="showPopover = false">
                  Cancel
                </button>
                <button
                  class="backlog-card__btn backlog-card__btn--primary backlog-card__btn--sm"
                  :disabled="isScheduling || !scheduleDateInput || !scheduleTimeInput"
                  @click.stop="schedulePost"
                >
                  <span v-if="isScheduling">Scheduling...</span>
                  <span v-else>Schedule</span>
                </button>
              </div>
            </div>
          </Teleport>
        </div>
      </template>

      <!-- Non-Threads: navigate to idea -->
      <button v-else class="backlog-card__btn backlog-card__btn--secondary" @click.stop="emit('open')">
        Open →
      </button>
    </div>

    <p v-if="errorMessage" class="backlog-card__error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import type { LibraryItem } from '~/stores/library';
import PlatformIcon from '~/components/PlatformIcon.vue';

const props = defineProps<{
  item: LibraryItem;
}>();

const emit = defineEmits<{
  open: [];
  published: [contentIdeaId: string, threadsPostId: string];
  scheduled: [contentIdeaId: string, scheduledAt: string];
}>();

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

const isPublishing = ref(false);
const isScheduling = ref(false);
const showPopover = ref(false);
const scheduleDateInput = ref('');
const scheduleTimeInput = ref('');
const errorMessage = ref('');
const scheduleWrapEl = ref<HTMLElement | null>(null);
const scheduleButtonEl = ref<HTMLElement | null>(null);
const popoverEl = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});

const formatLabels: Record<string, string> = {
  text_post: 'Post',
  video_script: 'Video Script',
  carousel: 'Carousel',
  stories: 'Stories',
};

const formatLabel = computed(() => formatLabels[props.item.format] ?? props.item.format);

const ANGLE_LABELS: Record<string, string> = {
  hot_take: 'Hot Take',
  reframe: 'Reframe',
  specific_story: 'Specific Story',
  list_of_specifics: 'List of Specifics',
  numbers: 'Numbers',
  observation: 'Observation',
  curiosity_gap: 'Curiosity Gap',
  identity_snapshot: 'Identity Snapshot',
  comparison_frame: 'Comparison Frame',
  question_to_audience: 'Question to Audience',
};

const angleLabel = computed(() => {
  const a = props.item.contentIdea.angle;
  return ANGLE_LABELS[a] ?? a;
});

const displayTitle = computed(() => {
  const t = (props.item.contentIdea.title ?? '').trim();
  if (t) return t;
  return angleLabel.value;
});

const preview = computed(() => {
  const body = props.item.body;
  let text = '';
  if (typeof body.text === 'string') text = body.text;
  else if (Array.isArray(body.posts) && body.posts.length > 0) text = body.posts[0] as string;
  else if (typeof body.caption === 'string') text = body.caption;
  if (!text) return '';
  return text.length > 100 ? text.slice(0, 100) + '…' : text;
});

const publishText = computed((): string => {
  const body = props.item.body;
  if (Array.isArray(body.posts)) return (body.posts as string[]).join('\n\n');
  if (typeof body.text === 'string') return body.text;
  return '';
});

const minDate = computed(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
});

function togglePopover(): void {
  showPopover.value = !showPopover.value;
  if (showPopover.value && scheduleButtonEl.value) {
    const rect = scheduleButtonEl.value.getBoundingClientRect();
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 6}px`,
      left: `${rect.left}px`,
      zIndex: '9999',
    };
  }
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Node;
  const insideWrap = scheduleWrapEl.value?.contains(target) ?? false;
  const insidePopover = popoverEl.value?.contains(target) ?? false;
  if (!insideWrap && !insidePopover) {
    showPopover.value = false;
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick));
onUnmounted(() => document.removeEventListener('click', onDocumentClick));

async function publishNow(): Promise<void> {
  isPublishing.value = true;
  errorMessage.value = '';
  try {
    const result = await $fetch<{ postId: string }>(`${apiBaseUrl}/api/threads/publish`, {
      method: 'POST',
      credentials: 'include',
      body: { text: publishText.value, contentIdeaId: props.item.contentIdeaId },
    });
    emit('published', props.item.contentIdeaId, result.postId);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to publish. Please try again.';
  } finally {
    isPublishing.value = false;
  }
}

async function schedulePost(): Promise<void> {
  if (!scheduleDateInput.value || !scheduleTimeInput.value) return;
  isScheduling.value = true;
  errorMessage.value = '';
  try {
    const [year, month, day] = scheduleDateInput.value.split('-').map(Number);
    const [hours, minutes] = scheduleTimeInput.value.split(':').map(Number);
    const isoString = new Date(year, month - 1, day, hours, minutes).toISOString();

    await $fetch(`${apiBaseUrl}/api/threads/schedule`, {
      method: 'POST',
      credentials: 'include',
      body: { text: publishText.value, scheduledAt: isoString, contentIdeaId: props.item.contentIdeaId },
    });

    showPopover.value = false;
    scheduleDateInput.value = '';
    scheduleTimeInput.value = '';
    emit('scheduled', props.item.contentIdeaId, isoString);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to schedule. Please try again.';
  } finally {
    isScheduling.value = false;
  }
}
</script>

<style scoped>
.backlog-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 220px;
  max-width: 260px;
  flex-shrink: 0;
}

.backlog-card__meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.backlog-card__format {
  font-size: 0.6875rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.backlog-card__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.backlog-card__angle-badge {
  align-self: flex-start;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background: #eef0ff;
  color: #3525cd;
}

.backlog-card__preview {
  margin: 0;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.backlog-card__actions {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.backlog-card__schedule-wrap {
  position: relative;
}

.backlog-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.backlog-card__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.backlog-card__btn--primary {
  background: #000;
  color: white;
}

.backlog-card__btn--primary:hover:not(:disabled) {
  background: #1a1a1a;
}

.backlog-card__btn--secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.backlog-card__btn--secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.backlog-card__btn--ghost {
  background: none;
  color: #6b7280;
  border: 1px solid transparent;
}

.backlog-card__btn--ghost:hover {
  background: #f3f4f6;
}

.backlog-card__btn--sm {
  padding: 0.3125rem 0.75rem;
}

.backlog-card__chevron {
  font-size: 14px;
}

.backlog-card__popover {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  padding: 0.875rem;
  min-width: 240px;
}

.backlog-card__popover-fields {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.backlog-card__date-input,
.backlog-card__time-input {
  flex: 1;
  padding: 0.4375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s;
}

.backlog-card__date-input:focus,
.backlog-card__time-input:focus {
  border-color: #6366f1;
}

.backlog-card__popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.backlog-card__error {
  font-size: 0.75rem;
  color: #ef4444;
  margin: 0;
}
</style>
