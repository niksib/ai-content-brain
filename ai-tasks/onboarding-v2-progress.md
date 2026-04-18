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

## Done (2026-04-18) — Phase 1 backend foundation

### Decisions resolved
- Onboarding does not deduct credits (no `requireCredits` on onboarding routes).
- Voice STT (Groq Whisper) stays out of credit ledger — out-of-band cost.
- "Continue without Threads" tertiary link kept on Connect step as is.
- Post-trial paywall behavior deferred to a separate billing epic.

### Schema changes (migration `20260418150621_add_memory_blocks_and_billing_fields`)
- Added `MemoryBlock(userId, key, title, description, content, …)` with `@@unique([userId, key])`.
- Added `OnboardingSession(userId @unique, currentStep, threadsAnalysis Json?, generatedQuestions Json?, answers Json?, summary?, clarification?, startedAt, completedAt?, lastActiveAt)`.
- Extended `CreditTransaction` with optional `model`, `inputUncachedTokens`, `inputCachedTokens`, `cacheWriteTokens`, `outputTokens`, `costCents`.
- Added enum values `trial_grant`, `agent_call` to `CreditTransactionType`.
- **Note:** `CreatorProfile` is intentionally NOT dropped yet — 18 files still reference it. Drop is scheduled for Phase 4 once StrategistAgent + platform agents migrate to memory blocks via `buildLegacyProfile()` adapter.

### New modules
- `packages/backend/src/memory/canonical-keys.ts` — `CANONICAL_KEYS` const (10 entries), `CanonicalMemoryKey` type, `isCanonicalKey()`, `getCanonicalKey()`.
- `packages/backend/src/services/memory.service.ts` — `MemoryService` with `getMemoryMap`, `readMemory`, `getAllBlocks`, `upsertMemoryBlock`, `deleteMemoryBlock` (canonical keys protected).
- `packages/backend/src/services/llm-cost.ts` — `MODEL_RATES` (Opus 4.7 / Sonnet 4.6 / Haiku 4.5), `normalizeUsage()`, `calculateCostCents()`, `deductCreditsForLlmCall()` writes a single `CreditTransaction` and decrements balance atomically.
- `packages/backend/src/services/trial-grant.service.ts` — `grantTrialCredits(userId)` creates `CreditBalance { balance: 150 }` + `trial_grant` transaction. Idempotent (skips if balance row exists).

### Auth wiring
- `packages/backend/src/lib/auth.ts` — added `databaseHooks.user.create.after` to call `grantTrialCredits` on signup.

### Status
- Backend `tsc --noEmit` passes clean.
- Migration applied to local dev DB.
- `requireCredits` middleware NOT refactored yet — kept simple `cost: number` form. Will revisit when wiring it into agent calls (Phase 2/4) where the post-call deduction pattern applies.

---

## Done (2026-04-18) — Phases 2 / 3 / 4 / 5 (full vertical slice)

### Phase 2 — Onboarding agent + analysis pipeline
- `packages/backend/src/onboarding/default-questions.ts` — fallback question set keyed to canonical memory keys (`niche`, `goal`, `audience`, `voice_tone`).
- `agents/style-analysis/style-analysis.agent.ts` + `.claude/CLAUDE.md` — rewritten. Single tool `extract_creator_signals` returns `{ blocks, toneExamples }`. Skill prompt rewritten to extract memory blocks instead of `CreatorProfile`.
- `agents/onboarding/onboarding.agent.ts` + `.claude/CLAUDE.md` — two-phase Ori. Phase A `generate_questions` (≤4 personalized), Phase B `save_memory_blocks` (final blocks + 3-5 sentence summary, includes `onboarding_transcript` verbatim). No em-dashes.
- `services/onboarding.service.ts` — `OnboardingService` (`getOrCreateSession`, `getSession`, `runAnalysis`, `runAnalysisFallback`, `saveAnswer`, `generateSummary`, `applyClarification`, `complete`). All Claude calls use `claude-sonnet-4-6` with `cache_control: ephemeral` and forced `tool_choice`. Falls back to `DEFAULT_QUESTIONS` if Threads has fewer than 3 usable posts. `complete()` writes blocks via `memoryService.upsertMemoryBlock`, clears cache via `Prisma.JsonNull`.
- `routes/onboarding.ts` — 8 endpoints (`GET /session`, `POST /start`, `/analyze`, `/analyze/fallback`, `/answer`, `/summary`, `/clarify`, `/complete`). `requireAuth` only — onboarding stays free.

