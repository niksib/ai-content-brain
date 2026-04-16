<template>
  <div class="threads-publish">
    <div v-if="!accountConnected" class="threads-publish__no-account">
      Connect your Threads account in Settings to publish.
    </div>

    <!-- Already posted -->
    <div v-else-if="publishStatus === 'posted'" class="threads-publish__posted">
      <span class="material-symbols-outlined" style="font-size:16px;color:#10b981;">check_circle</span>
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
            <span class="material-symbols-outlined threads-publish__chevron">expand_more</span>
          </button>

          <!-- Scheduled: display date + Change button -->
          <div v-else class="threads-publish__scheduled-state">
            <span class="material-symbols-outlined" style="font-size:14px;color:#6366f1;flex-shrink:0;">schedule</span>
            <span class="threads-publish__scheduled-date">{{ scheduledDisplayText }}</span>
            <button
              ref="scheduleButtonEl"
              class="threads-publish__change-btn"
              @click.stop="togglePopover"
            >
              Change
            </button>
          </div>
        </div>

        <!-- Schedule popover — teleported to body to escape overflow:hidden -->
        <Teleport to="body">
          <div
            v-if="showSchedulePopover"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  text: string;
  posts?: string[] | null;
  postsMedia?: Array<{ mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string } | null> | null;
  contentIdeaId?: string;
  publishStatus?: 'posted' | 'scheduled' | null;
  scheduledAt?: string | null;
}>();

const emit = defineEmits<{
  published: [threadsPostId: string];
  scheduled: [scheduledAt: string];
}>();

const isMultiThread = computed(() => Array.isArray(props.posts) && props.posts.length > 1);

const accountConnected = ref(false);
const isPublishing = ref(false);
const isScheduling = ref(false);
const showSchedulePopover = ref(false);
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
    if (media) {
      return { text, mediaType: media.mediaType, mediaUrl: media.mediaUrl };
    }
    return { text };
  });
}

async function publishNow(): Promise<void> {
  isPublishing.value = true;
  errorMessage.value = '';

  try {
    if (isMultiThread.value) {
      const result = await $fetch<{ postIds: string[] }>(`${apiBaseUrl}/api/threads/publish-thread`, {
        method: 'POST',
        credentials: 'include',
        body: { posts: buildThreadPayload(), contentIdeaId: props.contentIdeaId },
      });
      emit('published', result.postIds[0]);
    } else {
      const publishBody: Record<string, unknown> = {
        text: props.text,
        contentIdeaId: props.contentIdeaId,
      };
      const singleMedia = props.postsMedia?.[0];
      if (singleMedia) {
        publishBody.mediaUrl = singleMedia.mediaUrl;
        publishBody.mediaType = singleMedia.mediaType;
      }
      const result = await $fetch<{ postId: string }>(`${apiBaseUrl}/api/threads/publish`, {
        method: 'POST',
        credentials: 'include',
        body: publishBody,
      });
      emit('published', result.postId);
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

    const scheduleBody: Record<string, unknown> = {
      scheduledAt: isoString,
      contentIdeaId: props.contentIdeaId,
    };

    if (isMultiThread.value) {
      scheduleBody.posts = buildThreadPayload();
    } else {
      scheduleBody.text = props.text;
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
  font-size: 16px;
  line-height: 1;
}

.threads-publish__error {
  font-size: 0.8125rem;
  color: #ef4444;
  margin: 0;
  width: 100%;
}


/* Media attach / preview lives in the parent IdeaPage timeline — this
   component no longer renders attach UI; it only reads props.postsMedia. */
</style>
