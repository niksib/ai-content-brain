# Epic: Onboarding v2 — Memory-based Creator Profile

## Scope

Замена текущего 7-шагового quiz-онбординга на AI-ассистент flow с анализом Threads-профиля, memory-block архитектурой и token-based billing.

### In scope
- Drop старой схемы `CreatorProfile` → новая таблица `MemoryBlock`
- 4-экранный онбординг с persistent Orb + bubble + interactive zone
- Анализ Threads-профиля + AI-генерация персонализированных вопросов
- Fallback flow для API error / empty profile
- Resume — юзер возвращается на точку выхода
- Billing в credits (1 credit = 1 cent), учёт input/output/cache-read/cache-write отдельно
- Trial balance 150 credits ($1.50) новым юзерам
- Рефактор `StrategistAgent` → memory-map + `read_memory` tool
- Platform agents (`ThreadsAgent`, `InstagramAgent`, `LinkedInAgent`, `VideoAgent`) — через адаптер "собрать все блоки" (полный рефактор в отдельном эпике `agents-memory-update`)
- Рефактор страницы `/creator-profile` под редактирование memory blocks

### Out of scope
- Memory-write tool из чат-сессий (отдельный эпик `memory-write`)
- Другие соцсети (IG / LinkedIn / TikTok OAuth)
- Job queue (Bull/BullMQ) — анализ inline
- История изменений memory blocks

---

## Architecture Decisions

### Memory model
`MemoryBlock` table: `(user_id, key, title, description, content, created_at, updated_at)`. Ключ уникален на юзера. Канонические ключи — seed enum в коде, агенты предпочитают их, создают новые только если ни один не подходит.

### Billing model
Внутренняя валюта = credits, 1 credit = $0.01. Trial = 150 credits. Per LLM call считаем:
```
cost_cents = ceil(
  (input_uncached  * rate_input_uncached_per_M  / 1_000_000) * 100 +
  (input_cached    * rate_input_cached_per_M    / 1_000_000) * 100 +
  (cache_write     * rate_cache_write_per_M     / 1_000_000) * 100 +
  (output          * rate_output_per_M          / 1_000_000) * 100
)
```
Rates — константы в коде, зависят от модели (Opus / Sonnet / Haiku). Всё хранится в `CreditTransaction`.

### Resume
Полное состояние онбординга хранится в БД (`OnboardingSession` table). Юзер всегда возвращается на точку выхода. Кэш Threads-анализа живёт до `completedAt` — не платим юзера повторно.

### Analysis pipeline
Inline в POST-запросе с loader на фронте. Нет job queue. Если юзер закрыл tab во время анализа — при возврате состояние показывает "analyzing in progress" и либо ждём завершения через poll, либо перезапускаем если прошло > N секунд.

---

## Canonical Memory Keys (seed)

Константа в коде (`packages/backend/src/memory/canonical-keys.ts`):

| Key | Title | Description |
|-----|-------|-------------|
| `niche` | Niche | User's primary content domain |
| `audience` | Audience | Who user writes for (role, seniority, interests) |
| `content_pillars` | Content Pillars | 3-7 recurring themes user writes about |
| `voice_tone` | Voice & Tone | How user sounds in writing (style, register) |
| `goal` | Content Goal | Why user creates content (growth, hiring, leads, brand) |
| `anti_patterns` | Anti-patterns | What user avoids, what annoys them in others' content |
| `current_focus` | Current Focus | What user is working on this month worth posting about |
| `current_projects` | Current Projects | Products, startups, initiatives user is building |
| `content_formats` | Content Formats | Preferred post types (threads, single posts, dev logs, ...) |
| `onboarding_transcript` | Onboarding Transcript | Raw voice/text capture from onboarding (readonly reference) |

New keys can be added by normalizer only when no canonical key fits.

---

## Database Migration

### Dropped
- `CreatorProfile` table (fully replaced by `MemoryBlock`)

### New

