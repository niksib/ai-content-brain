<template>
  <Teleport v-if="open" to="body">
    <div class="sched-overlay" @click.self="close">
      <div class="sched-modal" role="dialog" aria-modal="true">
        <header class="sched-modal__header">
          <h2 class="sched-modal__title">{{ isEditMode ? 'Edit scheduled post' : 'Schedule post' }}</h2>
          <button type="button" class="sched-modal__close" @click="close" aria-label="Close">
            <X :size="18" />
          </button>
        </header>

        <div class="sched-modal__body">
          <section class="sched-platforms">
            <label class="sched-label">Platform</label>
            <div class="sched-platforms__row">
              <button
                v-for="platform in PLATFORMS"
                :key="platform.id"
                type="button"
                class="sched-platform-btn"
                :class="{
                  'sched-platform-btn--active': selectedPlatform === platform.id,
                  'sched-platform-btn--soon': !platform.available,
                }"
                :disabled="!platform.available"
                @click="onPlatformClick(platform.id)"
              >
                <PlatformIcon :platform="platform.id" :size="16" />
                <span>{{ platform.label }}</span>
                <span v-if="!platform.available" class="sched-platform-btn__soon">Soon</span>
              </button>
            </div>
          </section>

          <section class="sched-when">
            <label class="sched-label">When</label>
            <div class="sched-when__row">
              <input
                v-model="scheduleDate"
                type="date"
                class="sched-input"
                :min="minDate"
              />
              <input
                v-model="scheduleTime"
                type="time"
                class="sched-input"
              />
            </div>
            <p class="sched-when__tz">Times are in your local timezone ({{ userTimezone }}).</p>
          </section>

          <ThreadsScheduleForm
            v-if="selectedPlatform === 'threads'"
            ref="threadsFormRef"
            :posts="threadsPosts"
            @update:posts="threadsPosts = $event"
          />

          <p v-if="errorMessage" class="sched-error">{{ errorMessage }}</p>
        </div>

        <footer class="sched-modal__footer">
          <template v-if="isEditMode && !showDeleteConfirm">
            <button
              type="button"
              class="sched-btn sched-btn--danger"
              :disabled="isSubmitting || isDeleting"
              @click="requestDeleteConfirm"
            >
              {{ isDeleting ? 'Deleting…' : 'Delete' }}
            </button>
          </template>
          <template v-else-if="isEditMode && showDeleteConfirm">
            <span class="sched-modal__confirm-text">Delete this post?</span>
            <button type="button" class="sched-btn sched-btn--ghost" @click="showDeleteConfirm = false">Cancel</button>
            <button type="button" class="sched-btn sched-btn--danger" :disabled="isDeleting" @click="deletePost">
              {{ isDeleting ? 'Deleting…' : 'Confirm delete' }}
            </button>
          </template>
          <template v-if="!showDeleteConfirm">
            <span class="sched-modal__footer-spacer" />
            <button type="button" class="sched-btn sched-btn--ghost" @click="close">Cancel</button>
            <button
              type="button"
              class="sched-btn sched-btn--primary"
              :disabled="!canSubmit || isSubmitting"
              @click="submit"
            >
              {{ submitLabel }}
            </button>
          </template>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import PlatformIcon from '~/components/PlatformIcon.vue';
import ThreadsScheduleForm, { type ThreadsSchedulePost } from '~/components/threads/ThreadsScheduleForm.vue';

type PlatformId = 'threads' | 'linkedin' | 'instagram' | 'tiktok';

export interface SchedulePostEditData {
  id: string;
  platform: PlatformId;
  scheduledAt: string;
  text: string;
  isThread: boolean;
  posts: ThreadsSchedulePost[];
}

const props = defineProps<{
  open: boolean;
  edit?: SchedulePostEditData | null;
}>();

const emit = defineEmits<{
  close: [];
  scheduled: [];
}>();

const isEditMode = computed(() => Boolean(props.edit));

const submitLabel = computed(() => {
  if (isSubmitting.value) return isEditMode.value ? 'Saving…' : 'Scheduling…';
  return isEditMode.value ? 'Save changes' : 'Schedule';
});

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

const PLATFORMS: Array<{ id: PlatformId; label: string; available: boolean }> = [
  { id: 'threads', label: 'Threads', available: true },
  { id: 'linkedin', label: 'LinkedIn', available: false },
  { id: 'instagram', label: 'Instagram', available: false },
  { id: 'tiktok', label: 'TikTok', available: false },
];

const selectedPlatform = ref<PlatformId>('threads');
const scheduleDate = ref('');
const scheduleTime = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);
const isDeleting = ref(false);
const showDeleteConfirm = ref(false);

const threadsPosts = ref<ThreadsSchedulePost[]>([{ text: '', mediaItems: [] }]);

const userTimezone = computed(() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
});

const minDate = computed(() => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
});

