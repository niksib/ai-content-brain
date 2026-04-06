<template>
  <div class="session-page">
    <Transition name="layout-fade" mode="out-in">

      <!-- ══════════════════════════════════════════
           STATE 1 — Recording / session start
      ══════════════════════════════════════════ -->
      <div v-if="store.pageState === 'recording'" key="recording" class="recording-state">
        <!-- Background blobs -->
        <div class="recording-bg recording-bg--tl"></div>
        <div class="recording-bg recording-bg--br"></div>

        <div class="recording-container">
          <!-- Heading -->
          <h1 class="recording-title">What did you do today?</h1>

          <!-- Orb -->
          <div class="recording-orb-wrap">
            <div class="recording-orb__glow"></div>
            <div class="recording-orb" :class="`recording-orb--${orbState}`">
              <div class="recording-orb__overlay"></div>
              <div class="recording-orb__center">
                <span
                  class="material-symbols-outlined"
                  style="font-size:40px;color:#fff;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;"
                >mic</span>
              </div>
            </div>
          </div>

          <!-- Timer when recording -->
          <div v-if="isUserRecording" class="recording-timer">
            <div class="recording-timer__time">{{ recordingTime }}</div>
            <div class="recording-timer__label">LISTENING TO YOUR THOUGHTS...</div>
          </div>

          <!-- Mode toggle -->
          <div class="recording-mode-toggle">
            <div class="recording-mode-toggle__track">
              <button
                class="recording-mode-toggle__btn"
                :class="{ 'recording-mode-toggle__btn--active': inputMode === 'voice' }"
                @click="inputMode = 'voice'"
              >
                <span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">settings_voice</span>
                Voice
              </button>
              <button
                class="recording-mode-toggle__btn"
                :class="{ 'recording-mode-toggle__btn--active': inputMode === 'text' }"
                @click="inputMode = 'text'"
              >
                Text
              </button>
            </div>
          </div>

          <!-- Error -->
          <p v-if="store.streamError" class="session-error">{{ store.streamError }}</p>

          <!-- Voice recorder -->
          <div class="recording-input">
            <VoiceRecorder
              :disabled="store.isStreaming"
              @submit="handleSubmit"
              @audio-ready="handleAudioReady"
              @recording="handleRecordingChange"
            />
          </div>

          <!-- Stop button (shown when recording) -->
          <div v-if="isUserRecording" class="recording-stop-wrap">
            <button class="recording-stop-btn">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">stop_circle</span>
              Stop Recording
            </button>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════
           STATE 2 — Chat + Workspace (results / ideas)
      ══════════════════════════════════════════ -->
      <div v-else key="chat" class="chat-state">

        <!-- Left: Transcript panel -->
        <aside class="transcript-panel">
          <div class="transcript-panel__header">
            <h2 class="transcript-panel__title">
              <span class="material-symbols-outlined" style="font-size:20px;">notes</span>
              Session Transcript
            </h2>
            <span class="transcript-panel__badge">Live Session</span>
          </div>

          <div class="transcript-messages">
            <template v-for="msg in store.messages" :key="msg.id">
              <!-- User message -->
              <div v-if="msg.role === 'user'" class="transcript-msg transcript-msg--user">
                <div class="transcript-msg__avatar transcript-msg__avatar--user">
                  <span class="material-symbols-outlined" style="font-size:14px;">person</span>
                </div>
                <div class="transcript-msg__body">
                  <span class="transcript-msg__label transcript-msg__label--user">You</span>
                  <div class="transcript-msg__bubble transcript-msg__bubble--user">
                    {{ msg.content }}
                  </div>
                </div>
              </div>

              <!-- AI message -->
              <div v-else class="transcript-msg transcript-msg--ai">
                <div class="transcript-msg__avatar transcript-msg__avatar--ai">
                  <span class="material-symbols-outlined" style="font-size:14px;">smart_toy</span>
                </div>
                <div class="transcript-msg__body">
                  <span class="transcript-msg__label transcript-msg__label--ai">AI Curator</span>
                  <div class="transcript-msg__bubble transcript-msg__bubble--ai">
                    {{ msg.content }}
                  </div>
                </div>
              </div>
            </template>

            <!-- Streaming in progress -->
            <div v-if="store.isStreaming && store.streamTokens" class="transcript-msg transcript-msg--ai">
              <div class="transcript-msg__avatar transcript-msg__avatar--ai">
                <span class="material-symbols-outlined" style="font-size:14px;">smart_toy</span>
              </div>
              <div class="transcript-msg__body">
                <span class="transcript-msg__label transcript-msg__label--ai">AI Curator</span>
                <div class="transcript-msg__bubble transcript-msg__bubble--ai">
                  {{ store.streamTokens }}<span class="cursor-blink">|</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat input -->
          <div class="transcript-input">
            <button class="transcript-input__mic" title="Voice input">
              <span class="material-symbols-outlined" style="font-size:20px;">mic</span>
            </button>
            <input
              v-model="chatInputText"
              class="transcript-input__field"
              placeholder="Add a thought or request..."
              type="text"
              @keydown.enter="submitChatInput"
            />
            <button
              class="transcript-input__send"
              :disabled="store.isStreaming"
              @click="submitChatInput"
            >
              <span class="material-symbols-outlined" style="font-size:20px;">send</span>
            </button>
          </div>
        </aside>

        <!-- Right: Ideas workspace -->
        <section class="workspace-panel">
          <div class="workspace-panel__header">
            <h3 class="workspace-panel__title">
              <span class="material-symbols-outlined" style="font-size:20px;color:#3525cd;">lightbulb</span>
              Generated Idea Cards
            </h3>
            <span v-if="store.streamError" class="session-error session-error--inline">{{ store.streamError }}</span>
          </div>

          <!-- Idea grid -->
          <div class="ideas-grid">
            <article
              v-for="idea in store.ideas"
              :key="idea.id"
              class="idea-card"
              :class="{
                'idea-card--approved': idea.status === 'approved' || idea.status === 'completed',
                'idea-card--rejected': idea.status === 'rejected',
                'idea-card--producing': idea.status === 'producing',
              }"
            >
              <div class="idea-card__top">
                <span class="idea-card__category-badge">
                  {{ idea.format || idea.platform || 'IDEA' }}
                </span>
                <span class="material-symbols-outlined idea-card__open-icon">open_in_new</span>
              </div>
              <h4 class="idea-card__title">{{ idea.angle }}</h4>
              <p class="idea-card__body">{{ idea.description || `${idea.platform} · ${idea.format}` }}</p>

              <div class="idea-card__actions">
                <button
                  class="idea-card__btn idea-card__btn--approve"
                  :disabled="idea.status !== 'proposed'"
                  @click="handleApproveIdea(idea.id)"
                >Approve</button>
                <button
                  class="idea-card__btn idea-card__btn--reject"
                  :disabled="idea.status !== 'proposed'"
                  @click="handleRejectIdea(idea.id)"
                >Reject</button>
              </div>
            </article>

            <!-- Loading placeholder -->
            <div v-if="store.isStreaming || store.ideas.length === 0" class="idea-card idea-card--loading">
              <div class="idea-card-loading__icon">
                <span class="material-symbols-outlined" style="color:#464555;">auto_fix_high</span>
              </div>
              <h4 class="idea-card-loading__title">
                {{ store.isStreaming ? 'Generating ideas...' : 'No ideas yet' }}
              </h4>
              <p class="idea-card-loading__hint">
                {{ store.isStreaming ? 'The AI is analyzing your session' : 'Continue the conversation to generate ideas' }}
              </p>
            </div>
          </div>

          <!-- Session synthesis summary -->
          <div v-if="store.ideas.length > 0" class="session-synthesis">
            <div class="session-synthesis__glow"></div>
            <div class="session-synthesis__content">
              <h3 class="session-synthesis__title">Session Synthesis</h3>
              <p class="session-synthesis__text">
                Your session has been synthesized into actionable idea cards. Review and curate them to build your content strategy.
              </p>
              <div class="session-synthesis__tags">
                <span
                  v-for="tag in synthesisTags"
                  :key="tag"
                  class="session-synthesis__tag"
                >{{ tag }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

    </Transition>

    <!-- Floating status bar (shown in chat state) -->
    <div v-if="store.pageState !== 'recording'" class="status-bar">
      <div class="status-bar__left">
        <span class="status-bar__dot" :class="store.isStreaming ? 'status-bar__dot--active' : 'status-bar__dot--done'"></span>
        <span class="status-bar__label">{{ store.isStreaming ? 'PROCESSING' : 'SYNTHESIZED' }}</span>
      </div>
      <div class="status-bar__divider"></div>
      <div class="status-bar__actions">
        <button class="status-bar__action-btn">
          <span class="material-symbols-outlined" style="font-size:18px;">download</span>
          Export
        </button>
        <button class="status-bar__action-btn">
          <span class="material-symbols-outlined" style="font-size:18px;">share</span>
          Share
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useSessionStore } from '~/stores/session';
import { useVoiceService } from '~/services/voice';
import VoiceRecorder from '~/components/VoiceRecorder.vue';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const store = useSessionStore();
const { transcribeAudio } = useVoiceService();
const isUserRecording = ref(false);
const inputMode = ref<'voice' | 'text'>('voice');
const chatInputText = ref('');

