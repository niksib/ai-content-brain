<template>
  <div class="onboarding-page">
    <div class="onboarding-container">
      <!-- Progress indicator -->
      <div class="progress-indicator">
        <span class="progress-text">Question {{ displayQuestionNumber }} of 6</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${(displayQuestionNumber / 6) * 100}%` }"
          />
        </div>
      </div>

      <!-- Agent question -->
      <div class="question-area">
        <p v-if="store.isStreaming" class="question-text">
          {{ store.streamTokens }}
          <span class="cursor-blink">|</span>
        </p>
        <p v-else-if="store.currentQuestion" class="question-text">
          {{ store.currentQuestion }}
        </p>
        <p v-else-if="store.isLoading" class="question-text question-text--placeholder">
          Thinking...
        </p>
      </div>

      <!-- Animated orb -->
      <div class="orb-area">
        <AnimatedOrb :state="orbState" :size="120" />
      </div>

      <!-- Error message -->
      <p v-if="store.streamError" class="error-message">
        {{ store.streamError }}
      </p>

      <!-- Voice recorder -->
      <div class="input-area">
        <VoiceRecorder
          :disabled="store.isLoading || store.isStreaming"
          @submit="handleTextSubmit"
          @audio-ready="handleAudioReady"
          @recording="handleRecordingChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useOnboardingStore } from '~/stores/onboarding';
import { useVoiceService } from '~/services/voice';
import AnimatedOrb from '~/components/AnimatedOrb.vue';
import VoiceRecorder from '~/components/VoiceRecorder.vue';

definePageMeta({
  layout: 'default',
});

const store = useOnboardingStore();
const { transcribeAudio } = useVoiceService();
const router = useRouter();
const isUserRecording = ref(false);

const orbState = computed<'idle' | 'listening' | 'processing'>(() => {
  if (store.isLoading || store.isStreaming) return 'processing';
  if (isUserRecording.value) return 'listening';
  return 'idle';
});

const displayQuestionNumber = computed(() => {
  return Math.min(store.messageCount || 1, 6);
});

function handleRecordingChange(recording: boolean) {
  isUserRecording.value = recording;
}

async function handleTextSubmit(text: string) {
  await store.sendAnswer(text);
  if (store.isComplete) {
    router.push('/dashboard');
  }
}

async function handleAudioReady(blob: Blob) {
  try {
    const transcript = await transcribeAudio(blob);
    if (transcript.trim()) {
      await store.sendAnswer(transcript);
      if (store.isComplete) {
        router.push('/dashboard');
      }
    }
  } catch (error) {
    console.error('Transcription failed:', error);
  }
}

onMounted(async () => {
  try {
    const status = await store.checkStatus();
    if (status.completed) {
      router.push('/dashboard');
      return;
    }
    await store.startOnboarding();
  } catch (error) {
    console.error('Onboarding initialization failed:', error);
  }
});
</script>

<style scoped>
.onboarding-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: 2rem 1rem;
}

.onboarding-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 480px;
  width: 100%;
}

.progress-indicator {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-text {
  font-size: 0.8125rem;
  color: #9ca3af;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.question-area {
  text-align: center;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
}

.question-text {
  font-size: 1.125rem;
  line-height: 1.6;
  color: #1f2937;
  margin: 0;
}

.question-text--placeholder {
  color: #9ca3af;
  font-style: italic;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: #6366f1;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.orb-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
  margin: 0;
  padding: 0.5rem 1rem;
  background: #fef2f2;
  border-radius: 8px;
  width: 100%;
}

.input-area {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
