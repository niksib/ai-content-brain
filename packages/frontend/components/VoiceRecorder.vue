<template>
  <div class="voice-recorder">
    <div class="mode-toggle">
      <button
        type="button"
        class="mode-button"
        :class="{ 'mode-button--active': mode === 'voice' }"
        :disabled="disabled"
        @click="mode = 'voice'"
      >
        Voice
      </button>
      <button
        type="button"
        class="mode-button"
        :class="{ 'mode-button--active': mode === 'text' }"
        :disabled="disabled"
        @click="mode = 'text'"
      >
        Text
      </button>
    </div>

    <!-- Voice mode -->
    <div v-if="mode === 'voice'" class="voice-controls">
      <div v-if="isRecording" class="duration-timer">
        {{ formattedDuration }}
      </div>

      <button
        type="button"
        class="record-button"
        :class="{ 'record-button--recording': isRecording }"
        :disabled="disabled"
        @click="toggleRecording"
      >
        <svg
          v-if="!isRecording"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>

      <p v-if="!isRecording" class="hint-text">
        Tap to record your answer
      </p>
    </div>

    <!-- Text mode -->
    <div v-else class="text-controls">
      <textarea
        v-model="textInput"
        class="text-input"
        placeholder="Type your answer..."
        :disabled="disabled"
        rows="3"
        @keydown.enter.meta.exact="submitText"
        @keydown.enter.ctrl.exact="submitText"
      />
      <button
        type="button"
        class="submit-button"
        :disabled="disabled || !textInput.trim()"
        @click="submitText"
      >
        Send
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useVoiceRecorder } from '~/composables/useVoiceRecorder';

const props = withDefaults(defineProps<{
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  submit: [text: string];
  recording: [isRecording: boolean];
  audioReady: [blob: Blob];
}>();

const mode = ref<'voice' | 'text'>('voice');
const textInput = ref('');

const { isRecording, audioBlob, duration, startRecording, stopRecording } = useVoiceRecorder();

const formattedDuration = computed(() => {
  const minutes = Math.floor(duration.value / 60);
  const seconds = duration.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

async function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
}

watch(isRecording, (recording) => {
  emit('recording', recording);
});

watch(audioBlob, (blob) => {
  if (blob) {
    emit('audioReady', blob);
  }
});

function submitText() {
  const text = textInput.value.trim();
  if (!text || props.disabled) return;
  emit('submit', text);
  textInput.value = '';
}
</script>

<style scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
}

.mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.mode-button {
  padding: 0.5rem 1.25rem;
  border: none;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-button:hover:not(:disabled) {
  background: #f3f4f6;
}

.mode-button--active {
  background: #6366f1;
  color: white;
}

.mode-button--active:hover:not(:disabled) {
  background: #4f46e5;
}

.mode-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.duration-timer {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
}

.record-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid #d1d5db;
  background: white;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.record-button:hover:not(:disabled) {
  border-color: #6366f1;
  background: #f5f3ff;
}

.record-button--recording {
  border-color: #ef4444;
  background: #fef2f2;
  color: #ef4444;
  animation: record-pulse 1.5s ease-in-out infinite;
}

.record-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes record-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
  }
}

.hint-text {
  font-size: 0.8125rem;
  color: #9ca3af;
  margin: 0;
}

.text-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.text-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.text-input:disabled {
  background: #f9fafb;
  opacity: 0.5;
}

.submit-button {
  align-self: flex-end;
  padding: 0.5rem 1.5rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  background: #4f46e5;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
