# Onboarding v2 — Progress Log

Snapshot of the Onboarding v2 epic so work can resume from a fresh session or another machine. Full plan lives at `onboarding-v2.md`; this file only tracks **what is done** and **what's next**.

---

## Done (2026-04-17)

### Planning & design
- Product/UX decisions captured in `onboarding-v2.md` (Phase 1-7 plan).
- Related follow-up epics scoped: `memory-write.md`, `agents-memory-update.md`.
- AI-designer handoff received (HTML prototype at `/tmp/design-package/postrr/` — not committed, lives outside repo).
- Agent persona chosen: **Ori** (shortlist was Ori / Mira / Iris).

### Frontend visual layer (Phase 3 of plan — implemented with mock state)
All new files under `packages/frontend/`:

**Composable**
- `composables/useTypewriter.ts` — typewriter animation for agent bubble.

**Components** (`components/onboarding/`)
- `OnboardingOrb.vue` — 4 states (idle / thinking / speaking / listening), uses the same fluid-gradient visual as the session-start `OrbRecorder` (220px, `#4f46e5 → #8b5cf6 → #c084fc → #e0e7ff`, 4px white border, glow layer).
- `AgentBubble.vue` — speech bubble with typewriter effect, meta label, blinking caret.
- `OnboardingComposer.vue` — textarea + inline voice mic + send. Wired to real `useVoiceRecorder` + `/voice/transcribe` — voice transcription works end-to-end.
- `OnboardingLayout.vue` — 3-zone shell (orb / bubble / interactive) vertically **centered**, ambient radial gradients + grain texture, responsive (mobile 170px orb, desktop 220px).
- `StepIndicator.vue`, `OptionChip.vue` (multi-select), `PrimaryCta.vue`, `NextButton.vue` — atoms.
- `questions.ts` — hardcoded 4-question set with canonical keys (goal / audience / voice_tone / current_focus).

**Step components** (`components/onboarding/steps/`)
- `ConnectStep.vue` — minimal: Connect Threads CTA + "Continue without Threads" link. No preview card (removed).
- `AnalyzingStep.vue` — progressive feed (Looking at your profile → Reading your posts → Working out your rhythm → Picking up how you write), ~7s total, emits `complete`.
- `QuestionStep.vue` — multi-select chips + composer + step indicator + next button.
- `SummaryStep.vue` — hardcoded summary card (4 memory fields) + clarification composer + Save CTA.
- `DoneStep.vue` — spinner, emits complete after 1.8s.
- Fallback steps (created, not yet wired into main flow): `OAuthFailStep.vue`, `EmptyStep.vue`, `ErrorStep.vue`, `ReturningStep.vue`. Only `oauth-fail` reachable today (via "Continue without Threads").

**Page**
- `pages/onboarding.vue` — completely rewritten. Replaces the old 7-step quiz. Local state machine for step transitions; computed orb state / bubble text / bubble meta per step; `navigateTo('/dashboard')` on finish.

### Copy decisions (locked in)
- Agent name: **Ori**. Meta badge shows "Ori" on Connect, "Ori · analyzing" on Analyzing.
- No em-dashes anywhere in UI copy — replaced with commas throughout. Treat as a project-wide rule going forward.
- Connect bubble greeting: warm intro explaining why Ori wants the profile (learn voice/topics/audience, skip redundant questions).
- Analyzing bubble: short intro "One moment while I get to know you as a creator." Details live in the progress feed, not duplicated in the bubble.
- "Connect Threads" CTA + "Continue without Threads" tertiary link — no preview card, no "Why is this safe?" modal.

### Layout decisions
- All three zones (orb / bubble / interactive) vertically **centered** on the page, not bottom-anchored.
- Interactive zone capped at `max-width: 460px` so it doesn't dwarf the orb.
- Orb sized to match session-start OrbRecorder (220px desktop, 170px mobile) for visual consistency.

---

## What is mocked / not real

