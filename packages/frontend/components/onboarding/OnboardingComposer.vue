<template>
  <div class="ob-composer-wrap">
    <div class="ob-composer" :class="{ 'ob-composer--focused': focused }">
      <textarea
        ref="textareaRef"
        v-model="modelValue"
        class="ob-composer__textarea"
        :placeholder="placeholder"
        :disabled="disabled || isTranscribing"
        rows="1"
        @focus="focused = true"
        @blur="focused = false"
        @input="autoResize"
        @keydown.enter.meta.exact.prevent="handleSubmit"
        @keydown.enter.ctrl.exact.prevent="handleSubmit"
      />

      <button
        v-if="showMic"
        type="button"
        class="ob-composer__mic"
        :class="{ 'ob-composer__mic--active': isRecording, 'ob-composer__mic--busy': isTranscribing }"
        :disabled="disabled"
        @click="toggleRecording"
      >
        <Hourglass v-if="isTranscribing" :size="20" />
        <Square v-else-if="isRecording" :size="20" />
        <Mic v-else :size="20" />
      </button>

      <button
        v-if="showSend"
        type="button"
        class="ob-composer__send"
        :disabled="disabled || !modelValue.trim()"
        @click="handleSubmit"
      >
        <ArrowUp :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Hourglass, Square, Mic, ArrowUp } from 'lucide-vue-next';
import { useVoiceRecorder } from '~/composables/useVoiceRecorder';
import { useVoiceService } from '~/services/voice';

const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  showMic?: boolean;
  showSend?: boolean;
}>(), {
  placeholder: 'Type your answer…',
  disabled: false,
  showMic: true,
  showSend: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [value: string];
  'recording-change': [isRecording: boolean];
}>();

const focused = ref(false);
const isTranscribing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const { isRecording, audioBlob, startRecording, stopRecording } = useVoiceRecorder();
const { transcribeAudio } = useVoiceService();

const modelValue = ref(props.modelValue);

watch(() => props.modelValue, (v) => {
  if (v !== modelValue.value) modelValue.value = v;
});

watch(modelValue, (v) => {
  emit('update:modelValue', v);
});

watch(isRecording, (v) => emit('recording-change', v));

watch(audioBlob, async (blob) => {
  if (!blob) return;
  isTranscribing.value = true;
  try {
    const transcript = await transcribeAudio(blob);
    if (transcript.trim()) {
      const prefix = modelValue.value.trim();
      modelValue.value = prefix ? `${prefix} ${transcript.trim()}` : transcript.trim();
      await nextTick();
      autoResize();
    }
  } catch (err) {
    console.error('Transcription failed:', err);
  } finally {
    isTranscribing.value = false;
  }
});

async function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    try {
      await startRecording();
    } catch (err) {
      console.error('Mic access failed:', err);
    }
  }
}

function handleSubmit() {
  const text = modelValue.value.trim();
  if (!text || props.disabled) return;
  emit('submit', text);
}

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
}
</script>

<style scoped>
.ob-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 10px 10px 14px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(199, 196, 216, 0.5);
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(53, 37, 205, 0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ob-composer--focused {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.ob-composer__textarea {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  resize: none;
  font-family: 'Inter', sans-serif;
  font-size: 14.5px;
  line-height: 1.5;
  color: #191c1e;
  min-height: 38px;
  max-height: 120px;
  padding: 6px 0;
}

.ob-composer__textarea::placeholder { color: #a09faf; }
.ob-composer__textarea:disabled { opacity: 0.5; }

.ob-composer__mic,
.ob-composer__send {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s;
  background: none;
  padding: 0;
}

.ob-composer__mic {
  color: #4f46e5;
  background: #eef2ff;
  border-color: #dbe0ff;
}
.ob-composer__mic:hover:not(:disabled) { background: #e0e7ff; }
.ob-composer__mic--active {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
  animation: ob-mic-pulse 1.2s ease-in-out infinite;
}
.ob-composer__mic--busy { opacity: 0.7; cursor: wait; }

@keyframes ob-mic-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
  50%      { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
}

.ob-composer__send {
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}
.ob-composer__send:hover:not(:disabled) { transform: translateY(-1px); }
.ob-composer__send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
  background: #cfced9;
}
</style>
