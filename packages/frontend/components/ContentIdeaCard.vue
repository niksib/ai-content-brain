<template>
  <div
    class="idea-card"
    :class="cardClasses"
    @click="emit('select', ideaId)"
    @mouseenter="isUpdated && emit('seen', ideaId)"
  >
    <!-- ── Header ── -->
    <div class="idea-card__header">
      <!-- Avatar + identity -->
      <div class="idea-card__identity">
        <div class="idea-card__avatar">
          <img v-if="avatarUrl" :src="avatarUrl" class="idea-card__avatar-img" :alt="username ?? platform" />
          <PlatformIcon v-else :platform="platform" :size="20" />
        </div>
        <div class="idea-card__identity-text">
          <p class="idea-card__username">{{ displayUsername }}</p>
          <p class="idea-card__platform-meta">{{ platformLabel }}<span v-if="formatLabel"> · {{ formatLabel }}</span></p>
        </div>
      </div>

      <!-- Status badge -->
      <span
        class="idea-card__status"
        :style="{ background: statusVisual.bg, color: statusVisual.color }"
      >
        <span v-if="isUpdating" class="idea-card__status-dot"></span>
        {{ statusText }}
      </span>
    </div>

    <!-- ── Body ── -->
    <div class="idea-card__body">
      <h3 class="idea-card__title">{{ angle }}</h3>
      <p v-if="description" class="idea-card__description">{{ truncatedDescription }}</p>

    </div>

    <!-- ── Footer ── -->
    <div class="idea-card__footer" @click.stop>
      <!-- Action buttons (left side) -->
      <div class="idea-card__actions">
        <!-- Session: proposed → approve / reject -->
        <template v-if="variant === 'session' && status === 'proposed'">
          <button class="idea-card__btn idea-card__btn--approve" @click.stop="emit('approve', ideaId)">
            Approve
          </button>
          <button class="idea-card__btn idea-card__btn--reject" @click.stop="emit('reject', ideaId)">
            Reject
          </button>
        </template>

        <!-- Session: producing → spinner -->
        <template v-else-if="variant === 'session' && status === 'producing'">
          <button class="idea-card__btn idea-card__btn--producing" disabled>
            <span class="idea-card__spinner"></span>
            AI working on it
          </button>
        </template>

        <!-- Library: threads → publish + schedule -->
        <template v-else-if="variant === 'library' && platform === 'threads'">
          <button
            class="idea-card__btn idea-card__btn--approve"
            :disabled="isPublishing"
            @click.stop="publishNow"
          >
            <span v-if="isPublishing">Publishing...</span>
            <span v-else>Publish now</span>
          </button>

          <div ref="scheduleWrapEl" class="idea-card__schedule-wrap">
            <button
              ref="scheduleButtonEl"
              class="idea-card__btn idea-card__btn--secondary"
              @click.stop="togglePopover"
            >
              Schedule
              <ChevronDown :size="14" />
            </button>

            <Teleport v-if="showPopover" to="body">
              <div
                ref="popoverEl"
                class="idea-card__popover"
                :style="popoverStyle"
              >
                <div class="idea-card__popover-fields">
                  <input v-model="scheduleDateInput" type="date" class="idea-card__date-input" :min="minDate" />
                  <input v-model="scheduleTimeInput" type="time" class="idea-card__time-input" />
                </div>
                <div class="idea-card__popover-footer">
                  <button class="idea-card__btn idea-card__btn--ghost" @click.stop="showPopover = false">
                    Cancel
                  </button>
                  <button
                    class="idea-card__btn idea-card__btn--approve idea-card__btn--sm"
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
      </div>

      <!-- Right side: cost + View Content -->
      <div class="idea-card__footer-right">
        <span
          v-if="costLabel"
          class="idea-card__cost"
          :title="`LLM cost (production only): ${costLabel}`"
        >
          {{ costLabel }}
        </span>

        <button
          v-if="status !== 'rejected'"
          class="idea-card__view-btn"
          @click.stop="emit('select', ideaId)"
        >
          View Content
          <ArrowRight :size="14" />
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="idea-card__error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown, ArrowRight } from 'lucide-vue-next';
import PlatformIcon from '~/components/PlatformIcon.vue';
import { useStatusColors, resolveStatusKey } from '~/composables/useStatusColors';

