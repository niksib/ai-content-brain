<template>
  <div class="session-page">
    <!-- Recording state (initial, before first message) -->
    <Transition name="layout-fade" mode="out-in">
      <div v-if="store.pageState === 'recording'" key="recording" class="recording-state">
        <div class="recording-container">
          <p class="recording-prompt">Расскажите, что произошло сегодня</p>

          <div class="orb-area">
            <AnimatedOrb :state="orbState" :size="120" />
          </div>

          <p v-if="store.streamError" class="error-message">
            {{ store.streamError }}
          </p>

          <div class="input-area">
            <VoiceRecorder
              :disabled="store.isStreaming"
              @submit="handleSubmit"
              @audio-ready="handleAudioReady"
              @recording="handleRecordingChange"
            />
          </div>
        </div>
      </div>

      <!-- Chat state (after first submit) -->
      <div v-else key="chat" class="chat-state">
        <div class="chat-workspace-layout">
          <ChatPanel
            :messages="store.messages"
            :is-streaming="store.isStreaming"
            :current-stream-text="store.streamTokens"
            :stream-error="store.streamError"
            @submit="handleSubmit"
            @audio-ready="handleAudioReady"
          />
          <WorkspacePanel
            :ideas="store.ideas"
            @approve="handleApproveIdea"
            @reject="handleRejectIdea"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useSessionStore } from '~/stores/session';
import { useVoiceService } from '~/services/voice';
import AnimatedOrb from '~/components/AnimatedOrb.vue';
import VoiceRecorder from '~/components/VoiceRecorder.vue';
import ChatPanel from '~/components/ChatPanel.vue';
import WorkspacePanel from '~/components/WorkspacePanel.vue';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const store = useSessionStore();
const { transcribeAudio } = useVoiceService();
const isUserRecording = ref(false);

const sessionId = computed(() => route.params.id as string);

const orbState = computed<'idle' | 'listening' | 'processing'>(() => {
  if (store.isStreaming) return 'processing';
  if (isUserRecording.value) return 'listening';
  return 'idle';
});

function handleRecordingChange(recording: boolean) {
  isUserRecording.value = recording;
}

async function handleSubmit(text: string) {
  await store.sendMessage(text);
}

async function handleAudioReady(blob: Blob) {
  try {
    const transcript = await transcribeAudio(blob);
    if (transcript.trim()) {
      await store.sendMessage(transcript);
    }
  } catch (error) {
    console.error('Transcription failed:', error);
  }
}

async function handleApproveIdea(ideaId: string) {
  await store.approveIdea(ideaId);
}

async function handleRejectIdea(ideaId: string) {
  await store.rejectIdea(ideaId);
}

onMounted(async () => {
  try {
    await store.createOrLoadSession(sessionId.value);
    await Promise.all([store.loadMessages(), store.loadIdeas()]);
  } catch (error) {
    console.error('Session initialization failed:', error);
  }
});
</script>

<style scoped>
.session-page {
  height: calc(100vh - 80px);
  overflow: hidden;
}

/* Recording state — centered layout like onboarding */
.recording-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem 1rem;
}

.recording-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 480px;
  width: 100%;
}

.recording-prompt {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #1f2937;
  text-align: center;
  margin: 0;
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

/* Chat state — two column layout */
.chat-state {
  height: 100%;
}

.chat-workspace-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
  gap: 0;
}

@media (max-width: 768px) {
  .chat-workspace-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
}

/* Transition */
.layout-fade-enter-active,
.layout-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.layout-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.layout-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
