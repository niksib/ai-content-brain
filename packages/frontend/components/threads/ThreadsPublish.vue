<template>
  <div class="threads-publish">
    <div v-if="!accountConnected" class="threads-publish__no-account">
      Connect your Threads account in Settings to publish.
    </div>

    <!-- Already posted -->
    <div v-else-if="publishStatus === 'posted'" class="threads-publish__posted">
      <CheckCircle :size="16" style="color:#10b981;" />
      Posted to Threads
    </div>

    <!-- Publish / Schedule actions -->
    <div v-else class="threads-publish__wrapper">
      <div class="threads-publish__actions">
        <button
          class="threads-publish__btn threads-publish__btn--primary"
          :disabled="isPublishing || !text"
          @click="publishNow"
        >
          <span v-if="isPublishing">Publishing...</span>
          <span v-else>Publish now</span>
        </button>

        <button
          v-if="publishStatus === 'scheduled'"
          class="threads-publish__btn threads-publish__btn--secondary"
          :disabled="isSaving || !text"
          @click="saveScheduledChanges"
        >
          <span v-if="isSaving">Saving...</span>
          <span v-else>Save changes</span>
        </button>

        <!-- Schedule button or scheduled state -->
        <div ref="scheduleWrapEl" class="threads-publish__schedule-wrap">
          <!-- Not yet scheduled: Schedule button -->
          <button
            v-if="publishStatus !== 'scheduled'"
            ref="scheduleButtonEl"
            class="threads-publish__btn threads-publish__btn--secondary"
            @click.stop="togglePopover"
          >
            Schedule
            <ChevronDown :size="16" class="threads-publish__chevron" />
          </button>

          <!-- Scheduled: display date + Change / Remove buttons -->
          <div v-else class="threads-publish__scheduled-state">
            <Clock :size="14" style="color:#6366f1;flex-shrink:0;" />
            <span class="threads-publish__scheduled-date">{{ scheduledDisplayText }}</span>
            <button
              ref="scheduleButtonEl"
              class="threads-publish__change-btn"
              @click.stop="togglePopover"
            >
              Change
            </button>
            <span class="threads-publish__scheduled-sep">·</span>
            <button
              class="threads-publish__remove-btn"
              :disabled="isUnscheduling"
              @click.stop="unschedulePost"
            >
              {{ isUnscheduling ? 'Removing…' : 'Remove' }}
            </button>
          </div>
        </div>

        <!-- Schedule popover — teleported to body to escape overflow:hidden -->
        <Teleport v-if="showSchedulePopover" to="body">
          <div
            ref="popoverEl"
            class="threads-publish__popover"
            :style="popoverStyle"
          >
            <div class="threads-publish__popover-fields">
              <input
                v-model="scheduleDateInput"
                type="date"
                class="threads-publish__date-input"
                :min="minDate"
              />
              <input
                v-model="scheduleTimeInput"
                type="time"
                class="threads-publish__time-input"
              />
            </div>
            <div class="threads-publish__popover-footer">
              <button
                class="threads-publish__btn threads-publish__btn--ghost"
                @click.stop="showSchedulePopover = false"
              >
                Cancel
              </button>
              <button
                class="threads-publish__btn threads-publish__btn--primary threads-publish__btn--sm"
                :disabled="isScheduling || !text || !scheduleDateInput || !scheduleTimeInput"
                @click.stop="schedulePost"
              >
                <span v-if="isScheduling">Scheduling...</span>
                <span v-else>Schedule</span>
              </button>
            </div>
          </div>
        </Teleport>

        <p v-if="errorMessage" class="threads-publish__error">{{ errorMessage }}</p>
        <p v-else-if="publishNoticeMessage" class="threads-publish__notice">{{ publishNoticeMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CheckCircle, ChevronDown, Clock } from 'lucide-vue-next';

type SingleMedia = { mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string };
type CarouselMedia = { carouselItems: Array<{ mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string }> };
type PostMedia = SingleMedia | CarouselMedia;

const props = defineProps<{
  text: string;
  posts?: string[] | null;
  postsMedia?: Array<PostMedia | null> | null;
  contentIdeaId?: string;
  publishStatus?: 'posted' | 'scheduled' | null;
  scheduledAt?: string | null;
}>();

const emit = defineEmits<{
  published: [threadsPostId: string];
  scheduled: [scheduledAt: string];
  unscheduled: [];
}>();

const isMultiThread = computed(() => Array.isArray(props.posts) && props.posts.length > 1);

const accountConnected = ref(false);
const isPublishing = ref(false);
const isScheduling = ref(false);
const isUnscheduling = ref(false);
const isSaving = ref(false);
const showSchedulePopover = ref(false);
const scheduleDateInput = ref('');
const scheduleTimeInput = ref('');
const errorMessage = ref('');
const publishNoticeMessage = ref('');
const PUBLISH_DELAY_MS = 60_000;
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

const scheduledDisplayText = computed(() => {
  const iso = props.scheduledAt;
  if (!iso) return 'Scheduled';
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Scheduled';
  }
});

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

