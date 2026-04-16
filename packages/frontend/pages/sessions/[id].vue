<template>
  <div class="session-page">
    <Transition name="layout-fade" mode="out-in">

      <!-- ══════════════════════════════════════════
           STATE 0 — Initializing (prevents recording flash)
      ══════════════════════════════════════════ -->
      <div v-if="isInitializing" key="initializing" class="recording-state">
        <div class="recording-container">
          <div class="session-init-spinner"></div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════
           STATE 1 — Recording / session start
      ══════════════════════════════════════════ -->
      <div v-else-if="store.pageState === 'recording'" key="recording" class="recording-state">
        <!-- Background blobs -->
        <div class="recording-bg recording-bg--tl"></div>
        <div class="recording-bg recording-bg--br"></div>

        <div class="recording-container">
          <h1 class="recording-title">What's on your mind?</h1>
          <p class="recording-subtitle">Just talk - ideas, thoughts, observations, whatever's been floating around. No need to structure anything. Raw is good.</p>

          <p v-if="store.streamError" class="session-error">{{ store.streamError }}</p>

          <OrbRecorder
            :disabled="store.isStreaming"
            :external-state="store.isStreaming ? 'processing' : 'idle'"
            @transcribed="handleSubmit"
            @submit="handleSubmit"
            @recording="isUserRecording = $event"
          />
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

          <div ref="messagesContainerRef" class="transcript-messages">
            <template v-for="msg in store.messages" :key="msg.id">
              <!-- User message -->
              <div v-if="msg.role === 'user'" class="transcript-msg transcript-msg--user">
                <div class="transcript-msg__avatar transcript-msg__avatar--user">
                  <span class="material-symbols-outlined" style="font-size:14px;">person</span>
                </div>
                <div class="transcript-msg__body">
                  <span class="transcript-msg__label transcript-msg__label--user">You</span>
                  <!-- Reply context: idea this message belongs to -->
                  <div v-if="msg.contentIdeaId" class="transcript-msg__reply-context">
                    <span class="material-symbols-outlined" style="font-size:11px;">reply</span>
                    {{ ideaAngle(msg.contentIdeaId) }}
                  </div>
                  <div
                    class="transcript-msg__bubble transcript-msg__bubble--user"
                    v-html="renderMarkdown(stripSystemContext(msg.content))"
                  ></div>
                </div>
              </div>

              <!-- AI message -->
              <div v-else class="transcript-msg transcript-msg--ai">
                <div
                  class="transcript-msg__avatar"
                  :class="msg.contentIdeaId ? `transcript-msg__avatar--${ideaPlatform(msg.contentIdeaId)}` : 'transcript-msg__avatar--strategist'"
                >
                  <PlatformIcon v-if="msg.contentIdeaId && ideaPlatform(msg.contentIdeaId)" :platform="ideaPlatform(msg.contentIdeaId)!" />
                  <span v-else class="material-symbols-outlined" style="font-size:14px;">psychology</span>
                </div>
                <div class="transcript-msg__body">
                  <span class="transcript-msg__label transcript-msg__label--ai">
                    {{ msg.contentIdeaId ? agentNameForIdea(msg.contentIdeaId) : 'Content Strategist' }}
                  </span>
                  <div
                    class="transcript-msg__bubble transcript-msg__bubble--ai"
                    v-html="renderMarkdown(msg.content)"
                  ></div>
                  <span v-if="profileStore.isAdmin && msg.costUsd != null" class="msg-cost">
                    ${{ msg.costUsd.toFixed(2) }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Thinking indicator (streaming but no tokens yet) -->
            <div v-if="store.isStreaming && !store.streamTokens" class="transcript-msg transcript-msg--ai">
              <div
                class="transcript-msg__avatar"
                :class="activeAgent.platform ? `transcript-msg__avatar--${activeAgent.platform}` : 'transcript-msg__avatar--strategist'"
              >
                <PlatformIcon v-if="activeAgent.platform" :platform="activeAgent.platform" />
                <span v-else class="material-symbols-outlined" style="font-size:14px;">psychology</span>
              </div>
              <div class="transcript-msg__body">
                <span class="transcript-msg__label transcript-msg__label--ai">{{ activeAgent.name }}</span>
                <div class="transcript-msg__bubble transcript-msg__bubble--ai thinking-bubble">
                  <span class="thinking-dots">
                    <span></span><span></span><span></span>
                  </span>
                  <span class="thinking-phrase">{{ thinkingPhrase }}</span>
                </div>
              </div>
            </div>

            <!-- Streaming tokens in progress -->
            <div v-if="store.isStreaming && store.streamTokens" class="transcript-msg transcript-msg--ai">
              <div
                class="transcript-msg__avatar"
                :class="activeAgent.platform ? `transcript-msg__avatar--${activeAgent.platform}` : 'transcript-msg__avatar--strategist'"
              >
                <PlatformIcon v-if="activeAgent.platform" :platform="activeAgent.platform" />
                <span v-else class="material-symbols-outlined" style="font-size:14px;">psychology</span>
              </div>
              <div class="transcript-msg__body">
                <span class="transcript-msg__label transcript-msg__label--ai">{{ activeAgent.name }}</span>
                <div class="transcript-msg__bubble transcript-msg__bubble--ai">
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span v-html="renderMarkdown(store.streamTokens ?? '')"></span><span class="cursor-blink">|</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Active agent indicator -->
          <div class="agent-indicator">
            <div
              class="agent-indicator__avatar"
              :class="activeAgent.platform ? `agent-indicator__avatar--${activeAgent.platform}` : 'agent-indicator__avatar--strategist'"
            >
              <PlatformIcon v-if="activeAgent.platform" :platform="activeAgent.platform" />
              <span v-else class="material-symbols-outlined" style="font-size:13px;">{{ activeAgent.icon }}</span>
            </div>
            <span class="agent-indicator__name">{{ activeAgent.name }}</span>
          </div>

          <!-- Chat input -->
          <div class="transcript-input">
            <button
              class="transcript-input__mic"
              :class="{ 'transcript-input__mic--recording': isMicRecording }"
              title="Voice input"
              @click="toggleMicRecording"
            >
              <span class="material-symbols-outlined" style="font-size:20px;">
                {{ isMicRecording ? 'stop_circle' : 'mic' }}
              </span>
            </button>
            <textarea
              ref="chatInputEl"
              v-model="chatInputText"
              class="transcript-input__field"
              placeholder="Add a thought or request..."
              rows="1"
              @input="autoResizeChatInput"
              @keydown.enter.exact.prevent="submitChatInput"
              @keydown.enter.shift.exact="onShiftEnter"
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

          <!-- Idea detail view -->
          <div v-if="store.selectedIdeaId" class="workspace-detail">
            <IdeaPage
              :idea-id="store.selectedIdeaId"
              @back="store.selectedIdeaId = null"
              @approve="handleApproveIdea"
              @reject="handleRejectIdea"
            />
          </div>

          <template v-else>
          <div class="workspace-panel__header">
            <h3 class="workspace-panel__title">
              <span class="material-symbols-outlined" style="font-size:20px;color:#3525cd;">lightbulb</span>
              Idea Cards
            </h3>
            <div class="workspace-panel__actions">
              <span v-if="store.streamError" class="session-error session-error--inline">{{ store.streamError }}</span>
              <button
                v-if="profileStore.isAdmin"
                class="reset-btn"
                title="Reset session"
                :disabled="store.isStreaming"
                @click="handleResetSession"
              >
                <span class="material-symbols-outlined" style="font-size:16px;">delete_sweep</span>
                Reset
              </button>
            </div>
          </div>

          <!-- Empty state — nothing generated yet -->
          <div v-if="store.ideas.length === 0 && skeletonCount === 0" class="workspace-empty">
            <div class="workspace-empty__icon">
              <span class="material-symbols-outlined">auto_awesome</span>
            </div>
            <h4 class="workspace-empty__title">Ideas will appear here</h4>
            <p class="workspace-empty__hint">
              Share what you've been up to — the AI will extract content ideas and populate this panel in real time.
            </p>
            <div class="workspace-empty__dots">
              <span></span><span></span><span></span>
            </div>
          </div>

          <!-- Idea grid -->
          <div v-else class="ideas-grid">
            <!-- Unified idea cards -->
            <ContentIdeaCard
              v-for="idea in store.ideas"
              :key="idea.id"
              :idea-id="idea.id"
              :platform="(idea.platform as any)"
              :format="idea.format"
              :angle="idea.angle"
              :description="idea.description"
              :status="idea.status"
              :publish-status="idea.publishStatus"
              :avatar-url="idea.platform === 'threads' ? (threadsAccount?.profilePictureUrl ?? null) : null"
              :username="idea.platform === 'threads' ? (threadsAccount?.username ?? null) : null"
              :is-updating="store.recentlyUpdatedIdeaIds.has(idea.id)"
              variant="session"
              @select="store.selectedIdeaId = $event"
              @approve="handleApproveIdea"
              @reject="handleRejectIdea"
              @seen="store.clearUpdatedIdea($event)"
            />

            <!-- Skeleton cards — pendingIdeas is high-water mark, skeletons = pending - arrived -->
            <div
              v-for="n in skeletonCount"
              :key="`skeleton-${n}`"
              class="idea-card-skeleton"
            >
              <div class="idea-card-skeleton__header">
                <span class="skeleton-block skeleton-block--avatar"></span>
                <div class="idea-card-skeleton__identity">
                  <span class="skeleton-block skeleton-block--name"></span>
                  <span class="skeleton-block skeleton-block--meta"></span>
                </div>
              </div>
              <span class="skeleton-block skeleton-block--title"></span>
              <span class="skeleton-block skeleton-block--body"></span>
              <span class="skeleton-block skeleton-block--body skeleton-block--body-short"></span>
              <div class="idea-card-skeleton__footer">
                <span class="skeleton-block skeleton-block--btn"></span>
                <span class="skeleton-block skeleton-block--btn"></span>
              </div>
            </div>
          </div>

          </template>
        </section>
      </div>

    </Transition>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useSessionStore } from '~/stores/session';