```prisma
model MemoryBlock {
  id          String   @id @default(cuid())
  userId      String
  key         String
  title       String
  description String   @db.Text
  content     String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, key])
  @@index([userId])
}

model OnboardingSession {
  id                    String    @id @default(cuid())
  userId                String    @unique
  currentStep           String    // 'connect' | 'analyzing' | 'questions' | 'summary' | 'done'
  threadsAnalysis       Json?     // cached analysis result
  generatedQuestions    Json?     // AI-generated questions array
  answers               Json?     // { [questionKey]: { chipValue?, textValue? } }
  summary               String?   // plain-text summary
  clarification         String?   // user clarification on summary
  startedAt             DateTime  @default(now())
  completedAt           DateTime?
  lastActiveAt          DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Modified

```prisma
model CreditTransaction {
  // existing fields...
  model                 String?   // 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5'
  inputUncachedTokens   Int?
  inputCachedTokens     Int?
  cacheWriteTokens      Int?
  outputTokens          Int?
  costCents             Int       // authoritative cost, already in CreditBalance delta
}
```

### Initial balance
Bootstrap middleware: on first request after signup, create `CreditBalance { balance: 150 }` for new users. One-time topup transaction type = `trial_grant`.

---

## Phase 1 — Backend foundation

### 1.1 Prisma schema changes
- **File**: `packages/backend/prisma/schema.prisma`
- Add `MemoryBlock`, `OnboardingSession` models
- Drop `CreatorProfile` model + relations on `User`
- Extend `CreditTransaction` with model + token breakdown fields
- Add `trial_grant` to transaction type enum
- Run `pnpm db:migrate` with new migration

### 1.2 Canonical keys module
- **Create**: `packages/backend/src/memory/canonical-keys.ts`
  - Export `CANONICAL_KEYS` const array with `{ key, title, description }` entries
  - Export TypeScript type `CanonicalMemoryKey`

### 1.3 Memory service
- **Create**: `packages/backend/src/services/memory.service.ts`
  - `getMemoryMap(userId)` → returns `{ key, title, description }[]` (без content) — для injecting в системный промпт агента
  - `readMemory(userId, keys[])` → returns full blocks с content
  - `upsertMemoryBlock(userId, { key, title, description, content })` — для онбординга
  - `getAllBlocks(userId)` → для адаптера platform agents и Creator Profile page
  - `deleteMemoryBlock(userId, key)` — для Creator Profile редактирования

### 1.4 Billing service refactor
- **File**: `packages/backend/src/services/billing.service.ts`
- **Create**: `packages/backend/src/services/llm-cost.ts`
  - `MODEL_RATES` const — pricing per model (Opus / Sonnet / Haiku)
  - `calculateCostCents({ model, usage })` → returns cost in cents
  - `deductCredits(userId, { model, usage, actionType })` → pure function, writes `CreditTransaction`
- Update `requireCredits` middleware → поддерживает token-based deduction (before call = estimate/reserve, after call = exact from API response)
- Alternative: pre-flight cheap check "balance > 0", deduct after call from actual usage. Safer для UX (не блокируем если близко к 0).

### 1.5 Trial grant
- **File**: `packages/backend/src/auth/hooks.ts` (или где happens sign-up)
- On user creation → create `CreditBalance(balance: 150)` + transaction `trial_grant` = +150 credits

---

## Phase 2 — Onboarding agent & analysis

### 2.1 Threads profile analyzer
- **File**: `packages/backend/src/agents/StyleAnalysisAgent.ts` (расширить)
- Нужный output: style + niche + topics + audience signals + content pillars (в формате pre-fill memory blocks)
- Один Claude-вызов, возвращает JSON со всеми извлечёнными данными

### 2.2 Onboarding question generator
- **File**: `packages/backend/src/agents/OnboardingAgent.ts` (переписать)
- Входит: результат анализа + список canonical keys с описаниями
- Выход: JSON с (1) pre-filled memory blocks, (2) массив вопросов для gaps в формате:
  ```
  {
    key: CanonicalKey,
    prompt: string,           // персонализированный текст вопроса
    options: string[],        // 3-5 персонализированных chips
    bubbleContext?: string    // optional intro в bubble перед вопросом
  }
  ```
- Если категория уже ясна из анализа — возвращает пустой массив вопросов для неё (skip)
- Ограничение: max 4 вопроса
- Используется prompt caching для системного промпта

### 2.3 Onboarding service
- **File**: `packages/backend/src/services/onboarding.service.ts` (переписать)
- Методы:
  - `startSession(userId)` — создаёт `OnboardingSession`, начальный step = `connect`
  - `getSession(userId)` — для resume, возвращает текущее состояние фронту
  - `runAnalysis(sessionId)` — вызывает StyleAnalysisAgent + OnboardingAgent в одном flow, кэширует результат в `OnboardingSession.threadsAnalysis` + `generatedQuestions`. Обновляет `currentStep = 'questions'`
  - `runAnalysisFallback(sessionId)` — если нет Threads или 0 постов, использует hardcoded default questions из `packages/backend/src/onboarding/default-questions.ts`
  - `saveAnswer(sessionId, questionKey, answer)` — patches answer into session
  - `generateSummary(sessionId)` — финальный Claude-вызов, нормализует (pre-filled blocks + answers + clarification) → memory blocks. Возвращает plain-text summary. Обновляет step = `summary`
  - `applyClarification(sessionId, text)` — если юзер доуточнил, ещё один Claude-вызов обновляет блоки
  - `complete(sessionId)` — пишет memory blocks в `MemoryBlock`, помечает `completedAt`, чистит analysis cache

### 2.4 Default questions (fallback)
- **Create**: `packages/backend/src/onboarding/default-questions.ts`
- Хардкод 4 вопросов покрывающих ключевые keys:
  - `niche` — "What do you mostly write about?" + generic chips + free text
  - `goal` — "What's your main content goal?"
  - `audience` — "Who do you write for?"
  - `voice_tone` — "How would you describe your writing style?"

### 2.5 Onboarding routes
- **File**: `packages/backend/src/routes/onboarding.ts` (переписать)
- Endpoints:
  - `GET /onboarding/session` → текущее состояние (для resume на фронте)
  - `POST /onboarding/session/start` → создать сессию
  - `POST /onboarding/session/analyze` → запустить анализ (inline, ответ 200 только после завершения). Credits deducted.
  - `POST /onboarding/session/analyze/fallback` → skip analysis, use defaults
  - `POST /onboarding/session/answer` body `{ questionKey, chipValue?, textValue? }` → сохранить ответ
  - `POST /onboarding/session/summary` → сгенерировать summary
  - `POST /onboarding/session/clarify` body `{ clarification }` → применить доуточнение
  - `POST /onboarding/session/complete` → финализировать, создать memory blocks, отметить completedAt

### 2.6 Voice transcription
- **Existing**: `/voice/transcribe` endpoint + `OrbRecorder.vue` — используем as-is, отдельно ничего не меняем

---

## Phase 3 — Frontend onboarding

### 3.1 Page shell
- **File**: `packages/frontend/pages/onboarding.vue` (полностью переписать)
- On mount → fetch `/onboarding/session`. Если есть active session — render current step. Иначе start new session.
- Контейнер для persistent layout (Orb + Bubble + Interactive zone)
- Управление переходами: on answer saved → fetch next step OR compute next locally

### 3.2 Components
- **Create**: `packages/frontend/components/onboarding/OnboardingLayout.vue`
  - Persistent 3-zone layout (Orb top, Bubble middle, Interactive zone bottom)
  - Props: `orbState`, `bubbleText`, slot для interactive content
  - Responsive: mobile stack full-height, desktop centered max-600px
- **Create**: `packages/frontend/components/onboarding/AgentBubble.vue`
  - Typewriter animation
  - Props: `text`, `speed`, `onComplete`
- **Reuse**: `AnimatedOrb.vue` — передаём state (idle/thinking/speaking/listening)
- **Create**: `packages/frontend/components/onboarding/ConnectStep.vue`
  - Connect Threads button (redirects to `/auth/threads` или аналогичный route)
  - Secondary link "Why is this safe?" (modal/tooltip)
  - Tertiary "Continue without Threads" → triggers fallback
- **Create**: `packages/frontend/components/onboarding/AnalyzingStep.vue`
  - Loader с прогрессивными bubble updates
  - Orb в thinking state
  - Progress steps array, проигрывается sequentially
- **Create**: `packages/frontend/components/onboarding/QuestionStep.vue`
  - Chips (from session.generatedQuestions[currentIndex])
  - Textarea "My answer" + voice toggle (использует `OrbRecorder`)
  - Progress indicator "Question X of N"
  - Next button
- **Create**: `packages/frontend/components/onboarding/SummaryStep.vue`
  - Plain-text summary from session.summary
  - Textarea clarification + voice toggle
  - Hint text "You can refine this anytime on your Creator Profile"
  - Save & Go to Dashboard button

### 3.3 Store
- **Create**: `packages/frontend/stores/onboarding.ts` (Pinia)
  - State: session object
  - Actions: `loadSession`, `startSession`, `runAnalysis`, `saveAnswer`, `generateSummary`, `applyClarification`, `complete`
  - Derived: `currentStep`, `currentQuestion`, `progress`

### 3.4 Service layer
- **Create**: `packages/frontend/services/onboarding.ts`
  - HTTP client для onboarding endpoints
  - Использует existing `$fetch` wrapper

### 3.5 Routing / guards
- **File**: `packages/frontend/middleware/auth.ts` (или аналогичный)
- После signup → редирект на `/onboarding`
- Если session.completedAt — редирект на `/dashboard`
- Если юзер попадает на `/dashboard` без completedAt — редирект обратно на `/onboarding`

---

## Phase 4 — StrategistAgent refactor

### 4.1 Memory-map context builder
- **File**: `packages/backend/src/agents/StrategistAgent.ts`
- Переписать `loadContext()`:
  - Старое: load весь `CreatorProfile` + последние 30 дней идей
  - Новое: load memory-map (keys + titles + descriptions, БЕЗ content) + recent ideas

### 4.2 Read tool
- **Create**: `packages/backend/src/agents/tools/read-memory.ts`
  - Anthropic tool definition: `read_memory(keys: string[])`
  - Implementation: вызывает `memoryService.readMemory(userId, keys)`

### 4.3 Prompt updates
- Системный промпт StrategistAgent:
  - Секция "Memory Map" — список keys юзера с descriptions
  - Instruction: "Use `read_memory` tool to fetch full content of blocks when you need context to answer the user's request. Prefer reading only what's relevant."

### 4.4 Platform agents adapter
- **Create**: `packages/backend/src/agents/adapters/profile-from-memory.ts`
  - `buildLegacyProfile(userId)` → возвращает объект в форме старого `CreatorProfile` (niche, topics, audience, toneOfVoice, goals...) собранный из memory blocks
- Patches:
  - `ThreadsAgent`, `InstagramAgent`, `LinkedInAgent`, `VideoAgent` — где раньше читали `CreatorProfile`, заменяем на `buildLegacyProfile(userId)`
  - Не трогаем их внутреннюю логику, только источник данных

### 4.5 Existing tools
- `get_creator_profile` tool — либо удалить, либо переделать чтобы возвращал адаптированный объект
- `save_creator_profile` tool — удалить (больше не используется)

---

## Phase 5 — Creator Profile page refactor

### 5.1 Page rewrite
- **File**: `packages/frontend/pages/creator-profile.vue` (переписать)
- Fetch `/memory` endpoint → список всех blocks юзера
- Render:
  - Canonical blocks первыми в фиксированном порядке
  - Non-canonical blocks ниже
  - Каждый блок: inline-editable title/description/content
  - Кнопка "Delete" на non-canonical (canonical не удаляются, только чистятся content)

### 5.2 Memory routes
- **Create**: `packages/backend/src/routes/memory.ts`
- Endpoints:
  - `GET /memory` → все blocks юзера
  - `PATCH /memory/:key` body `{ content, title?, description? }` → upsert
  - `DELETE /memory/:key` → только non-canonical

---

## Phase 6 — Testing

### 6.1 Backend
- Unit: `memory.service.ts`, `llm-cost.ts`, `canonical-keys.ts` normalization
- Integration: onboarding flow end-to-end с mocked Anthropic responses
  - Happy path: Threads OAuth → analyze → answer → summary → complete
  - Fallback: Threads OAuth fail → default questions → complete
  - Resume: session persist mid-flow, reload, continue
  - Billing: credits deducted correctly at each step, trial balance consumed

### 6.2 Frontend
- Component tests for each onboarding step
- Playwright e2e (if setup exists): full onboarding flow на test account

---

## Phase 7 — Rollout

Поскольку prod юзеров нет — одна миграция, dev reset.

1. Prisma migration: drop `CreatorProfile`, add `MemoryBlock` + `OnboardingSession`, extend `CreditTransaction`
2. Wipe dev DB (`pnpm db:migrate reset`)
3. Seed canonical keys — not required (hardcoded in code, populated on first memory-block insert per user)
4. Deploy backend + frontend together (breaking change, no backwards compat)

---

## Sequencing (recommended order)

1. Phase 1 (schema + services foundation) — всё остальное зависит
2. Phase 2 (onboarding backend) — параллельно с началом Phase 3
3. Phase 3 (onboarding frontend) — integrates with Phase 2 as endpoints готовы
4. Phase 4 (StrategistAgent refactor) — после Phase 1-2, можно параллельно с Phase 3 финальными этапами
5. Phase 5 (Creator Profile refactor) — после Phase 1, не блокирует остальное
6. Phase 6 (testing) — continuous, не отдельная фаза
7. Phase 7 (rollout) — после всех фаз

---

## Risks & Notes

- **Анализ Threads может сломаться из-за API rate limits** — необходима обработка 429/5xx с понятным fallback на defaults.
- **Claude API timeout на анализе** — если > 30 сек, показывать юзеру "still working" в bubble. Не закрывать request, Cloudflare/ingress timeout обычно 60-100 сек.
- **Voice STT credits** — Whisper через Groq, не через Claude. Это отдельная статья расходов, не считается в billing credits. Либо добавить в billing, либо tolerate (Groq Whisper очень дёшев).
- **Prompt caching** — обязательно использовать для системных промптов OnboardingAgent и StrategistAgent, иначе trial budget утечёт.
- **Normalization квалити** — если нормализующий Claude-вызов плохо раскидывает ответы по canonical keys, профиль будет мусорный. Нужен качественный system prompt с примерами + temperature 0.

---

## Open Questions (before implementation)

- [ ] Post-paywall модель: после 150 credits — сразу Stripe paywall, или grace период / warning? (Связан с epic billing, можно решить позже.)
- [ ] "Continue without Threads" на Screen 1 — full-skip OAuth или только для fallback? Предложение: показывать как tertiary link, убеждать подключить через объяснение value.
- [ ] Voice STT билинг — считать в credits или вне?
- [ ] Design mockups — ждём от AI-дизайнера перед началом Phase 3.