// Timer
const recordingSeconds = ref(0);
let timerInterval: ReturnType<typeof setInterval> | null = null;

const sessionId = computed(() => route.params.id as string);

const orbState = computed<'idle' | 'listening' | 'processing'>(() => {
  if (store.isStreaming) return 'processing';
  if (isUserRecording.value) return 'listening';
  return 'idle';
});

const recordingTime = computed(() => {
  const m = Math.floor(recordingSeconds.value / 60).toString().padStart(2, '0');
  const s = (recordingSeconds.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

const synthesisTags = computed(() => {
  const tags = store.ideas.slice(0, 4).map((i) => i.platform || i.format || i.angle?.split(' ')[0]);
  return [...new Set(tags)].filter(Boolean).slice(0, 4);
});

function handleRecordingChange(recording: boolean) {
  isUserRecording.value = recording;
  if (recording) {
    recordingSeconds.value = 0;
    timerInterval = setInterval(() => { recordingSeconds.value++; }, 1000);
  } else {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
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

async function submitChatInput() {
  if (!chatInputText.value.trim() || store.isStreaming) return;
  const text = chatInputText.value.trim();
  chatInputText.value = '';
  await store.sendMessage(text);
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

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
/* ─── Page wrapper ─── */
.session-page {
  position: relative;
  /* offset the layout padding so we can go full-bleed */
  margin: -2.5rem -2rem;
  height: calc(100vh - 72px);
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ─── Transition ─── */
.layout-fade-enter-active,
.layout-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.layout-fade-enter-from { opacity: 0; transform: translateY(12px); }
.layout-fade-leave-to   { opacity: 0; transform: translateY(-12px); }

/* ══════════════════════════════════════════
   STATE 1 — Recording
══════════════════════════════════════════ */
.recording-state {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(to bottom, #f7f9fb, rgba(226, 223, 255, 0.2));
}

.recording-bg {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.recording-bg--tl {
  top: -10%;
  left: -10%;
  width: 40%;
  padding-top: 40%;
  background: radial-gradient(circle, rgba(53, 37, 205, 0.05) 0%, transparent 70%);
  filter: blur(60px);
}

.recording-bg--br {
  bottom: -10%;
  right: -10%;
  width: 50%;
  padding-top: 50%;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%);
  filter: blur(80px);
}

.recording-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 560px;
  width: 100%;
  padding: 0 1.5rem;
  text-align: center;
}

.recording-title {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #191c1e;
  margin: 0;
}

/* Orb */
.recording-orb-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recording-orb__glow {
  position: absolute;
  inset: 0;
  background: rgba(53, 37, 205, 0.1);
  border-radius: 50%;
  filter: blur(60px);
  transform: scale(1.5);
  animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

.recording-orb {
  position: relative;
  width: 256px;
  height: 256px;
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
}

.recording-orb--listening {
  animation: fluid-shift 3s ease infinite, orb-pulse 1s ease infinite;
}

.recording-orb--processing {
  animation: fluid-shift 5s ease infinite;
}

.recording-orb__overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05);
  mix-blend-mode: overlay;
}

.recording-orb__center {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
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

/* Timer */
.recording-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.recording-timer__time {
  font-family: 'Manrope', sans-serif;
  font-size: 2.5rem;
  font-weight: 300;
  letter-spacing: 0.15em;
  color: #3525cd;
}

.recording-timer__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #464555;
}

/* Mode toggle */
.recording-mode-toggle {
  display: flex;
  justify-content: center;
}

.recording-mode-toggle__track {
  display: flex;
  padding: 4px;
  background: #e6e8ea;
  border-radius: 9999px;
  gap: 3px;
}

.recording-mode-toggle__btn {
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

.recording-mode-toggle__btn--active {
  background: #3525cd;
  color: #fff;
  box-shadow: 0 2px 8px rgba(53, 37, 205, 0.25);
}

.recording-input {
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: center;
}

/* Stop button */
.recording-stop-wrap {
  display: flex;
  justify-content: center;
}

.recording-stop-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 1.0625rem;
  font-weight: 700;
  box-shadow: 0 20px 40px rgba(53, 37, 205, 0.3);
  transition: all 0.2s;
}

.recording-stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 48px rgba(53, 37, 205, 0.4);
}

.recording-stop-btn:active {
  transform: scale(0.97);
}

/* ══════════════════════════════════════════
   STATE 2 — Chat / workspace
══════════════════════════════════════════ */
.chat-state {
  display: grid;
  grid-template-columns: 2fr 3fr;
  height: 100%;
  background: #f7f9fb;
}

@media (max-width: 900px) {
  .chat-state {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
  }
}

/* ─── Transcript panel ─── */
.transcript-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid rgba(199, 196, 216, 0.3);
  background: #fff;
  overflow: hidden;
}

.transcript-panel__header {
  padding: 1.5rem 1.5rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  border-bottom: 1px solid #f1f1f1;
}

.transcript-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #464555;
  margin: 0;
}

.transcript-panel__badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #464555;
  background: #e6e8ea;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
}

.transcript-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  scroll-behavior: smooth;
}

.transcript-messages::-webkit-scrollbar { width: 4px; }
.transcript-messages::-webkit-scrollbar-track { background: transparent; }
.transcript-messages::-webkit-scrollbar-thumb { background: #e2dfff; border-radius: 10px; }

.transcript-msg {
  display: flex;
  gap: 0.75rem;
}

.transcript-msg__avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transcript-msg__avatar--user {
  background: #e6e8ea;
  color: #464555;
}

.transcript-msg__avatar--ai {
  background: #e2dfff;
  color: #3525cd;
}

.transcript-msg__body {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.transcript-msg__label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.transcript-msg__label--user { color: #464555; }
.transcript-msg__label--ai   { color: #3525cd; }

.transcript-msg__bubble {
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #191c1e;
}

.transcript-msg__bubble--user {
  background: #f7f9fb;
  border: 1px solid rgba(199, 196, 216, 0.15);
  border-top-left-radius: 2px;
}

.transcript-msg__bubble--ai {
  background: rgba(226, 223, 255, 0.3);
  border: 1px solid rgba(53, 37, 205, 0.08);
  border-top-left-radius: 2px;
  font-style: italic;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: #3525cd;
}

@keyframes blink { 50% { opacity: 0; } }

/* Chat input */
.transcript-input {
  flex-shrink: 0;
  margin: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(199, 196, 216, 0.25);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.04);
}

.transcript-input__mic {
  color: #464555;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.25rem;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s;
}

.transcript-input__mic:hover {
  color: #3525cd;
  background: rgba(53, 37, 205, 0.07);
}

.transcript-input__field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: #191c1e;
  font-family: 'Inter', sans-serif;
}

.transcript-input__field::placeholder {
  color: rgba(70, 69, 85, 0.4);
}

.transcript-input__send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: #3525cd;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.25);
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}

.transcript-input__send:hover:not(:disabled) {
  transform: scale(1.06);
  box-shadow: 0 6px 16px rgba(53, 37, 205, 0.35);
}

.transcript-input__send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ─── Workspace panel ─── */
.workspace-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 1.5rem;
  gap: 1.5rem;
}

.workspace-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.workspace-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
}

