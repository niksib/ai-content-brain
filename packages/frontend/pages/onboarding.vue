<template>
  <div class="onboarding-page">
    <!-- Progress bar -->
    <header class="onboarding-header">
      <div class="onboarding-header__inner">
        <span class="onboarding-header__step-label">
          <template v-if="store.phase === 'processing'">Analyzing your answers…</template>
          <template v-else-if="store.isFollowUp">Follow-up · {{ store.questionNumber }} of {{ store.totalQuestions }}</template>
          <template v-else>Question {{ store.questionNumber }} of {{ store.totalQuestions }}</template>
        </span>
        <div class="onboarding-progress">
          <div class="onboarding-progress__fill" :style="progressStyle"></div>
        </div>
      </div>
    </header>

    <main class="onboarding-main">

      <!-- ── COLLECTING phase ── -->
      <template v-if="store.phase === 'collecting'">
        <div class="onboarding-question">
          <p v-if="store.isFollowUp" class="onboarding-question__followup-label">
            A few more details needed
          </p>
          <h1 class="onboarding-question__text">{{ store.currentQuestion }}</h1>
        </div>

        <!-- Orb (voice mode) -->
        <div v-if="inputMode === 'voice'" class="onboarding-orb-wrap">
          <div class="onboarding-orb__glow"></div>
          <button
            class="onboarding-orb"
            :class="`onboarding-orb--${orbState}`"
            :disabled="isTranscribing"
            @click="toggleRecording"
          >
            <div class="onboarding-orb__overlay"></div>
            <div class="onboarding-orb__content">
              <template v-if="isTranscribing">
                <span class="material-symbols-outlined orb-icon" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">hourglass_top</span>
                <span class="orb-hint">Transcribing…</span>
              </template>
              <template v-else-if="isRecording">
                <span class="material-symbols-outlined orb-icon" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">stop_circle</span>
                <span class="orb-timer">{{ recordingTime }}</span>
                <span class="orb-hint">Tap to stop</span>
              </template>
              <template v-else>
                <span class="material-symbols-outlined orb-icon" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">mic</span>
                <span class="orb-hint">Tap to record</span>
              </template>
            </div>
          </button>
        </div>

        <!-- Error -->
        <p v-if="store.error" class="onboarding-error">{{ store.error }}</p>

        <!-- Mode toggle -->
        <div class="onboarding-mode-toggle">
          <div class="onboarding-mode-toggle__track">
            <button
              class="onboarding-mode-toggle__btn"
              :class="{ 'onboarding-mode-toggle__btn--active': inputMode === 'voice' }"
              @click="switchToVoice"
            >
              <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">settings_voice</span>
              Voice
            </button>
            <button
              class="onboarding-mode-toggle__btn"
              :class="{ 'onboarding-mode-toggle__btn--active': inputMode === 'text' }"
              @click="inputMode = 'text'"
            >
              Text
            </button>
          </div>
        </div>

        <!-- Text input -->
        <div v-if="inputMode === 'text'" class="onboarding-input">
          <VoiceRecorder :disabled="isTranscribing" @submit="handleTextSubmit" />
        </div>
      </template>

      <!-- ── PROCESSING phase ── -->
      <template v-else-if="store.phase === 'processing'">
        <div class="onboarding-question">
          <h1 class="onboarding-question__text">Building your profile…</h1>
          <p class="onboarding-question__hint">This takes a few seconds.</p>
        </div>

        <div class="onboarding-orb-wrap">
          <div class="onboarding-orb__glow"></div>
          <div class="onboarding-orb onboarding-orb--processing">
            <div class="onboarding-orb__overlay"></div>
            <div class="onboarding-orb__content">
              <span class="material-symbols-outlined orb-icon" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">auto_awesome</span>
              <span class="orb-hint">Analyzing</span>
            </div>
          </div>
        </div>
      </template>

    </main>

    <!-- Bottom nav (only in collecting phase) -->
    <nav v-if="store.phase === 'collecting'" class="onboarding-bottom-nav">
      <div class="onboarding-bottom-nav__inner">
        <button class="onboarding-bottom-nav__prev" @click="handlePrev" :disabled="store.currentIndex === 0 && !store.isFollowUp">
          <span class="material-symbols-outlined">arrow_back</span>
          Previous
        </button>
        <button class="onboarding-bottom-nav__next" @click="handleSkip" :disabled="isTranscribing">
          Skip
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </nav>

    <div class="onboarding-bg onboarding-bg--top-right"></div>
    <div class="onboarding-bg onboarding-bg--bottom-left"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useOnboardingStore } from '~/stores/onboarding';
