<template>
  <div class="threads-publish">
    <div v-if="!accountConnected" class="threads-publish__no-account">
      <span>Connect your Threads account in Settings to publish.</span>
    </div>

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
  return now.toISOString().slice(0, 16);
});

onMounted(async () => {
  try {
    const config = useRuntimeConfig();
    const response = await $fetch<{ account: { id: string } | null }>(
      `${config.public.apiBaseUrl}/api/threads/account`
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
    const config = useRuntimeConfig();
    await $fetch(`${config.public.apiBaseUrl}/api/threads/publish`, {
      method: 'POST',
      body: {
        text: props.text,
        contentIdeaId: props.contentIdeaId,
      },
    });
    successMessage.value = 'Published successfully!';
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
    const config = useRuntimeConfig();
    await $fetch(`${config.public.apiBaseUrl}/api/threads/schedule`, {
      method: 'POST',
      body: {
        text: props.text,
        scheduledAt: new Date(scheduledAtInput.value).toISOString(),
        contentIdeaId: props.contentIdeaId,
      },
    });
    successMessage.value = `Scheduled for ${new Date(scheduledAtInput.value).toLocaleString()}`;
    scheduledAtInput.value = '';
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