const scheduledAtIso = computed<string | null>(() => {
  if (!scheduleDate.value || !scheduleTime.value) return null;
  const [year, month, day] = scheduleDate.value.split('-').map(Number);
  const [hour, minute] = scheduleTime.value.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
  return date.toISOString();
});

const threadsHasContent = computed(() =>
  threadsPosts.value.every((post) => post.text.trim().length > 0 && post.text.length <= 500)
);

const canSubmit = computed(() => {
  if (!scheduledAtIso.value) return false;
  if (selectedPlatform.value === 'threads') {
    return threadsHasContent.value;
  }
  return false;
});

function close(): void {
  showDeleteConfirm.value = false;
  emit('close');
}

function onPlatformClick(platform: PlatformId): void {
  const meta = PLATFORMS.find((entry) => entry.id === platform);
  if (!meta?.available) return;
  selectedPlatform.value = platform;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return;
  errorMessage.value = '';
  isSubmitting.value = false;
  isDeleting.value = false;

  if (props.edit) {
    selectedPlatform.value = props.edit.platform;
    const date = new Date(props.edit.scheduledAt);
    scheduleDate.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    scheduleTime.value = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    threadsPosts.value = props.edit.posts.length > 0
      ? props.edit.posts.map((post) => ({ text: post.text, mediaItems: post.mediaItems.slice() }))
      : [{ text: '', mediaItems: [] }];
    return;
  }

  selectedPlatform.value = 'threads';
  scheduleDate.value = '';
  scheduleTime.value = '';
  threadsPosts.value = [{ text: '', mediaItems: [] }];
});

function buildThreadsBody(): Record<string, unknown> {
  const body: Record<string, unknown> = { scheduledAt: scheduledAtIso.value };
  if (threadsPosts.value.length > 1) {
    body.posts = threadsPosts.value.map((post) => ({
      text: post.text.trim(),
      ...(post.mediaItems.length > 0 ? { mediaItems: post.mediaItems } : {}),
    }));
  } else {
    const single = threadsPosts.value[0];
    body.text = single.text.trim();
    body.mediaItems = single.mediaItems;
  }
  return body;
}

async function submit(): Promise<void> {
  if (!canSubmit.value || !scheduledAtIso.value) return;
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    if (selectedPlatform.value === 'threads') {
      const body = buildThreadsBody();
      if (props.edit) {
        await $fetch(`${apiBaseUrl}/api/threads/scheduled/${props.edit.id}`, {
          method: 'PATCH',
          credentials: 'include',
          body,
        });
      } else {
        await $fetch(`${apiBaseUrl}/api/threads/schedule`, {
          method: 'POST',
          credentials: 'include',
          body,
        });
      }
    }
    emit('scheduled');
    close();
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to schedule. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

function requestDeleteConfirm(): void {
  showDeleteConfirm.value = true;
}

async function deletePost(): Promise<void> {
  if (!props.edit) return;
  showDeleteConfirm.value = false;
  errorMessage.value = '';
  isDeleting.value = true;
  try {
    await $fetch(`${apiBaseUrl}/api/threads/scheduled/${props.edit.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    emit('scheduled');
    close();
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to delete post.';
  } finally {
    isDeleting.value = false;
  }
}
</script>

<style scoped>
.sched-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 21, 0.55);
  z-index: 9998;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4rem 1rem;
  overflow-y: auto;
  backdrop-filter: blur(4px);
}

.sched-modal {
  width: min(640px, 100%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(15, 17, 21, 0.25);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 8rem);
}

.sched-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.sched-modal__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

.sched-modal__close {
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.sched-modal__close:hover { background: #f3f4f6; color: #111827; }

.sched-modal__body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}

.sched-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f3f4f6;
}

.sched-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.sched-platforms__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sched-platform-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.sched-platform-btn--active {
  background: #111827;
  border-color: #111827;
  color: #fff;
}

.sched-platform-btn--soon {
  cursor: not-allowed;
  opacity: 0.55;
}

.sched-platform-btn__soon {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-left: 0.125rem;
}

.sched-when__row {
  display: flex;
  gap: 0.5rem;
}

.sched-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
}

.sched-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.sched-when__tz {
  margin: 0.375rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.sched-error {
  margin: 0;
  font-size: 0.8125rem;
  color: #dc2626;
}

.sched-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.sched-btn--ghost {
  background: transparent;
  color: #374151;
}

.sched-btn--ghost:hover { background: #f3f4f6; }

.sched-btn--primary {
  background: #111827;
  color: #fff;
}

.sched-btn--primary:hover:not(:disabled) { background: #1f2937; }
.sched-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

.sched-btn--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.sched-btn--danger:hover:not(:disabled) { background: #fecaca; }
.sched-btn--danger:disabled { opacity: 0.5; cursor: not-allowed; }

.sched-modal__footer-spacer { flex: 1; }

.sched-modal__confirm-text {
  font-size: 0.875rem;
  color: #dc2626;
  font-weight: 500;
  white-space: nowrap;
}
</style>