/* Ideas grid */
.ideas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.25rem;
}

.ideas-grid::-webkit-scrollbar { width: 4px; }
.ideas-grid::-webkit-scrollbar-track { background: transparent; }
.ideas-grid::-webkit-scrollbar-thumb { background: #e2dfff; border-radius: 10px; }

.idea-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.05);
  border: 1px solid rgba(199, 196, 216, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.idea-card:hover {
  border-color: rgba(199, 196, 216, 0.4);
  box-shadow: 0 8px 24px rgba(25, 28, 30, 0.08);
}

.idea-card--approved {
  border-color: rgba(0, 106, 97, 0.3);
  background: rgba(134, 242, 228, 0.07);
}

.idea-card--rejected {
  opacity: 0.45;
  pointer-events: none;
}

.idea-card--producing {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(255, 251, 235, 0.5);
}

.idea-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.idea-card__category-badge {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #e2dfff;
  color: #3525cd;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
}

.idea-card__open-icon {
  font-size: 18px !important;
  color: #464555;
  opacity: 0;
  transition: opacity 0.15s;
}

.idea-card:hover .idea-card__open-icon {
  opacity: 1;
}

.idea-card__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #191c1e;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 0;
}

.idea-card__body {
  font-size: 0.8125rem;
  color: #464555;
  line-height: 1.65;
  flex: 1;
  margin: 0;
}

