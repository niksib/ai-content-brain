<template>
  <div class="onboarding-page">

    <!-- ── Progress bar (quiz phase only) ── -->
    <header v-if="store.phase === 'quiz'" class="onboarding-header">
      <div class="onboarding-header__inner">
        <span class="onboarding-header__label">Step {{ store.quizSection + 1 }} of 7</span>
        <div class="onboarding-progress">
          <div class="onboarding-progress__fill" :style="{ width: `${((store.quizSection + 1) / 7) * 100}%` }"></div>
        </div>
      </div>
    </header>

    <main class="onboarding-main">

      <!-- ════════════════════════════════════
           QUIZ PHASE — sections 0-5
      ════════════════════════════════════ -->
      <Transition name="slide" mode="out-in">
        <div v-if="store.phase === 'quiz'" :key="store.quizSection" class="quiz-card">

          <!-- Section 0 — Platforms -->
          <template v-if="store.quizSection === 0">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Platforms</p>
              <h2 class="quiz-card__question">Which platforms are you active on or planning to post on?</h2>
            </div>
            <div class="quiz-options quiz-options--wrap">
              <button
                v-for="p in PLATFORMS"
                :key="p"
                class="quiz-chip"
                :class="{ 'quiz-chip--selected': store.quiz.platforms.includes(p) }"
                @click="toggleMulti(store.quiz.platforms, p)"
              >{{ p }}</button>
            </div>
          </template>

          <!-- Section 1 — Stage -->
          <template v-else-if="store.quizSection === 1">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Creator Stage</p>
              <h2 class="quiz-card__question">Where are you in your creator journey?</h2>
            </div>
            <div class="quiz-options quiz-options--column">
              <button
                v-for="s in STAGES"
                :key="s.value"
                class="quiz-option-card"
                :class="{ 'quiz-option-card--selected': store.quiz.stage === s.value }"
                @click="store.quiz.stage = s.value"
              >
                <span class="quiz-option-card__label">{{ s.label }}</span>
                <span class="quiz-option-card__sub">{{ s.sub }}</span>
              </button>
            </div>
          </template>

          <!-- Section 2 — Topics -->
          <template v-else-if="store.quizSection === 2">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Content Topics</p>
              <h2 class="quiz-card__question">What do you mainly create content about? <span class="quiz-card__question-note">Pick up to 3.</span></h2>
            </div>
            <div class="quiz-options quiz-options--wrap">
              <button
                v-for="t in TOPICS"
                :key="t"
                class="quiz-chip"
                :class="{
                  'quiz-chip--selected': store.quiz.topics.includes(t),
                  'quiz-chip--disabled': !store.quiz.topics.includes(t) && store.quiz.topics.filter(x => x !== 'other').length >= 3
                }"
                @click="toggleTopic(t)"
              >{{ t }}</button>
            </div>
            <div v-if="store.quiz.topics.includes('other')" class="quiz-text-field quiz-text-field--sm">
              <input
                v-model="store.quiz.topicOther"
                class="quiz-text-field__input"
                type="text"
                placeholder="Describe your niche in a few words"
                maxlength="80"
              />
            </div>
          </template>

          <!-- Section 3 — Audience -->
          <template v-else-if="store.quizSection === 3">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Your Audience</p>
              <h2 class="quiz-card__question">When you write a post — who are you writing it for?</h2>
              <p class="quiz-card__subtext">Describe one specific person.</p>
            </div>
            <div class="quiz-text-field">
              <textarea
                v-model="store.quiz.audience"
                class="quiz-text-field__textarea"
                placeholder="e.g. A developer who wants to launch their own product but doesn't know where to start"
                rows="3"
              />
            </div>
            <p class="quiz-helper">Don't overthink this. Just picture one real person who would stop scrolling and think "this post is for me."</p>
          </template>

          <!-- Section 4 — Goal -->
          <template v-else-if="store.quizSection === 4">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Content Goal</p>
              <h2 class="quiz-card__question">What is your main goal with content right now?</h2>
            </div>
            <div class="quiz-options quiz-options--column">
              <button
                v-for="g in GOALS"
                :key="g"
                class="quiz-option-card"
                :class="{ 'quiz-option-card--selected': store.quiz.goal === g }"
                @click="store.quiz.goal = g"
              >
                <span class="quiz-option-card__label">{{ g }}</span>
              </button>
            </div>
          </template>

          <!-- Section 5 — Content Language -->
          <template v-else-if="store.quizSection === 5">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Content Language</p>
              <h2 class="quiz-card__question">What language do you write your content in?</h2>
            </div>
            <div class="quiz-options quiz-options--wrap">
              <button
                v-for="lang in LANGUAGES"
                :key="lang"
                class="quiz-chip"
                :class="{ 'quiz-chip--selected': store.quiz.contentLanguage === lang }"
                @click="store.quiz.contentLanguage = lang"
              >{{ lang }}</button>
            </div>
          </template>

          <!-- Section 6 — Tone of Voice -->
          <template v-else-if="store.quizSection === 6">
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">Tone of Voice</p>
              <h2 class="quiz-card__question">How would you describe your communication style? <span class="quiz-card__question-note">Pick all that apply.</span></h2>
            </div>
            <div class="quiz-options quiz-options--wrap">
              <button
                v-for="t in TONE_STYLES"
                :key="t"
                class="quiz-chip"
                :class="{ 'quiz-chip--selected': store.quiz.toneStyles.includes(t) }"
                @click="toggleMulti(store.quiz.toneStyles, t)"
              >{{ t }}</button>
            </div>
            <div class="quiz-divider"></div>
            <div class="quiz-card__header">
              <p class="quiz-card__eyebrow">One more thing</p>
              <p class="quiz-card__question quiz-card__question--sm">How would you explain what you do to a stranger at a coffee shop?</p>
            </div>
            <div class="quiz-text-field">
              <textarea
                v-model="store.quiz.toneExample"
                class="quiz-text-field__textarea"
                placeholder="Just type naturally — this helps us write in your voice, not ours"
                rows="3"
              />
            </div>
          </template>

          <!-- Error -->
          <p v-if="store.error" class="quiz-error">{{ store.error }}</p>

          <!-- Navigation -->
          <div class="quiz-nav">
            <button
              class="quiz-nav__back"
              :disabled="store.quizSection === 0"
              @click="store.prevSection()"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Back
            </button>
            <button
              class="quiz-nav__continue"
              :disabled="!store.sectionValid"
              @click="store.nextSection()"
            >
              {{ store.quizSection === 6 ? 'Finish' : 'Continue' }}
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        <!-- ════════════════════════════════════
             PROCESSING PHASE
        ════════════════════════════════════ -->
        <div v-else-if="store.phase === 'processing'" key="processing" class="processing-state">
          <div class="onboarding-orb-wrap">
            <div class="onboarding-orb__glow"></div>
            <div class="onboarding-orb onboarding-orb--processing">
              <div class="onboarding-orb__overlay"></div>
              <div class="onboarding-orb__content">
                <span class="material-symbols-outlined orb-icon" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">auto_awesome</span>
                <span class="orb-hint">Building your profile</span>
              </div>
            </div>
          </div>
          <p class="processing-label">This takes a few seconds…</p>
        </div>

        <!-- ════════════════════════════════════
             FOLLOW-UP PHASE
        ════════════════════════════════════ -->
        <div v-else-if="store.phase === 'followup'" key="followup" class="quiz-card">
          <div class="quiz-card__header">
            <p class="quiz-card__eyebrow">A couple more things</p>
            <h2 class="quiz-card__question quiz-card__question--sm">{{ store.currentFollowUpQuestion }}</h2>
          </div>
          <div class="quiz-text-field">
            <textarea
              v-model="followUpInput"
              class="quiz-text-field__textarea"
              placeholder="Type your answer…"
              rows="4"
              @keydown.enter.meta.exact.prevent="submitFollowUp"
              @keydown.enter.ctrl.exact.prevent="submitFollowUp"
            />
          </div>
          <p v-if="store.followUpQuestions.length > 1" class="quiz-helper">
            Question {{ store.followUpIndex + 1 }} of {{ store.followUpQuestions.length }}
          </p>
          <div class="quiz-nav quiz-nav--right">
            <button
              class="quiz-nav__continue"
              :disabled="!followUpInput.trim()"
              @click="submitFollowUp"
            >
              {{ store.isLastFollowUp ? 'Submit' : 'Next' }}
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </Transition>
    </main>

    <div class="onboarding-bg onboarding-bg--tr"></div>
    <div class="onboarding-bg onboarding-bg--bl"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useOnboardingStore } from '~/stores/onboarding';