### Phase 4 — StrategistAgent + platform agents + drop CreatorProfile
- `agents/adapters/profile-from-memory.ts` — `LegacyCreatorProfile` interface + `buildLegacyProfile(userId)` (maps memory blocks back to old shape) + `formatLegacyProfileForPrompt`.
- `agents/tools/read-memory.ts` — `readMemoryTool` + `makeReadMemory(userId)` executor.
- `agents/strategist/strategist.agent.ts` + `.claude/CLAUDE.md` — `loadContext()` now calls `loadStrategistSessionContext` (memory map + 30-day content history). Tools: `[webSearchTool, readMemoryTool, saveContentIdeaTool, updateContentIdeaTool]`.
- `tools/content.ts` — added `loadStrategistSessionContext(userId)`. Removed `getSessionContextTool`, `getContentHistoryTool`, and their executors.
- All four platform agents (`threads`, `instagram`, `linkedin`, `video`) — `loadContext()` now reads memory blocks via the adapter, no other changes needed (they keep working with the `LegacyCreatorProfile` shape).
- `routes/threads.ts` — removed `analyzeWritingStyleFromThreads` fire-and-forget call.
- Deleted: `tools/creator-profile.ts`, `services/style-analysis.service.ts`.
- Migration `20260418200000_drop_creator_profile` — drops `CreatorProfile` table + `CreatorStage` enum.

### Phase 5 — Memory routes + Creator Profile page
- `routes/memory.ts` — `GET /memory` (blocks + canonical catalog), `PATCH /memory/:key` (upsert), `DELETE /memory/:key` (non-canonical only). Wired into `index.ts`.
- `routes/profile.ts` — slimmed to identity-only (`{ email, name, isAdmin }`).
- `packages/frontend/stores/profile.ts` — rewritten. Exposes `userEmail`, `userName`, `isAdmin`, `memoryBlocks`, `canonicalKeys`, `isOnboarded`, `loadProfile`, `loadMemory`, `upsertBlock`, `deleteBlock`.
- `packages/frontend/pages/creator-profile.vue` — rewritten as memory-block editor. Canonical blocks render first in catalog order, custom blocks below. Per-block save (PATCH) + delete (only for non-canonical).
- `packages/frontend/pages/dashboard.vue` — replaced removed `profileStore.profile` checks (`hasThreadsPlatform = true` constant, `showOnboardingBlock` keyed off `profileStore.isOnboarded`).

### Phase 3 — Frontend onboarding wiring
- `services/onboarding.ts` — typed client for all 8 backend endpoints.
- `stores/onboarding.ts` — Pinia store with state machine (`session`, `loading`, `error`, computed `step`/`questions`/`answers`/`summaryText`/`isComplete`). Actions: `ensureSession`, `startConnectFlow`, `runAnalysis`, `runFallback`, `answerQuestion`, `generateSummary`, `clarifySummary`, `completeOnboarding`, `reset`.
- `pages/onboarding.vue` — rewritten to drive off the store. Flow: ensureSession → Connect → Threads OAuth or Skip → Analyzing (real backend call masked by the existing animated step) → dynamic `QuestionStep` per backend-returned question → SummaryStep with real summary text + clarify path → Done. Returning users resume at the first unanswered question.
- `components/onboarding/steps/SummaryStep.vue` — accepts `summaryText` + `loading` props, emits `save` and `clarify`.
- `components/onboarding/steps/QuestionStep.vue` — switched from `chips` to `options` to match backend shape.
- `components/onboarding/questions.ts` — reduced to the shared `OnboardingQuestion` interface (`key`, `prompt`, `options`, optional `bubbleContext`).
- `middleware/auth.global.ts` — auth check now hits `/api/profile` (the removed `/api/onboarding/status` endpoint is gone).

### Status
- Backend `tsc --noEmit` clean.
- Frontend `nuxt typecheck` clean for everything touched (two pre-existing errors in `components/LibraryBacklogCard.vue` and `stores/session.ts` are unrelated to this epic).
- Migrations applied locally (`20260418200000_drop_creator_profile`).
- Prisma client regenerated under Node 22.

---

## What's left

- **Phase 6 — manual test pass on the real flow.** Connect Threads OAuth round-trip, verify analysis populates blocks, confirm `read_memory` works in a real strategist session, edit a block on the Creator Profile page and confirm Strategist picks it up next session.
- **Pre-existing typecheck noise** in `components/LibraryBacklogCard.vue` and `stores/session.ts` — out of scope for onboarding-v2 but worth a follow-up cleanup pass.
- **Post-trial paywall behavior** — still deferred to a separate billing epic.