function togglePopover(): void {
  showSchedulePopover.value = !showSchedulePopover.value;
  if (showSchedulePopover.value && scheduleButtonEl.value) {
    const rect = scheduleButtonEl.value.getBoundingClientRect();
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${(import.meta.client ? window.innerHeight : 800) - rect.top + 6}px`,
      left: `${rect.left}px`,
      zIndex: '9999',
    };
    // Pre-fill inputs with the existing scheduled date when changing.
    if (props.scheduledAt && !scheduleDateInput.value) {
      const date = new Date(props.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      scheduleDateInput.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      scheduleTimeInput.value = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  }
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Node;
  const insideWrap = scheduleWrapEl.value?.contains(target) ?? false;
  const insidePopover = popoverEl.value?.contains(target) ?? false;
  if (!insideWrap && !insidePopover) {
    showSchedulePopover.value = false;
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick);
  try {
    const response = await $fetch<{ account: { id: string } | null }>(
      `${apiBaseUrl}/api/threads/account`,
      { credentials: 'include' }
    );
    accountConnected.value = response.account !== null;
  } catch {
    accountConnected.value = false;
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

function buildThreadPayload() {
  return (props.posts ?? []).map((text, index) => {
    const media = props.postsMedia?.[index];
    if (!media) return { text };
    if ('mediaType' in media) return { text, mediaType: media.mediaType, mediaUrl: media.mediaUrl };
    // carousel in thread chain → use first item only (API doesn't support carousel per reply)
    const first = media.carouselItems[0];
    if (first) return { text, mediaType: first.mediaType, mediaUrl: first.mediaUrl };
    return { text };
  });
}

async function findPendingScheduledPostId(): Promise<string | null> {
  if (!props.contentIdeaId) return null;
  try {
    const resp = await $fetch<{ scheduledPosts: Array<{ id: string; contentIdeaId: string | null; status: string }> }>(
      `${apiBaseUrl}/api/threads/scheduled?status=all`,
      { credentials: 'include' },
    );
    return resp.scheduledPosts.find(
      (p) => p.contentIdeaId === props.contentIdeaId && p.status === 'pending',
    )?.id ?? null;
  } catch {
    return null;
  }
}

async function unschedulePost(): Promise<void> {
  isUnscheduling.value = true;
  errorMessage.value = '';
  try {
    const existingId = await findPendingScheduledPostId();
    if (existingId) {
      await $fetch(`${apiBaseUrl}/api/threads/scheduled/${existingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }
    emit('unscheduled');
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to remove schedule. Please try again.';
  } finally {
    isUnscheduling.value = false;
  }
}

