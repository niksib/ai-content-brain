<template>
  <div class="orb-recorder">
    <!-- Orb -->
    <div class="orb-recorder__wrap">
      <div class="orb-recorder__glow"></div>
      <button
        class="orb-recorder__orb"
        :class="`orb-recorder__orb--${computedState}`"
        :disabled="disabled || isTranscribing"
        @click="toggleRecording"
      >
        <div class="orb-recorder__overlay"></div>
        <div class="orb-recorder__content">
          <template v-if="isTranscribing">
            <Hourglass :size="48" class="orb-icon" />
            <span class="orb-hint">Transcribing…</span>
          </template>
          <template v-else-if="isRecording">
            <StopCircle :size="48" class="orb-icon" />
            <span class="orb-timer">{{ recordingTime }}</span>
            <span class="orb-hint">Tap to stop</span>
          </template>
          <template v-else-if="externalState === 'processing'">
            <Sparkles :size="48" class="orb-icon" />
            <span class="orb-hint">Processing…</span>
          </template>
          <template v-else>
            <Mic :size="48" class="orb-icon" />
            <span class="orb-hint">Tap to record</span>
          </template>
        </div>
      </button>
    </div>

    <!-- Mode toggle -->
    <div class="orb-recorder__mode-toggle">
      <div class="mode-toggle__track">
        <button
          class="mode-toggle__btn"
          :class="{ 'mode-toggle__btn--active': mode === 'voice' }"
          @click="switchToVoice"
        >
          <Mic2 :size="17" />
          Voice
        </button>
        <button
          class="mode-toggle__btn"
          :class="{ 'mode-toggle__btn--active': mode === 'text' }"
          @click="mode = 'text'"
        >
          Text
        </button>
      </div>
    </div>

    <!-- Text composer (text mode) -->
    <div v-if="mode === 'text'" class="orb-recorder__text-input">
      <div class="text-composer" :class="{ 'text-composer--focused': isFocused }">
        <textarea
          ref="textareaRef"
          v-model="textInput"
          class="text-composer__textarea"
          placeholder="Type your answer…"
          :disabled="disabled"
          rows="3"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown.enter.meta.exact.prevent="submitText"
          @keydown.enter.ctrl.exact.prevent="submitText"
          @input="autoResize"
        />
        <button
          type="button"
          class="text-composer__send"
          :disabled="disabled || !textInput.trim()"
          @click="submitText"
        >
          <Send :size="20" />
        </button>
      </div>
      <p class="text-composer__hint">Press ⌘↵ or Ctrl↵ to send</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Hourglass, StopCircle, Sparkles, Mic, Mic2, Send } from 'lucide-vue-next';
import { useVoiceRecorder } from '~/composables/useVoiceRecorder';
import { useVoiceService } from '~/services/voice';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  externalState?: 'idle' | 'listening' | 'processing';
}>(), {
  disabled: false,
  externalState: 'idle',
});

const emit = defineEmits<{
  transcribed: [text: string];
  submit: [text: string];
  recording: [isRecording: boolean];
}>();

const { transcribeAudio } = useVoiceService();
const { isRecording, audioBlob, duration, startRecording, stopRecording } = useVoiceRecorder();

const mode = ref<'voice' | 'text'>('voice');
const isTranscribing = ref(false);
const textInput = ref('');
const isFocused = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const recordingTime = computed(() => {
  const m = Math.floor(duration.value / 60).toString().padStart(2, '0');
  const s = (duration.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

const computedState = computed(() => {
  if (isTranscribing.value || props.externalState === 'processing') return 'processing';
  if (isRecording.value) return 'listening';
  return 'idle';
});

async function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
}

function switchToVoice() {
  if (isRecording.value) stopRecording();
  mode.value = 'voice';
}

watch(isRecording, (val) => emit('recording', val));

watch(audioBlob, async (blob) => {
  if (!blob) return;
  isTranscribing.value = true;
  try {
    const transcript = await transcribeAudio(blob);
    if (transcript.trim()) {
      emit('transcribed', transcript.trim());
    }
  } catch (err) {
    console.error('Transcription failed:', err);
  } finally {
    isTranscribing.value = false;
  }
});

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function submitText() {
  const text = textInput.value.trim();
  if (!text || props.disabled) return;
  emit('submit', text);
  textInput.value = '';
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = 'auto';
  });
}
</script>

<style scoped>
.orb-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
}

/* ─── Orb wrap ─── */
.orb-recorder__wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-recorder__glow {
  position: absolute;
  inset: 0;
  background: rgba(53, 37, 205, 0.1);
  border-radius: 50%;
  filter: blur(60px);
  transform: scale(1.5);
  animation: orb-pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

.orb-recorder__orb {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  background-size: 400% 400%;
  animation: orb-fluid 10s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 0;
}
.orb-recorder__orb:hover:not(:disabled) {
  transform: scale(1.04);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
}
.orb-recorder__orb:active:not(:disabled) { transform: scale(0.97); }
.orb-recorder__orb:disabled { cursor: default; }
.orb-recorder__orb--listening { animation: orb-fluid 3s ease infinite, orb-pulse 1s ease infinite; }
.orb-recorder__orb--processing { animation: orb-fluid 5s ease infinite; opacity: 0.9; }

.orb-recorder__overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05);
  mix-blend-mode: overlay;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.orb-recorder__content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 1;
}

.orb-icon {
  color: #fff;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
}
.orb-timer {
  font-family: 'Manrope', sans-serif;
  font-size: 1.625rem;
  font-weight: 300;
  letter-spacing: 0.12em;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.orb-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
}

/* ─── Mode toggle ─── */
.orb-recorder__mode-toggle { display: flex; justify-content: center; }
.mode-toggle__track {
  display: flex;
  padding: 5px;
  background: #e6e8ea;
  border-radius: 9999px;
  gap: 4px;
}
.mode-toggle__btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.5rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #464555;
  background: transparent;
  transition: all 0.2s;
}
.mode-toggle__btn--active {
  background: #3525cd;
  color: #fff;
  box-shadow: 0 2px 8px rgba(53, 37, 205, 0.25);
}

/* ─── Text composer ─── */
.orb-recorder__text-input { width: 100%; max-width: 520px; }

.text-composer {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 1rem 1rem 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(199, 196, 216, 0.4);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(53, 37, 205, 0.06);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.text-composer--focused {
  border-color: #3525cd;
  box-shadow: 0 0 0 3px rgba(53, 37, 205, 0.1);
}
.text-composer__textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #191c1e;
  min-height: 48px;
  max-height: 200px;
  overflow-y: auto;
}
.text-composer__textarea::placeholder { color: #a09faf; }
.text-composer__textarea:disabled { opacity: 0.5; }
.text-composer__send {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.3);
  transition: opacity 0.15s, transform 0.1s;
}
.text-composer__send:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.text-composer__send:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
.text-composer__hint {
  font-size: 0.75rem;
  color: #a09faf;
  text-align: right;
  margin: 0.375rem 0 0;
  padding-right: 0.25rem;
}

/* ─── Animations ─── */
@keyframes orb-fluid {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes orb-pulse-slow {
  0%, 100% { opacity: 0.6; transform: scale(1.5); }
  50%       { opacity: 1;   transform: scale(1.7); }
}
@keyframes orb-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.03); }
}
</style>
