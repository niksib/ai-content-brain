<template>
  <div class="chat-input">
    <!-- Mode toggle -->
    <div class="chat-input__mode-toggle">
      <button
        type="button"
        class="chat-input__mode"
        :class="{ 'chat-input__mode--active': inputMode === 'text' }"
        :disabled="disabled"
        @click="inputMode = 'text'"
      >
        Text
      </button>
      <button
        type="button"
        class="chat-input__mode"
        :class="{ 'chat-input__mode--active': inputMode === 'voice' }"
        :disabled="disabled"
        @click="inputMode = 'voice'"
      >
        Voice
      </button>
    </div>

    <!-- Text input mode -->
    <div v-if="inputMode === 'text'" class="chat-input__row">
      <textarea
        ref="textareaRef"
        v-model="textInput"
        class="chat-input__field"
        placeholder="Type your message..."
        :disabled="disabled"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        type="button"
        class="chat-input__send"
        :disabled="disabled || !textInput.trim()"
        @click="submitText"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>

    <!-- Voice input mode -->
    <div v-else class="chat-input__voice">
      <div v-if="isRecording" class="chat-input__recording-timer">
        {{ formattedDuration }}
      </div>
      <button
        type="button"
        class="chat-input__record"
        :class="{ 'chat-input__record--recording': isRecording }"
        :disabled="disabled"
        @click="toggleRecording"
      >
        <svg
          v-if="!isRecording"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <span v-if="!isRecording" class="chat-input__voice-hint">Tap to record</span>
    </div>

    <div v-if="inputMode === 'text'" class="chat-input__hint">
      <span>Enter to send, Shift+Enter for newline</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useVoiceRecorder } from '~/composables/useVoiceRecorder';

const props = withDefaults(defineProps<{
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  send: [text: string];
  audioReady: [blob: Blob];
}>();

const inputMode = ref<'text' | 'voice'>('text');
const textInput = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

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

watch(audioBlob, (blob) => {
  if (blob) {
    emit('audioReady', blob);
  }
});

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitText();
  }
}

function submitText() {
  const text = textInput.value.trim();
  if (!text || props.disabled) return;
  emit('send', text);
  textInput.value = '';
  nextTick(() => autoResize());
}

function autoResize() {
  const textarea = textareaRef.value;
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}
</script>

<style scoped>
.chat-input {
  padding: 0.75rem 1rem;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.chat-input__mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  width: fit-content;
}

.chat-input__mode {
  padding: 0.25rem 0.75rem;
  border: none;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-input__mode:hover:not(:disabled) {
  background: #f3f4f6;
}

.chat-input__mode--active {
  background: #6366f1;
  color: white;
}

.chat-input__mode--active:hover:not(:disabled) {
  background: #4f46e5;
}

.chat-input__mode:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input__row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.chat-input__field {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.4;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.chat-input__field:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.chat-input__field:disabled {
  background: #f9fafb;
  opacity: 0.5;
}

.chat-input__send {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.chat-input__send:hover:not(:disabled) {
  background: #4f46e5;
}

.chat-input__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-input__voice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.chat-input__recording-timer {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
  min-width: 40px;
}

.chat-input__record {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  background: white;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.chat-input__record:hover:not(:disabled) {
  border-color: #6366f1;
  background: #f5f3ff;
}

.chat-input__record--recording {
  border-color: #ef4444;
  background: #fef2f2;
  color: #ef4444;
  animation: chat-record-pulse 1.5s ease-in-out infinite;
}

.chat-input__record:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes chat-record-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

.chat-input__voice-hint {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.chat-input__hint {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: #9ca3af;
}
</style>