import { useProfileStore } from '~/stores/profile';
import OrbRecorder from '~/components/OrbRecorder.vue';
import IdeaPage from '~/components/IdeaPage.vue';
import PlatformIcon from '~/components/PlatformIcon.vue';
import ContentIdeaCard from '~/components/ContentIdeaCard.vue';
import { useMarkdown } from '~/composables/useMarkdown';
import { useVoiceRecorder } from '~/composables/useVoiceRecorder';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const router = useRouter();
const store = useSessionStore();
const profileStore = useProfileStore();

interface ThreadsAccount {
  username: string;
  profilePictureUrl: string | null;
}
const threadsAccount = ref<ThreadsAccount | null>(null);
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;
const { renderMarkdown } = useMarkdown();

function stripSystemContext(content: string): string {
  const start = content.indexOf('[User manually edited the content');
  if (start === -1) return content;
  const end = content.indexOf('}]', start);
  if (end === -1) return content;
  return (content.slice(0, start) + content.slice(end + 2)).replace(/^\n+/, '').trim();
}

// ─── Skeleton count ───
// Driven by activePendingIdeas which uses setTimeout to guarantee
// at least one render frame with skeleton visible before idea replaces it.
const skeletonCount = computed(() => store.pendingIdeasCount);

// ─── Thinking indicator ───
const THINKING_PHRASES = [
  'Thinking...',
  'Loading your profile...',
  'Scanning content history...',
  'Analyzing your dump...',
  'Finding the best angles...',
  'Matching platforms...',
  'Crafting ideas...',
  'Saving to your plan...',
];
const thinkingPhraseIndex = ref(0);
const thinkingPhrase = computed(() => THINKING_PHRASES[thinkingPhraseIndex.value]);
let thinkingTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => store.isStreaming,
  (streaming) => {
    if (streaming) {
      thinkingPhraseIndex.value = 0;
      thinkingTimer = setInterval(() => {
        thinkingPhraseIndex.value = (thinkingPhraseIndex.value + 1) % THINKING_PHRASES.length;
      }, 2000);
    } else {
      if (thinkingTimer) { clearInterval(thinkingTimer); thinkingTimer = null; }
    }
  },
);
onUnmounted(() => { if (thinkingTimer) clearInterval(thinkingTimer); transcriptionAbort?.abort(); });