import { useVoiceService } from '~/services/voice';
import { useVoiceRecorder } from '~/composables/useVoiceRecorder';
import VoiceRecorder from '~/components/VoiceRecorder.vue';

definePageMeta({ layout: false });

const store = useOnboardingStore();
const { transcribeAudio } = useVoiceService();
const router = useRouter();
const inputMode = ref<'voice' | 'text'>('voice');
const isTranscribing = ref(false);

const { isRecording, audioBlob, duration, startRecording, stopRecording } = useVoiceRecorder();

const recordingTime = computed(() => {
  const m = Math.floor(duration.value / 60).toString().padStart(2, '0');
  const s = (duration.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

const orbState = computed(() => {
  if (isTranscribing.value) return 'processing';
  if (isRecording.value) return 'listening';
  return 'idle';
});

const progressStyle = computed(() => {
  if (store.phase === 'processing') return { width: '100%' };
  const pct = (store.questionNumber / store.totalQuestions) * 100;
  return { width: `${pct}%` };
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
  inputMode.value = 'voice';
}

watch(audioBlob, async (blob) => {
  if (!blob) return;
  isTranscribing.value = true;
  try {
    const transcript = await transcribeAudio(blob);
    if (transcript.trim()) {
      store.submitAnswer(transcript.trim());
    }
  } catch (err) {
    console.error('Transcription failed:', err);
  } finally {
    isTranscribing.value = false;
  }
});

watch(() => store.phase, (phase) => {
  if (phase === 'complete') {
    router.push('/dashboard');
  }
});

function handleTextSubmit(text: string) {
  store.submitAnswer(text);
}

function handlePrev() {
  // no-op — going back would complicate the accumulated answers model
}

function handleSkip() {
  store.submitAnswer('(skipped)');
}

onMounted(async () => {
  try {
    const status = await store.checkStatus();
    if (status.completed) {
      router.push('/dashboard');
    }
  } catch (err) {
    console.error('Status check failed:', err);
  }
});

onUnmounted(() => {
  if (isRecording.value) stopRecording();
});
</script>

<style scoped>
.onboarding-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  background: radial-gradient(circle at top right, #e2dfff 0%, #f7f9fb 40%, #ffffff 100%);
  color: #191c1e;
  font-family: 'Inter', sans-serif;
}

.onboarding-bg {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.onboarding-bg--top-right {
  top: -10%; right: -10%;
  width: 40%; padding-top: 40%;
  background: radial-gradient(circle, rgba(53, 37, 205, 0.05) 0%, transparent 70%);
}
.onboarding-bg--bottom-left {
  bottom: -10%; left: -10%;
  width: 50%; padding-top: 50%;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.07) 0%, transparent 70%);
}

/* ─── Header ─── */
.onboarding-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.onboarding-header__inner {
  width: 100%;
  max-width: 480px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
}
.onboarding-header__step-label {
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(53, 37, 205, 0.6);
}
.onboarding-progress {
  width: 100%;
  height: 2px;
  background: #eceef0;
  border-radius: 9999px;
  overflow: hidden;
}
.onboarding-progress__fill {
  height: 100%;
  background: #3525cd;
  border-radius: 9999px;
  transition: width 0.5s ease;
  box-shadow: 0 0 8px rgba(79, 70, 229, 0.4);
}

/* ─── Main ─── */
.onboarding-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 1.5rem 8rem;
  max-width: 680px;
  width: 100%;
  gap: 2.5rem;
  position: relative;
  z-index: 10;
}

/* ─── Question ─── */
.onboarding-question {
  text-align: center;
}
.onboarding-question__followup-label {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #4f46e5;
  margin: 0 0 0.75rem;
}
.onboarding-question__text {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(1.625rem, 4vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: #191c1e;
  margin: 0 0 0.875rem;
}
.onboarding-question__hint {
  font-size: 0.9375rem;
  color: rgba(70, 69, 85, 0.65);
  margin: 0;
}

/* ─── Orb ─── */
.onboarding-orb-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.onboarding-orb__glow {
  position: absolute;
  inset: 0;
  background: rgba(53, 37, 205, 0.1);
  border-radius: 50%;
  filter: blur(60px);
  transform: scale(1.5);
  animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}
.onboarding-orb {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  background-size: 400% 400%;
  animation: fluid-shift 10s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 0;
}
.onboarding-orb:hover:not(:disabled) {
  transform: scale(1.04);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
}
.onboarding-orb:active:not(:disabled) { transform: scale(0.97); }
.onboarding-orb:disabled { cursor: default; }
.onboarding-orb--listening { animation: fluid-shift 3s ease infinite, orb-pulse 1s ease infinite; }
.onboarding-orb--processing { animation: fluid-shift 5s ease infinite; opacity: 0.9; }

.onboarding-orb__overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05);
  mix-blend-mode: overlay;
  backdrop-filter: blur(2px);
  pointer-events: none;
}
.onboarding-orb__content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 1;
}
.orb-icon {
  font-size: 48px !important;
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

@keyframes fluid-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.6; transform: scale(1.5); }
  50%       { opacity: 1;   transform: scale(1.7); }
}
@keyframes orb-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.03); }
}