type Platform = 'threads' | 'linkedin' | 'tiktok' | 'instagram';

const props = defineProps<{
  ideaId: string;
  platform: Platform;
  format: string;
  angle: string;
  status: string;

  description?: string;
  publishStatus?: string | null;
  avatarUrl?: string | null;
  username?: string | null;

  isUpdating?: boolean;
  isUpdated?: boolean;

  // LLM cost in cents attributed to this idea (production-only sum). 0 or
  // missing when production has not run yet.
  costCents?: number;

  variant: 'session' | 'library';

  // Library-specific: content body for publishing
  libraryBody?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  select: [ideaId: string];
  approve: [ideaId: string];
  reject: [ideaId: string];
  seen: [ideaId: string];
  published: [contentIdeaId: string, threadsPostId: string];
  scheduled: [contentIdeaId: string, scheduledAt: string];
}>();

// ─── Display helpers ───

const PLATFORM_LABELS: Record<Platform, string> = {
  threads: 'Threads',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

const FORMAT_LABELS: Record<string, string> = {
  text_post: 'Post',
  text_with_image: 'Post + Image',
  image_series: 'Image Series',
  video_script: 'Video',
  carousel: 'Carousel',
  stories: 'Story',
};

const platformLabel = computed(() => PLATFORM_LABELS[props.platform] ?? props.platform);
const formatLabel = computed(() => FORMAT_LABELS[props.format] ?? props.format);

const displayUsername = computed(() => {
  if (props.username) return `@${props.username}`;
  return platformLabel.value;
});

const truncatedDescription = computed(() => props.description ?? '');

const costLabel = computed<string | null>(() => {
  const cents = props.costCents ?? 0;
  if (cents <= 0) return null;
  if (cents < 1) return '<$0.01';
  return `$${(cents / 100).toFixed(2)}`;
});


// ─── Status ───

const { visual } = useStatusColors();

const statusVisual = computed(() => {
  if (props.isUpdating || props.isUpdated) {
    // "AI working" / "Updated" state — use producing lavender/blue from shared palette
    return { ...visual('producing'), label: props.isUpdating ? 'AI working' : 'Updated' };
  }
  const key = resolveStatusKey(props.status, props.publishStatus);
  return visual(key);
});

const statusText = computed(() => statusVisual.value.label);

const cardClasses = computed(() => ({
  'idea-card--updating': props.isUpdating,
  'idea-card--updated': props.isUpdated && !props.isUpdating,
  [`idea-card--${props.status}`]: true,
}));

// ─── Library: publish / schedule ───

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

const minDate = computed(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
});

const publishPosts = computed((): string[] | null => {
  const body = props.libraryBody;
  if (!body) return null;
  if (Array.isArray(body.posts) && body.posts.length > 1) return body.posts as string[];
  return null;
});

const publishText = computed((): string => {
  const body = props.libraryBody;
  if (!body) return '';
  if (Array.isArray(body.posts)) return (body.posts as string[])[0] ?? '';
  if (typeof body.text === 'string') return body.text;
  return '';
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
    const posts = publishPosts.value;
    if (posts) {
      const result = await $fetch<{ postIds: string[] }>(`${apiBaseUrl}/api/threads/publish-thread`, {
        method: 'POST',
        credentials: 'include',
        body: { posts, contentIdeaId: props.ideaId },
      });
      emit('published', props.ideaId, result.postIds[0]);
    } else {
      const result = await $fetch<{ postId: string }>(`${apiBaseUrl}/api/threads/publish`, {
        method: 'POST',
        credentials: 'include',
        body: { text: publishText.value, contentIdeaId: props.ideaId },
      });
      emit('published', props.ideaId, result.postId);
    }
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

    const posts = publishPosts.value;
    const scheduleBody = posts
      ? { posts, scheduledAt: isoString, contentIdeaId: props.ideaId }
      : { text: publishText.value, scheduledAt: isoString, contentIdeaId: props.ideaId };

    await $fetch(`${apiBaseUrl}/api/threads/schedule`, {
      method: 'POST',
      credentials: 'include',
      body: scheduleBody,
    });

    showPopover.value = false;
    scheduleDateInput.value = '';
    scheduleTimeInput.value = '';
    emit('scheduled', props.ideaId, isoString);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to schedule. Please try again.';
  } finally {
    isScheduling.value = false;
  }
}
</script>