.idea-card__actions {
  display: flex;
  gap: 0.625rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eceef0;
}

.idea-card__btn {
  flex: 1;
  padding: 0.5625rem 0;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 700;
  transition: all 0.15s;
}

.idea-card__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.idea-card__btn--approve {
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #fff;
  box-shadow: 0 2px 8px rgba(53, 37, 205, 0.2);
}

.idea-card__btn--approve:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.3);
  transform: translateY(-1px);
}

.idea-card__btn--reject {
  background: #e6e8ea;
  color: #464555;
}

.idea-card__btn--reject:hover:not(:disabled) {
  background: #d8dadc;
}

/* Loading placeholder card */
.idea-card--loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  background: #f2f4f6;
  border: 2px dashed rgba(199, 196, 216, 0.4);
  box-shadow: none;
  text-align: center;
}

.idea-card-loading__icon {
  width: 48px;
  height: 48px;
  background: #e6e8ea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.idea-card-loading__title {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0 0 0.25rem;
}

.idea-card-loading__hint {
  font-size: 0.8125rem;
  color: #464555;
  margin: 0;
}

/* Session synthesis */
.session-synthesis {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 1.75rem;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
}

.session-synthesis__glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: rgba(53, 37, 205, 0.1);
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
}

.session-synthesis__content {
  position: relative;
  z-index: 1;
}