/* ─── Error ─── */
.onboarding-error {
  color: #ba1a1a;
  font-size: 0.875rem;
  text-align: center;
  padding: 0.625rem 1rem;
  background: rgba(186, 26, 26, 0.06);
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
}

/* ─── Mode toggle ─── */
.onboarding-mode-toggle { display: flex; justify-content: center; }
.onboarding-mode-toggle__track {
  display: flex;
  padding: 5px;
  background: #e6e8ea;
  border-radius: 9999px;
  gap: 4px;
}
.onboarding-mode-toggle__btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.75rem;
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
.onboarding-mode-toggle__btn--active {
  background: #3525cd;
  color: #fff;
  box-shadow: 0 2px 8px rgba(53, 37, 205, 0.25);
}

/* ─── Text input ─── */
.onboarding-input { width: 100%; max-width: 520px; }

/* ─── Cursor blink ─── */
.cursor-blink { animation: blink 1s step-end infinite; color: #3525cd; }
@keyframes blink { 50% { opacity: 0; } }

/* ─── Bottom nav ─── */
.onboarding-bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  padding: 0 3rem 2.5rem;
  background: linear-gradient(to top, rgba(247, 249, 251, 0.9) 0%, transparent 100%);
  pointer-events: none;
  height: 120px;
  align-items: flex-end;
}
.onboarding-bottom-nav__inner {
  width: 100%;
  max-width: 960px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: auto;
}
.onboarding-bottom-nav__prev {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #464555;
  transition: color 0.15s;
}
.onboarding-bottom-nav__prev:hover:not(:disabled) { color: #3525cd; }
.onboarding-bottom-nav__prev:disabled { opacity: 0.3; cursor: not-allowed; }

.onboarding-bottom-nav__next {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.75rem;
  background: #e6e8ea;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #464555;
  transition: all 0.2s;
}
.onboarding-bottom-nav__next:hover:not(:disabled) { background: #3525cd; color: #fff; }
.onboarding-bottom-nav__next:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