<style scoped>
/* ─── Card base ─── */
.idea-card {
  background: #ffffff;
  border: 1px solid rgba(199, 196, 216, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  cursor: pointer;
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.idea-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px -4px rgba(25, 28, 30, 0.1);
  border-color: rgba(79, 70, 229, 0.2);
}

.idea-card--updating {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  animation: card-pulse 2s ease-in-out infinite;
}

.idea-card--updated {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

@keyframes card-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12); }
  50% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
}

/* ─── Header ─── */
.idea-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.idea-card__identity {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.idea-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f2f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.idea-card__avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.idea-card__identity-text {
  min-width: 0;
}

.idea-card__username {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.8125rem;
  color: #191c1e;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.idea-card__platform-meta {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #777587;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
  margin-top: 2px;
  white-space: nowrap;
}

/* ─── Status badge ─── */
.idea-card__status {
  flex-shrink: 0;
  padding: 0.2rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.idea-card__status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: dot-blink 1s ease-in-out infinite;
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

/* Status background/color is applied inline from the shared status palette
   (see useStatusColors composable). Only shared animations/utilities remain. */

/* ─── Body ─── */
.idea-card__body {
  margin-bottom: 1rem;
}

.idea-card__title {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: #191c1e;
  margin: 0 0 0.375rem;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.idea-card__description {
  font-size: 0.8125rem;
  color: #464555;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ─── Footer ─── */
.idea-card__footer {
  margin-top: auto;
  padding-top: 0.875rem;
  border-top: 1px solid rgba(199, 196, 216, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.idea-card__actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.idea-card__footer-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.idea-card__cost {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #777587;
  background: #f2f4f6;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

/* ─── Buttons ─── */
.idea-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4375rem 0.875rem;
  border: none;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.idea-card__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.idea-card__btn--approve {
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.2);
}

.idea-card__btn--approve:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: 0 6px 16px rgba(53, 37, 205, 0.3);
}

.idea-card__btn--approve:active:not(:disabled) {
  transform: scale(0.97);
}

.idea-card__btn--reject {
  background: #e0e3e5;
  color: #464555;
}

.idea-card__btn--reject:hover:not(:disabled) {
  background: rgba(186, 26, 26, 0.1);
  color: #ba1a1a;
}

.idea-card__btn--secondary {
  background: #e0e3e5;
  color: #464555;
}

.idea-card__btn--secondary:hover:not(:disabled) {
  background: #d8dadc;
}

.idea-card__btn--ghost {
  background: none;
  color: #777587;
}

.idea-card__btn--ghost:hover {
  background: #f2f4f6;
}

.idea-card__btn--sm {
  padding: 0.3125rem 0.75rem;
}

.idea-card__btn--producing {
  background: #e2dfff;
  color: #3323cc;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

/* ─── View content button ─── */
.idea-card__view-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #3525cd;
  cursor: pointer;
  transition: gap 0.2s ease;
}

.idea-card:hover .idea-card__view-btn {
  gap: 0.4rem;
}

/* ─── Schedule popover ─── */
.idea-card__schedule-wrap {
  position: relative;
}

.idea-card__popover {
  background: #ffffff;
  border: 1px solid #e0e3e5;
  border-radius: 12px;
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.12);
  padding: 0.875rem;
  min-width: 240px;
}

.idea-card__popover-fields {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.idea-card__date-input,
.idea-card__time-input {
  flex: 1;
  padding: 0.4375rem 0.5rem;
  border: 1px solid #c7c4d8;
  border-radius: 8px;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s;
}

.idea-card__date-input:focus,
.idea-card__time-input:focus {
  border-color: #4f46e5;
}

.idea-card__popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* ─── Spinner ─── */
.idea-card__spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #c3c0ff;
  border-top-color: #3525cd;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Error ─── */
.idea-card__error {
  font-size: 0.75rem;
  color: #ba1a1a;
  margin: 0.5rem 0 0;
}
</style>