// ─── Active agent ───
interface AgentInfo {
  name: string;
  platform: 'threads' | 'linkedin' | 'tiktok' | 'instagram' | null;
  icon: string; // material symbol, used when platform is null
}

const PLATFORM_AGENT_NAMES: Record<string, string> = {
  threads: 'Threads Agent',
  linkedin: 'LinkedIn Agent',
  tiktok: 'TikTok Agent',
  instagram: 'Instagram Agent',
};

const activeAgent = computed<AgentInfo>(() => {
  if (!store.selectedIdeaId) {
    return { name: 'Content Strategist', platform: null, icon: 'psychology' };
  }
  const idea = store.ideas.find((i) => i.id === store.selectedIdeaId);
  if (!idea) {
    return { name: 'Content Strategist', platform: null, icon: 'psychology' };
  }
  const platform = idea.platform as AgentInfo['platform'];
  return {
    name: PLATFORM_AGENT_NAMES[idea.platform] ?? `${idea.platform} Agent`,
    platform,
    icon: '',
  };
});

// ─── Platform helpers ───
const PLATFORM_LABELS: Record<string, string> = {
  threads: 'Threads',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};
// ─── Idea context helpers ───
function ideaAngle(ideaId: string): string {
  return store.ideas.find((i) => i.id === ideaId)?.angle ?? '';
}
function ideaPlatform(ideaId: string): AgentInfo['platform'] {
  const idea = store.ideas.find((i) => i.id === ideaId);
  return (idea?.platform ?? null) as AgentInfo['platform'];
}
function agentNameForIdea(ideaId: string): string {
  const idea = store.ideas.find((i) => i.id === ideaId);
  if (!idea) return 'Platform Agent';
  return PLATFORM_AGENT_NAMES[idea.platform] ?? `${idea.platform} Agent`;
}