definePageMeta({ layout: false });

const store = useOnboardingStore();
const router = useRouter();
const followUpInput = ref('');

// ── Static data ──────────────────────────────────────────
const PLATFORMS = ['Threads', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube / Shorts', 'X (Twitter)'];

const STAGES = [
  { value: 'Just starting (0–1K followers)', label: 'Just starting out', sub: '0–1K followers' },
  { value: 'Growing (1K–50K followers)',     label: 'Growing',           sub: '1K–50K followers' },
  { value: 'Established (50K+ followers)',   label: 'Established',       sub: '50K+ followers' },
];

const TOPICS = [
  'Tech / Software / AI',
  'Business / Entrepreneurship',
  'Personal Finance',
  'Real Estate / Investing',
  'Health & Fitness',
  'Mental Health / Mindfulness',
  'Food & Cooking',
  'Travel',
  'Beauty / Fashion',
  'Sports / Gaming',
  'Parenting / Family',
  'Lifestyle / Personal Brand',
  'Education / Coaching',
  'Marketing / Social Media',
  'Creative (design, art, music)',
  'Other',
];

const GOALS = [
  'Build an audience and grow followers',
  'Get clients or customers',
  'Build authority in my niche',
  'Document my journey / share my story',
  'All of the above',
];

const LANGUAGES = ['Russian', 'English', 'Ukrainian', 'Spanish', 'German', 'French', 'Other'];

const TONE_STYLES = [
  'Casual and conversational',
  'Direct and no-nonsense',
  'Educational and informative',
  'Inspirational and motivating',
  'Humorous and entertaining',
  'Vulnerable and personal',
  'Professional and formal',
];

// ── Helpers ──────────────────────────────────────────────
function toggleMulti(arr: string[], value: string) {
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
}

function toggleTopic(topic: string) {
  const normalTopics = store.quiz.topics.filter((t) => t !== 'other');
  const isSelected = store.quiz.topics.includes(topic);

  if (isSelected) {
    toggleMulti(store.quiz.topics, topic);
  } else {
    // Max 3 non-"other" topics
    if (topic !== 'Other' && normalTopics.length >= 3) return;
    toggleMulti(store.quiz.topics, topic === 'Other' ? 'other' : topic);
  }
}

async function submitFollowUp() {
  const answer = followUpInput.value.trim();
  if (!answer) return;
  followUpInput.value = '';
  await store.submitFollowUpAnswer(answer);
}

watch(() => store.phase, (phase) => {
  if (phase === 'complete') router.push('/dashboard');
});

onMounted(async () => {
  try {
    const status = await store.checkStatus();
    if (status.completed) router.push('/dashboard');
  } catch {}
});
</script>

<style scoped>
/* ─── Page ─── */
.onboarding-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  background: radial-gradient(circle at top right, #e2dfff 0%, #f7f9fb 40%, #ffffff 100%);
  font-family: 'Inter', sans-serif;
}

.onboarding-bg {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.onboarding-bg--tr {
  top: -10%; right: -10%;
  width: 40%; padding-top: 40%;
  background: radial-gradient(circle, rgba(53,37,205,0.05) 0%, transparent 70%);
}
.onboarding-bg--bl {
  bottom: -10%; left: -10%;
  width: 50%; padding-top: 50%;
  background: radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 70%);
}

/* ─── Header ─── */
.onboarding-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.onboarding-header__inner {
  width: 100%;
  max-width: 560px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.onboarding-header__label {
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(53,37,205,0.6);
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
  transition: width 0.4s ease;
  box-shadow: 0 0 8px rgba(79,70,229,0.4);
}

/* ─── Main ─── */
.onboarding-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 1.25rem 3rem;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* ─── Quiz card ─── */
.quiz-card {
  width: 100%;
  max-width: 560px;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 28px;
  padding: 2.25rem 2rem 2rem;
  box-shadow: 0 20px 60px rgba(53,37,205,0.07), 0 4px 16px rgba(25,28,30,0.05);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.quiz-card__header { display: flex; flex-direction: column; gap: 0.5rem; }
.quiz-card__eyebrow {
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(53,37,205,0.6);
  margin: 0;
}
.quiz-card__question {
  font-family: 'Manrope', sans-serif;
  font-size: 1.375rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #191c1e;
  margin: 0;
  line-height: 1.3;
}
.quiz-card__question--sm { font-size: 1.125rem; }
.quiz-card__question-note {
  font-size: 0.875rem;
  font-weight: 500;
  color: #777587;
}
.quiz-card__subtext {
  font-size: 0.875rem;
  color: #464555;
  margin: 0;
}

/* ─── Options ─── */
.quiz-options { display: flex; gap: 0.5rem; }
.quiz-options--wrap { flex-wrap: wrap; }
.quiz-options--column { flex-direction: column; }

/* Chip (multi-select pill) */
.quiz-chip {
  padding: 0.5rem 1.125rem;
  border-radius: 9999px;
  border: 1.5px solid #e0e2e5;
  background: #f4f6f8;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #464555;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.quiz-chip:hover:not(:disabled):not(.quiz-chip--disabled) {
  border-color: #3525cd;
  color: #3525cd;
  background: rgba(53,37,205,0.05);
}
.quiz-chip--selected {
  background: #3525cd;
  border-color: #3525cd;
  color: #fff;
}
.quiz-chip--disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* Option card (single-select) */
.quiz-option-card {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.875rem 1.125rem;
  border-radius: 14px;
  border: 1.5px solid #e0e2e5;
  background: #f4f6f8;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.quiz-option-card:hover:not(:disabled) {
  border-color: #3525cd;
  background: rgba(53,37,205,0.04);
}
.quiz-option-card--selected {
  border-color: #3525cd;
  background: rgba(53,37,205,0.07);
}
.quiz-option-card__label {
  font-family: 'Inter', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #191c1e;
}
.quiz-option-card--selected .quiz-option-card__label { color: #3525cd; }
.quiz-option-card__sub {
  font-size: 0.8125rem;
  color: #777587;
}

/* ─── Text field ─── */
.quiz-text-field {}
.quiz-text-field--sm {}
.quiz-text-field__input,
.quiz-text-field__textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #f4f6f8;
  border: 1.5px solid transparent;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 0.9375rem;
  color: #191c1e;
  outline: none;
  resize: none;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  line-height: 1.6;
}
.quiz-text-field__input:focus,
.quiz-text-field__textarea:focus {
  background: #fff;
  border-color: #3525cd;
  box-shadow: 0 0 0 3px rgba(53,37,205,0.1);
}
.quiz-text-field__input::placeholder,
.quiz-text-field__textarea::placeholder { color: #a09faf; }

/* ─── Helper text ─── */
.quiz-helper {
  font-size: 0.8125rem;
  color: #777587;
  line-height: 1.5;
  margin: 0;
}

/* ─── Divider ─── */
.quiz-divider {
  height: 1px;
  background: rgba(199,196,216,0.3);
}

/* ─── Error ─── */
.quiz-error {
  font-size: 0.8125rem;
  color: #ba1a1a;
  background: rgba(186,26,26,0.06);
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  margin: 0;
}

/* ─── Navigation ─── */
.quiz-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}
.quiz-nav--right { justify-content: flex-end; }

.quiz-nav__back {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #777587;
  transition: color 0.15s;
}
.quiz-nav__back:hover:not(:disabled) { color: #3525cd; }
.quiz-nav__back:disabled { opacity: 0.3; cursor: not-allowed; }

.quiz-nav__continue {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 9999px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(53,37,205,0.25);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}
.quiz-nav__continue:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(53,37,205,0.32);
}
.quiz-nav__continue:active:not(:disabled) { transform: translateY(0); }
.quiz-nav__continue:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

/* ─── Processing orb ─── */
.processing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}
.processing-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #777587;
  letter-spacing: 0.04em;
  margin: 0;
}
.onboarding-orb-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.onboarding-orb__glow {
  position: absolute;
  inset: 0;
  background: rgba(53,37,205,0.1);
  border-radius: 50%;
  filter: blur(60px);
  transform: scale(1.5);
  animation: pulse-slow 4s cubic-bezier(0.4,0,0.6,1) infinite;
  pointer-events: none;
}
.onboarding-orb {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255,255,255,0.5);
  box-shadow: 0 25px 50px rgba(0,0,0,0.15);
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  background-size: 400% 400%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.onboarding-orb--processing { animation: fluid-shift 5s ease infinite; opacity: 0.9; }
.onboarding-orb__overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.05);
  mix-blend-mode: overlay;
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
.orb-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.8);
}

/* ─── Transitions ─── */
.slide-enter-active,
.slide-leave-active { transition: all 0.25s ease; }
.slide-enter-from { opacity: 0; transform: translateX(24px); }
.slide-leave-to   { opacity: 0; transform: translateX(-24px); }

@keyframes fluid-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.6; transform: scale(1.5); }
  50%       { opacity: 1;   transform: scale(1.7); }
}
</style>