.session-synthesis__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0 0 0.5rem;
}

.session-synthesis__text {
  font-size: 0.875rem;
  color: #464555;
  line-height: 1.65;
  margin: 0 0 1rem;
}

.session-synthesis__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.session-synthesis__tag {
  padding: 0.3125rem 0.875rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(199, 196, 216, 0.25);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #191c1e;
}

/* ─── Error ─── */
.session-error {
  color: #ba1a1a;
  font-size: 0.8125rem;
  padding: 0.5rem 0.875rem;
  background: rgba(186, 26, 26, 0.06);
  border-radius: 8px;
  text-align: center;
}

.session-error--inline {
  text-align: left;
}

/* ─── Status bar ─── */
.status-bar {
  position: fixed;
  bottom: 1.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 9999px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}

.status-bar__left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-bar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-bar__dot--done   { background: #22c55e; animation: pulse-dot 2s infinite; }
.status-bar__dot--active { background: #f59e0b; animation: pulse-dot 1s infinite; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.status-bar__label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #464555;
}

.status-bar__divider {
  width: 1px;
  height: 16px;
  background: #c7c4d8;
}

.status-bar__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-bar__action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 700;
  color: #191c1e;
  padding: 0;
  transition: color 0.15s;
}

.status-bar__action-btn:hover {
  color: #3525cd;
}
</style>