const isInitializing = ref(true);
const messagesContainerRef = ref<HTMLElement | null>(null);
const isUserRecording = ref(false);
const chatInputText = ref('');
const chatInputEl = ref<HTMLTextAreaElement | null>(null);

const CHAT_INPUT_MAX_HEIGHT = 180;

function autoResizeChatInput(): void {
  const el = chatInputEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, CHAT_INPUT_MAX_HEIGHT)}px`;
}

function onShiftEnter(): void {
  nextTick(autoResizeChatInput);
}

function resetChatInput(): void {
  chatInputText.value = '';
  nextTick(() => {
    if (chatInputEl.value) chatInputEl.value.style.height = 'auto';
  });
}

// ─── Voice recorder (mic button in chat panel) ───
const { isRecording: isMicRecording, audioBlob: micAudioBlob, startRecording: startMicRecording, stopRecording: stopMicRecording } = useVoiceRecorder();

async function toggleMicRecording(): Promise<void> {
  if (isMicRecording.value) {
    stopMicRecording();
  } else {
    await startMicRecording();
  }
}

let transcriptionAbort: AbortController | null = null;

watch(micAudioBlob, async (blob) => {
  if (!blob) return;
  transcriptionAbort?.abort();
  transcriptionAbort = new AbortController();
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  try {
    const response = await $fetch<{ transcript: string }>(`${apiBaseUrl}/api/voice/transcribe`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal: transcriptionAbort.signal,
    });
    const transcript = response.transcript.trim();
    if (!transcript) return;

    // Auto-send voice messages straight from recording — no manual confirmation step
    if (store.isStreaming) {
      // If another response is streaming, fall back to filling the field so the user can send manually
      chatInputText.value = transcript;
      nextTick(autoResizeChatInput);
      return;
    }
    resetChatInput();
    await store.sendMessage(transcript);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    console.warn('[voice] Transcription failed:', err);
  }
});

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
}

const sessionId = computed(() => route.params.id as string);


async function handleSubmit(text: string) {
  await store.sendMessage(text);
}

async function submitChatInput() {
  if (!chatInputText.value.trim() || store.isStreaming) return;
  const text = chatInputText.value.trim();
  resetChatInput();
  await store.sendMessage(text);
}

async function handleApproveIdea(ideaId: string) {
  await store.approveIdea(ideaId);
}

async function handleRejectIdea(ideaId: string) {
  await store.rejectIdea(ideaId);
}

async function handleResetSession() {
  if (!confirm('Delete this session and start fresh?')) return;
  await store.deleteSession();
  router.push('/dashboard');
}

// Scroll when container mounts (handles page refresh — Transition delays DOM availability)
watch(messagesContainerRef, (el) => {
  if (el) scrollToBottom();
});

// Scroll when new messages arrive (user sends / AI responds)
watch(() => store.messages.length, scrollToBottom);

onMounted(async () => {
  try {
    await Promise.all([
      store.createOrLoadSession(sessionId.value),
      profileStore.loadProfile(),
      $fetch<{ account: ThreadsAccount | null }>(`${apiBaseUrl}/api/threads/account`, { credentials: 'include' })
        .then((r) => { threadsAccount.value = r.account; })
        .catch(() => {}),
    ]);
    await Promise.all([store.loadMessages(), store.loadIdeas()]);

    // Open a specific idea if navigated from Publishing page
    const ideaParam = route.query.idea as string | undefined;
    if (ideaParam && store.ideas.some((i) => i.id === ideaParam)) {
      store.selectedIdeaId = ideaParam;
    }
  } catch (error) {
    console.error('Session initialization failed:', error);
  } finally {
    isInitializing.value = false;
  }
});
</script>

<style scoped>
/* ─── Page wrapper ─── */
.session-page {
  position: relative;
  height: 100vh;
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

/* ─── Session init spinner ─── */
.session-init-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(53, 37, 205, 0.15);
  border-top-color: #3525cd;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

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
  max-width: 600px;
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
  margin: 0 0 0.75rem;
  line-height: 1.1;
  margin-bottom: 20px;
}

.recording-subtitle {
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 0.5rem;
  max-width: 420px;
  margin-bottom: 40px;
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

.transcript-msg__avatar--strategist {
  background: #e2dfff;
  color: #3525cd;
}

.transcript-msg__body {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
  /* Allow the body (flex child) to shrink below content size so long words
     inside bubbles wrap instead of forcing horizontal scroll on the parent. */
  min-width: 0;
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
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
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

/* ─── Markdown rendering inside bubbles ─── */
.transcript-msg__bubble :deep(p) {
  margin: 0 0 0.5rem;
}
.transcript-msg__bubble :deep(p:last-child) {
  margin-bottom: 0;
}
.transcript-msg__bubble :deep(strong) {
  font-weight: 700;
  color: inherit;
}
.transcript-msg__bubble :deep(em) {
  font-style: italic;
}
.transcript-msg__bubble :deep(h1),
.transcript-msg__bubble :deep(h2),
.transcript-msg__bubble :deep(h3) {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  margin: 0.75rem 0 0.375rem;
  line-height: 1.3;
  color: #191c1e;
}
.transcript-msg__bubble :deep(h1) { font-size: 1rem; }
.transcript-msg__bubble :deep(h2) { font-size: 0.9375rem; }
.transcript-msg__bubble :deep(h3) { font-size: 0.875rem; }
.transcript-msg__bubble :deep(ul),
.transcript-msg__bubble :deep(ol) {
  margin: 0.375rem 0 0.5rem 1.25rem;
  padding: 0;
}
.transcript-msg__bubble :deep(li) {
  margin-bottom: 0.25rem;
}
.transcript-msg__bubble :deep(hr) {
  border: none;
  border-top: 1px solid rgba(199, 196, 216, 0.3);
  margin: 0.75rem 0;
}
.transcript-msg__bubble :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}
.transcript-msg__bubble--user :deep(code) {
  background: rgba(70, 69, 85, 0.08);
  color: #464555;
}
.transcript-msg__bubble :deep(pre) {
  background: rgba(25, 28, 30, 0.05);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.transcript-msg__bubble :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #191c1e;
}

/* Agent indicator */
.agent-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem 0;
}

.agent-indicator__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  flex-shrink: 0;
}

.agent-indicator__avatar--strategist {
  background: #e2dfff;
  color: #3525cd;
}

.agent-indicator__avatar--threads  { background: #000; }
.agent-indicator__avatar--linkedin { background: #0077b5; }
.agent-indicator__avatar--tiktok   { background: #000; }
.agent-indicator__avatar--instagram {
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%);
}

.agent-indicator__name {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Chat input */
.transcript-input {
  flex-shrink: 0;
  margin: 0.75rem 1rem;
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
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

.transcript-input__mic--recording {
  color: #ef4444;
  animation: mic-pulse 1.5s ease-in-out infinite;
}

@keyframes mic-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
  resize: none;
  line-height: 1.5;
  min-height: 28px;
  max-height: 180px;
  overflow-y: auto;
  padding: 0.25rem 0;
}

.transcript-input__field::placeholder {
  color: rgba(70, 69, 85, 0.4);
}

.transcript-input__field::-webkit-scrollbar {
  width: 3px;
}

.transcript-input__field::-webkit-scrollbar-thumb {
  background: #c7c4d8;
  border-radius: 10px;
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
  grid-template-columns: repeat(2, 1fr);
  align-content: start;
  gap: 1.25rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.25rem;
}

.ideas-grid::-webkit-scrollbar { width: 4px; }
.ideas-grid::-webkit-scrollbar-track { background: transparent; }
.ideas-grid::-webkit-scrollbar-thumb { background: #e2dfff; border-radius: 10px; }

.workspace-detail {
  height: 100%;
  overflow-y: auto;
}

/* ─── Skeleton card ─── */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.idea-card-skeleton {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid rgba(199, 196, 216, 0.15);
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  pointer-events: none;
}

.idea-card-skeleton__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.idea-card-skeleton__identity {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.idea-card-skeleton__footer {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(199, 196, 216, 0.2);
}

.skeleton-block {
  display: block;
  border-radius: 6px;
  background: linear-gradient(90deg, #eceef0 25%, #f5f6f7 50%, #eceef0 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-block--avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.skeleton-block--name {
  width: 90px;
  height: 13px;
}

.skeleton-block--meta {
  width: 60px;
  height: 10px;
}

.skeleton-block--title {
  width: 85%;
  height: 16px;
}

.skeleton-block--body {
  width: 100%;
  height: 12px;
}

.skeleton-block--body-short {
  width: 65%;
}

.skeleton-block--btn {
  flex: 1;
  height: 34px;
  border-radius: 9999px;
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

/* ─── Thinking bubble ─── */
.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-style: normal !important;
}

.thinking-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.thinking-dots span {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3525cd;
  opacity: 0.4;
  animation: thinking-bounce 1.2s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking-bounce {
  0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
  40%            { opacity: 1;   transform: translateY(-4px); }
}

.thinking-phrase {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #464555;
  font-style: italic;
  animation: phrase-fade 0.4s ease;
}

@keyframes phrase-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Workspace empty state ─── */
.workspace-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
  gap: 0.75rem;
}

.workspace-empty__icon {
  width: 64px;
  height: 64px;
  background: rgba(53, 37, 205, 0.07);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.workspace-empty__icon .material-symbols-outlined {
  font-size: 32px !important;
  color: #3525cd;
  opacity: 0.6;
}

.workspace-empty__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
}

.workspace-empty__hint {
  font-size: 0.8125rem;
  color: #464555;
  line-height: 1.6;
  max-width: 280px;
  margin: 0;
  opacity: 0.7;
}

.workspace-empty__dots {
  display: flex;
  gap: 6px;
  margin-top: 0.5rem;
}

.workspace-empty__dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c7c4d8;
  animation: empty-pulse 2s ease-in-out infinite;
}
.workspace-empty__dots span:nth-child(2) { animation-delay: 0.3s; }
.workspace-empty__dots span:nth-child(3) { animation-delay: 0.6s; }

@keyframes empty-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.3); }
}

/* ─── Platform meta row on idea cards ─── */
.idea-card__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}


.idea-card__platform-name {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #464555;
}

.idea-card__format-badge {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: #f2f4f6;
  color: #464555;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
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

.workspace-panel__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.07);
  border: 1px solid rgba(192, 57, 43, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.reset-btn:hover:not(:disabled) {
  background: rgba(192, 57, 43, 0.13);
  border-color: rgba(192, 57, 43, 0.4);
}
.reset-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.msg-cost {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: #9b8fbb;
  letter-spacing: 0.02em;
}

.transcript-msg__reply-context {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: #3525cd;
  opacity: 0.7;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
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