async function publishNow(): Promise<void> {
  isPublishing.value = true;
  errorMessage.value = '';
  publishNoticeMessage.value = '';

  try {
    // If there's already a pending scheduled post, delete it first to avoid duplicates.
    if (props.publishStatus === 'scheduled') {
      const existingId = await findPendingScheduledPostId();
      if (existingId) {
        await $fetch(`${apiBaseUrl}/api/threads/scheduled/${existingId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
    }

    const scheduledAt = new Date(Date.now() + PUBLISH_DELAY_MS).toISOString();
    const scheduleBody: Record<string, unknown> = {
      scheduledAt,
      contentIdeaId: props.contentIdeaId,
    };

    if (isMultiThread.value) {
      scheduleBody.posts = buildThreadPayload();
    } else {
      scheduleBody.text = props.text;
      const singleMedia = props.postsMedia?.[0];
      if (singleMedia && 'mediaType' in singleMedia) {
        scheduleBody.mediaUrl = singleMedia.mediaUrl;
        scheduleBody.mediaType = singleMedia.mediaType;
      }
    }

    await $fetch(`${apiBaseUrl}/api/threads/schedule`, {
      method: 'POST',
      credentials: 'include',
      body: scheduleBody,
    });

    publishNoticeMessage.value = "Your post is queued, it'll publish in about a minute.";
    emit('scheduled', scheduledAt);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to publish. Please try again.';
  } finally {
    isPublishing.value = false;
  }
}

async function saveScheduledChanges(): Promise<void> {
  isSaving.value = true;
  errorMessage.value = '';
  publishNoticeMessage.value = '';

  try {
    const existingId = await findPendingScheduledPostId();
    if (!existingId) {
      errorMessage.value = 'No pending scheduled post found.';
      return;
    }

    const saveBody: Record<string, unknown> = {};
    if (isMultiThread.value) {
      saveBody.posts = buildThreadPayload();
    } else {
      saveBody.text = props.text;
      const singleMedia = props.postsMedia?.[0];
      if (singleMedia && 'mediaType' in singleMedia) {
        saveBody.mediaUrl = singleMedia.mediaUrl;
        saveBody.mediaType = singleMedia.mediaType;
      } else {
        saveBody.mediaType = 'TEXT';
        saveBody.mediaUrl = null;
      }
    }

    await $fetch(`${apiBaseUrl}/api/threads/scheduled/${existingId}`, {
      method: 'PATCH',
      credentials: 'include',
      body: saveBody,
    });

    publishNoticeMessage.value = 'Changes saved.';
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to save changes. Please try again.';
  } finally {
    isSaving.value = false;
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

    const scheduleBody: Record<string, unknown> = {
      scheduledAt: isoString,
      contentIdeaId: props.contentIdeaId,
    };

    if (isMultiThread.value) {
      scheduleBody.posts = buildThreadPayload();
    } else {
      scheduleBody.text = props.text;
      const singleMedia = props.postsMedia?.[0];
      if (singleMedia && 'mediaType' in singleMedia) {
        scheduleBody.mediaUrl = singleMedia.mediaUrl;
        scheduleBody.mediaType = singleMedia.mediaType;
      } else {
        scheduleBody.mediaType = 'TEXT';
        scheduleBody.mediaUrl = null;
      }
    }

    // If already scheduled, find the existing pending record and patch it instead
    // of creating a duplicate.
    if (props.publishStatus === 'scheduled') {
      const existingId = await findPendingScheduledPostId();

      if (existingId) {
        await $fetch(`${apiBaseUrl}/api/threads/scheduled/${existingId}`, {
          method: 'PATCH',
          credentials: 'include',
          body: scheduleBody,
        });
        showSchedulePopover.value = false;
        scheduleDateInput.value = '';
        scheduleTimeInput.value = '';
        emit('scheduled', isoString);
        return;
      }
    }

    await $fetch(`${apiBaseUrl}/api/threads/schedule`, {
      method: 'POST',
      credentials: 'include',
      body: scheduleBody,
    });

    showSchedulePopover.value = false;
    scheduleDateInput.value = '';
    scheduleTimeInput.value = '';
    emit('scheduled', isoString);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to schedule. Please try again.';
  } finally {
    isScheduling.value = false;
  }
}
</script>

<style scoped>
.threads-publish {
  display: contents;
}

.threads-publish__wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.threads-publish__no-account {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.threads-publish__posted {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #10b981;
}

.threads-publish__actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.threads-publish__schedule-wrap {
  position: relative;
}

.threads-publish__scheduled-state {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  font-size: 0.8125rem;
}

.threads-publish__scheduled-date {
  font-weight: 500;
  color: #4338ca;
}

.threads-publish__change-btn {
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6366f1;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  text-decoration: underline;
}

.threads-publish__change-btn:hover {
  color: #4f46e5;
}

.threads-publish__scheduled-sep {
  color: #c7d2fe;
  font-size: 0.75rem;
  user-select: none;
}

.threads-publish__remove-btn {
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 500;
  color: #dc2626;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  opacity: 0.8;
}

.threads-publish__remove-btn:hover:not(:disabled) {
  opacity: 1;
}

.threads-publish__remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.threads-publish__popover {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  padding: 0.875rem;
  min-width: 260px;
}

.threads-publish__popover-fields {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.threads-publish__date-input,
.threads-publish__time-input {
  flex: 1;
  padding: 0.4375rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.8125rem;
  color: #111827;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}

.threads-publish__date-input:focus,
.threads-publish__time-input:focus {
  border-color: #6366f1;
}

.threads-publish__popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.threads-publish__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.threads-publish__btn--sm {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
}

.threads-publish__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.threads-publish__btn--primary {
  background: #000;
  color: white;
}

.threads-publish__btn--primary:hover:not(:disabled) {
  background: #1a1a1a;
}

.threads-publish__btn--secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.threads-publish__btn--secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.threads-publish__btn--ghost {
  background: none;
  color: #6b7280;
  border: 1px solid transparent;
}

.threads-publish__btn--ghost:hover {
  background: #f3f4f6;
  color: #374151;
}

.threads-publish__chevron {
  line-height: 1;
}

.threads-publish__error {
  font-size: 0.8125rem;
  color: #ef4444;
  margin: 0;
  width: 100%;
}

.threads-publish__notice {
  font-size: 0.8125rem;
  color: #4338ca;
  margin: 0;
  width: 100%;
}


/* Media attach / preview lives in the parent IdeaPage timeline — this
   component no longer renders attach UI; it only reads props.postsMedia. */
</style>