Frontend runs on stub state — no backend wiring yet:
- Connect Threads button skips OAuth and jumps straight to Analyzing.
- Analyzing feed is timer-driven (~7s), not a real Claude call.
- Questions are hardcoded in `questions.ts`, not AI-generated.
- Summary card has static copy.
- Save button goes to `/dashboard` after 1.8s, does not persist anything.
- Fallback triggers (API error, empty profile, returning user) are not wired to real conditions.
- No `OnboardingSession` persistence — refresh starts from Connect.
- No credit deduction.

---

## Next (backend phases per `onboarding-v2.md`)

Work proceeds in this order:

1. **Phase 1 — Prisma migration + foundation services**
   - Drop `CreatorProfile`. Add `MemoryBlock` (userId, key, title, description, content) + `OnboardingSession` (currentStep, threadsAnalysis, generatedQuestions, answers, summary, completedAt).
   - Extend `CreditTransaction` with model + input_uncached / input_cached / cache_write / output token breakdown + cost_cents.
   - Trial balance: auto-create `CreditBalance { balance: 150 }` on signup via `trial_grant` transaction.
   - Canonical keys seed at `packages/backend/src/memory/canonical-keys.ts`.
   - Services: `memory.service.ts` (getMemoryMap / readMemory / upsertMemoryBlock / getAllBlocks / deleteMemoryBlock), `llm-cost.ts` (MODEL_RATES + calculateCostCents + deductCredits).
   - Requires-credits middleware refactor: estimate → actual deduction from Anthropic usage response.

2. **Phase 2 — Onboarding agent + analysis pipeline**
   - Rewrite `StyleAnalysisAgent` to return pre-filled memory blocks.
   - Rewrite `OnboardingAgent` to generate personalized questions + options in same Claude call (with canonical keys as seed).
   - `onboarding.service.ts`: startSession, getSession (resume), runAnalysis, runAnalysisFallback, saveAnswer, generateSummary, applyClarification, complete.
   - Default questions hardcoded at `packages/backend/src/onboarding/default-questions.ts` for fallback path.
   - REST routes at `packages/backend/src/routes/onboarding.ts`.
   - Prompt caching mandatory for system prompts.

3. **Phase 3 — Frontend wiring**
   - Replace mocked flow in `pages/onboarding.vue` with real API calls via new `services/onboarding.ts` + `stores/onboarding.ts` (Pinia).
   - Resume logic on mount: fetch `/onboarding/session`, render at correct step.
   - Wire fallback steps to real triggers.

4. **Phase 4 — StrategistAgent refactor**
   - Replace `loadContext()` full-profile load with memory-map-only + `read_memory` tool.
   - Platform agents (Threads / IG / LI / Video) use `buildLegacyProfile(userId)` adapter from memory blocks.
   - Remove `save_creator_profile` tool.

5. **Phase 5 — Creator Profile page refactor**
   - `GET /memory` + `PATCH /memory/:key` + `DELETE /memory/:key` (non-canonical only).
   - Rewrite `pages/creator-profile.vue` to edit memory blocks (canonical block first in fixed order, non-canonical below).

6. **Phase 6/7 — Tests + rollout**
   - DB is drop-and-recreate since no prod users.

---

## Pending decisions (need user input before continuing)

- Post-trial paywall behavior: hard block on 0 credits, or grace period / warning? (From `onboarding-v2.md` open questions.)
- Voice STT billing: charge Whisper via Groq as part of credit ledger, or tolerate as out-of-band cost?
- "Continue without Threads" link: keep as visible tertiary, or de-emphasize to nudge OAuth?

---

## How to resume on another machine

1. `git pull`
2. `pnpm install` at repo root
3. `pnpm --filter @daily-content-brain/frontend dev`, open `/onboarding`, click through mocked flow to confirm visual state still works.
4. Read `ai-tasks/onboarding-v2.md` for the full file-by-file backend plan.
5. Start with Phase 1 (Prisma migration). Ask user on the three pending decisions above before deep backend work if they haven't been answered.
