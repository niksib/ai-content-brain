<template>
  <div class="threads-publish">
    <div v-if="!accountConnected" class="threads-publish__no-account">
      <span>Connect your Threads account in Settings to publish.</span>
    </div>

    <!-- Already posted -->
    <div v-else-if="publishStatus === 'posted'" class="threads-publish__posted">
      <span class="material-symbols-outlined" style="font-size:16px;color:#10b981;">check_circle</span>
      Posted to Threads
    </div>

    <!-- Scheduled (not yet published) -->
    <div v-else-if="publishStatus === 'scheduled'" class="threads-publish__scheduled">
      <span class="material-symbols-outlined" style="font-size:16px;color:#6366f1;">schedule</span>
      Scheduled
    </div>

    <!-- Publish / schedule actions -->
    <div v-else class="threads-publish__actions">
      <button
        class="threads-publish__btn threads-publish__btn--primary"
        :disabled="isPublishing || !text"
        @click="publishNow"
      >
        <span v-if="isPublishing">Publishing...</span>
        <span v-else>Publish now</span>
      </button>

      <div class="threads-publish__schedule">
        <input
          v-model="scheduledAtInput"
          type="datetime-local"
          class="threads-publish__datetime"
          :min="minScheduleDate"
        />
        <button
          class="threads-publish__btn threads-publish__btn--secondary"
          :disabled="isScheduling || !text || !scheduledAtInput"
          @click="schedulePost"
        >
          <span v-if="isScheduling">Scheduling...</span>
          <span v-else>Schedule</span>
        </button>
      </div>

      <p v-if="successMessage" class="threads-publish__success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="threads-publish__error">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps<{
  text: string;
  contentIdeaId?: string;
  publishStatus?: 'posted' | 'scheduled' | null;
}>();

const emit = defineEmits<{
  published: [threadsPostId: string];
  scheduled: [];
}>();

const accountConnected = ref(false);
const isPublishing = ref(false);
const isScheduling = ref(false);
const scheduledAtInput = ref('');
const successMessage = ref('');
const errorMessage = ref('');

const minScheduleDate = computed(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  // datetime-local requires local time string, not UTC
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
});

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

onMounted(async () => {
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

async function publishNow(): Promise<void> {
  isPublishing.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const result = await $fetch<{ postId: string }>(`${apiBaseUrl}/api/threads/publish`, {
      method: 'POST',
      credentials: 'include',
      body: {
        text: props.text,
        contentIdeaId: props.contentIdeaId,
      },
    });
    emit('published', result.postId);
  } catch {
    errorMessage.value = 'Failed to publish. Please try again.';
  } finally {
    isPublishing.value = false;
  }
}

async function schedulePost(): Promise<void> {
  if (!scheduledAtInput.value) return;

  isScheduling.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    // datetime-local gives "YYYY-MM-DDTHH:mm" without timezone.
    // Parsing it as-is treats it as UTC in some environments — we must
    // build the Date from components so the browser uses local time.
    const [datePart, timePart] = scheduledAtInput.value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const scheduledAtLocal = new Date(year, month - 1, day, hours, minutes);

    await $fetch(`${apiBaseUrl}/api/threads/schedule`, {
      method: 'POST',
      credentials: 'include',
      body: {
        text: props.text,
        scheduledAt: scheduledAtLocal.toISOString(),
        contentIdeaId: props.contentIdeaId,
      },
    });
    scheduledAtInput.value = '';
    emit('scheduled');
  } catch {
    errorMessage.value = 'Failed to schedule. Please try again.';
  } finally {
    isScheduling.value = false;
  }
}
</script>

<style scoped>
.threads-publish {
  margin-top: 1rem;
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

.threads-publish__scheduled {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6366f1;
}

.threads-publish__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.threads-publish__schedule {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.threads-publish__datetime {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.threads-publish__btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
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

.threads-publish__success {
  font-size: 0.8125rem;
  color: #10b981;
  margin: 0;
}

.threads-publish__error {
  font-size: 0.8125rem;
  color: #ef4444;
  margin: 0;
}
</style>
