# QA Bugs — Production (heypostrr.com)

Багрепорт по итогам ручного прохода `full-manual-test.md` на проде.
Каждая таска — отдельный самодостаточный issue для AI-разработчика: env, шаги, ожидаемый результат, фактический, селекторы/измерения, severity.

> **Окружение:** prod `https://heypostrr.com`, юзер залогинен через Threads (`@my.devlife`), Free-tier, онбординг пройден.
> **Браузер:** Chrome, viewport `1440×900` (desktop) + `768×1024` (tablet) + `~525×~700` (mobile floor — Chrome на macOS не пускает inner viewport ниже).
> **Дата:** 2026-04-24 / 2026-04-25.

Severity: 🔴 Critical (блокирует MVP) · 🟡 Warning (UX/spec drift) · 🔵 Note (вопрос дизайна).

## TL;DR — приоритеты для разработчика

**Чинить немедленно (блокирует prod):**
1. **BUG-016** 🔴 — `STRIPE_PRICE_VOICE` / `STRIPE_PRICE_CHORUS` env vars не выставлены → все платные подписки 400. **Монетизация мертва.**
2. **BUG-001** 🔴 — global mobile sidebar не сворачивается на ≤525px, на ВСЕХ logged-in страницах. Юзер с телефона не может пользоваться.
3. **BUG-008** 🔴 — `GET /api/ideas/<id>` отдаёт 404 на свежих идеях (не всех — гонка с persistence). Часть юзеров теряет доступ к черновикам.

**UX / config (фиксить на следующей итерации):**
4. BUG-002, BUG-003 — drift между чеклистом и продом по канонической памяти.
5. BUG-004 — `/creator-profile` Connected Platforms без бейджей "Soon".
6. BUG-006 — Vue/Nuxt SSR hydration mismatch на `/dashboard`.
7. BUG-009 — Cmd+Return не работает на втором textarea сессии.
8. BUG-013 — native `window.confirm` блокирует e2e-тесты, замени на in-app modal.
9. BUG-015 — длинный email overflow на mobile `/settings`.

**Заметки / TODO:**
10. BUG-005, BUG-010, BUG-011, BUG-012, BUG-014.

**Не покрыто этим прогоном (требуют доступа к БД / Stripe CLI):**
- §5.1 / §5.2 — credit gate triggering при balance=0 → нужен Prisma Studio
- §6.5 — cron-flow ScheduledPost → posted (нужно ждать ~60 сек + проверка БД)
- §9.3-§9.9 — Stripe webhook idempotency, renewal, downgrade, cancel-at-end, payment failure — нужен Stripe CLI и активная подписка (заблокировано BUG-016)
- §11.1-§11.6 — security/edge cases (rate limits, MIME mismatch, OAuth state reuse, SSE disconnect, concurrent publish, БД миграции)
- §12 — регресс

---

## §4 Creator Profile

### BUG-001 🔴 Mobile responsive: sidebar не сворачивается, контент рвётся [GLOBAL]

**Страницы:** `/creator-profile`, `/dashboard` (вероятно ВСЕ страницы с layout `default` — sidebar глобальный компонент)
**Viewport:** mobile (тест на ~525px, на 390px будет хуже)
**Severity:** Critical

**Шаги воспроизведения:**
1. Залогиниться, открыть `/creator-profile`.
2. Уменьшить окно браузера до mobile-ширины (390–525px).

**Ожидаемое (по global rules §📐 Responsive в `full-manual-test.md`):**
- Sidebar collapsed/hamburger или скрыт
- 1-кол layout, нет горизонтального overflow
- `document.documentElement.scrollWidth === window.innerWidth`
- Touch-targets ≥40px

**Фактическое:**
- Sidebar остаётся **256px шириной**, занимает **49% viewport (256/525px)**.
- Hamburger-меню отсутствует (selector check: ничего с `aria-label*=menu` или `☰`).
- Лейблы платформ Connected Platforms наезжают на Connect/Disconnect-кнопки. Визуально читается как «Linke**din**ect», «Tik**To**nnect», «Instag**ra**ct», «Threads@my.devlife» с обрезанным «Disconn…».
- `main` имеет `overflow-x: auto` → элементы уходят за viewport: `right: 542px / 560px` при `viewport.width: 525px`.
- 4 элемента overflow при сборе: `.platform-row__right`, `.threads-connect`, `.threads-connect__btn`, `.btn.btn--primary.block-card__save`.
- Textarea Niche сжимается до **105px ширины** — текст невозможно прочитать/редактировать.

**Измерения (DOM probe at `width: 525px`):**
```js
viewport: 525px, sidebar: 256/525px (49%)
overflowing elements:
  .platform-row__right (right: 560)
  .threads-connect (right: 560)
  .threads-connect__btn (right: 560, "Disconnect")
  .btn.btn--primary.block-card__save (right: 542)
main { overflow-x: auto }  // hides truncation visually but ломает UX
```

**Что чинить:**
- На `<= 768px` свернуть sidebar в hamburger или off-canvas.
- На `<= 480px` карточки `.block-card` стек'ать в 1 колонку без боковых отступов; `.platform-row` → flex-direction: column на mobile, чтобы лейбл и Connect-кнопка не наезжали.
- Save-кнопку под textarea, full-width на mobile.

**Скриншот:** [ai-tasks/qa-screenshots/04-creator-profile-mobile-broken.png](qa-screenshots/04-creator-profile-mobile-broken.png) — рендер html2canvas, viewport 500×657, видно: сайдбар занимает половину экрана, лейблы Threads/LinkedIn/TikTok/Instagram наезжают на Connect-кнопки, Disconnect обрезан.

**Аналогичные overflow на `/dashboard` (mobile, viewport 525px):**
```
overflow elements:
  .checklist-step__btn ("Start session", right: 568)
  .calendar-section__nav (right: 601)
  .calendar-nav-btn × 2 (right: 553, 601)
sidebar: 256/525px (49%)
hamburger: ABSENT
```

Корень один — sidebar не сворачивается, верстка контента рассчитана на >= 1024px. Чинится в layout `default` или общем `Sidebar.vue` через media-query `<= 768px` или `<= 480px`.

---

### BUG-002 🟡 Чеклист устарел: расширенный canonical memory set

**Страница:** `/creator-profile`
**Severity:** Warning (документация, не код)

**Контекст:**
В `ai-tasks/full-manual-test.md` §4 ожидает 5 канонических блоков: `niche`, `audience`, `voice_tone`, `content_goals`, `anti_patterns`.
Фактически на странице **10 канонических блоков**:
1. `niche`
2. `creator_angle` *(новое)*
3. `audience`
4. `content_pillars` *(новое)*
5. `voice_tone`
6. `goal` *(не `content_goals` — переименовано)*
7. `anti_patterns`
8. `current_projects` *(новое)*
9. `content_formats` *(новое)*
10. `onboarding_transcript` *(новое, read-only reference)*

Все 10 заполнены реальным текстом из онбординга, на каждом только Save (Remove отсутствует — это OK).

**Что чинить:**
- Обновить чеклист `ai-tasks/full-manual-test.md` §4 — отразить актуальный набор канонических ключей.
- В §4.1 валидации добавить проверку всех 10 ключей как reserved (см. BUG-003).

---

### BUG-003 🟡 Title `content_goals` не помечен как reserved

**Страница:** `/creator-profile` → `+ Add custom memory`
**Severity:** Warning

**Шаги:**
1. Открыть форму Add custom memory.
2. В поле title ввести `content_goals`.

**Ожидаемое (по чеклисту §4.1):**
Ошибка «reserved for a canonical block», Add disabled.

**Фактическое:**
Ошибки нет (Add disabled только потому, что content textarea пустая). Если юзер заполнит content — блок создастся с ключом `content_goals`.

**Корень причины:**
Реальный canonical-ключ называется `goal`, не `content_goals`. Бэк защищает только актуальные canonicals (`niche/creator_angle/audience/content_pillars/voice_tone/goal/anti_patterns/current_projects/content_formats/onboarding_transcript` — все эти 10 проверены вручную, ошибка возвращается).

**Что чинить:**
- Решить, какой набор зарезервированных слов держать на бэке. Если хотим защитить и legacy `content_goals` (на случай отката) — добавить в reserved list.
- Либо обновить чеклист (см. BUG-002).

---

### BUG-004 🟡 Connected Platforms — нет бейджа "Soon" на disabled-кнопках

**Страница:** `/creator-profile`, секция Connected Platforms
**Severity:** Warning (spec drift)

**Контекст:**
По чеклисту §1 (лендинг) и §7 (Schedule popup) платформы LinkedIn/Reels/X должны иметь **бейдж "Soon"** на серых кнопках.

**Фактическое на `/creator-profile`:**
- LinkedIn / TikTok / Instagram (X и Reels отсутствуют, добавлен TikTok и Instagram).
- Кнопка `Connect` рядом с каждой — disabled (серая), но **без видимого бейджа "Soon"**.
- Юзер может подумать, что кнопка временно недоступна, а не что фича не реализована.

**Что чинить:**
- Добавить визуальный бейдж "Soon" / "Coming soon" к disabled Connect-кнопкам.
- Синхронизировать список платформ между `/creator-profile`, лендингом и Schedule popup (там до сих пор LinkedIn/Reels/X).

---

### BUG-006 🟡 Vue/Nuxt SSR hydration mismatch на `/dashboard`

**Страница:** `/dashboard`
**Severity:** Warning

**Симптом:**
В консоли браузера на `/dashboard` после полной загрузки появляется:
```
[ERROR] Hydration completed but contains mismatches.
  (chrome-extension://fmkadmapgofadopljbjfkapdkoienihi/build/installHook.js — React DevTools хук, но текст ошибки от Vue 3)
```

**Что это:**
Vue 3 / Nuxt SSR-warning: HTML, отрендеренный сервером, отличается от того, что построил клиент после гидрации. Обычные причины:
- значения, зависящие от `Date.now()` / `localStorage` / cookies без `<ClientOnly>` обёртки;
- `process.client`-ветка, которая рендерит иначе чем серверная.

**Где смотреть:**
Greeting `Good Evening, Mykola | Solo Founder!` и время-чувствительные блоки (`EVENING SESSION`, `TODAY`-метка в календаре, Setup-checklist `2/4 done` который зависит от user state). Скорее всего greeting вычисляется на сервере по UTC, а клиент пересчитывает по локальному TZ.

**Что чинить:**
- Обернуть greeting в `<ClientOnly>` или вычислять в `onMounted`.
- Проверить `dashboard.vue` на использование `new Date()` в setup-функции без флага `process.client`.

---

### BUG-007 🟡 §5.1 / §5.2 не покрыты этим прогоном — нужен доступ к БД

**Контекст:** Чеклист §5.1 требует выставить `CreditBalance.balance = 0` через Prisma Studio для проверки credit gate. §5.2 требует искусственно вызвать 402 от backend.

**Что не проверено:**
- При `balance < 2` клик «Create New Post» открывает `PricingModal` (а не создаёт сессию)
- В `PricingModal`: 3 плана, labels (Casual usage / Daily posting / Multiple posts per day), нет цифр кредитов, Free disabled
- Глобальный 402-интерцептор в `billing.ts` store открывает `PricingModal` на любом стримовом 402

**Что нужно:**
- Доступ к Prisma Studio / dev-эндпоинт для эмуляции `balance=0`
- Либо staging-окружение с тестовым юзером и низким балансом
- Либо обходной путь: открыть `PricingModal` через кнопку **Upgrade** на `/settings` — это покроет визуальный acceptance модала

**Action:**
Прогнать §5.1 / §5.2 отдельным запуском с DB-доступом. Сейчас визуально вёрстка модала будет проверена в §8 (Settings → Upgrade).

---

## §6 Сессия + публикация

### BUG-008 🔴 GET `/api/ideas/<ideaId>` отдаёт 404 на свежесозданной идее

**Страница:** `/sessions/<sessionId>` → клик «View Content» на первой idea-card
**Severity:** Critical (блокирует idea-page → весь pub-flow на этой идее)

**Шаги воспроизведения:**
1. Войти в новую сессию через `/dashboard` → Start session.
2. Отправить вступительное сообщение в чат, дождаться ответа Strategist.
3. В follow-up отправить плотный месседж со story (несколько фактов), дождаться `Done — two ideas in the right panel`.
4. Кликнуть **View Content** на **первой** idea-card → панель Threads Agent открывается, отображается «**Failed to load idea details**».
5. Кликнуть **View Content** на **второй** idea-card → панель загружается нормально.

**Network evidence (`/api/ideas/<id>`):**
```
GET /api/ideas/cmodhnx87000a0ome91ay4zlx → 404  (первая идея)
GET /api/ideas/cmodho206000b0omentyrmkag → 200  (вторая идея)
GET /api/ideas/cmodhnx87000a0ome91ay4zlx → 404  (повтор первой через минуту, всё ещё 404)
```

**Бэкенд listing видит обе идеи:**
`GET /api/sessions/cmodhjq7x00030ome45t2k1mp/ideas` → 200, **возвращает обе записи** (одинаковая структура: `id`, `angle`, `description`, `format=text_post`, `platform=threads`, `status=proposed`, `producedContent: null`).

**Гипотезы:**
- Гонка: первая идея коммитится в БД позже, чем фронт рендерит её карточку через SSE-event с уже включённым `id`. Но повторный GET через минуту тоже 404 — значит запись либо **никогда не доходит до БД**, либо роут `/api/ideas/<id>` ищет в другой таблице (например, `Idea`, а лист `/api/sessions/.../ideas` тянет из `ContentPlan` или joined view).
- Возможно `/api/ideas/<id>` требует `producedContent IS NOT NULL` или какого-то другого joined состояния, которого у первой идеи нет, а у второй — есть из-за тайминга.

**Где смотреть:**
- Контроллер `GET /api/ideas/:id` (likely `packages/backend/src/routes/ideas.ts` или `idea.controller.ts`)
- Сравнить `WHERE id = ?` clause vs тем, что листинг возвращает
- Проверить SSE `idea_proposed` событие — что именно эмитится в качестве `id` (может быть temp id, replaced на real id позже)

**Скриншот:** не сделан (сложно воспроизвести визуально один-к-одному без контекста чата). Network-логи и body-text выше дают полную картину.

---

### BUG-009 🟡 Cmd+Return не работает на втором textarea (`Add a thought or request...`)

**Страница:** `/sessions/<id>` после первого ответа Strategist
**Severity:** Warning (UX)

**Шаги:**
1. На session-page после первого ответа Strategist в input «Add a thought or request...» вбить текст.
2. Нажать `Cmd+Return` (как подсказывает hint `Press ⌘↵ or Ctrl↵ to send` в первом инпуте).
3. **Ожидание:** сообщение отправляется.
4. **Факт:** ничего не происходит, текст остаётся в input. Чтобы отправить — нужно кликнуть SVG-иконку send (`.transcript-input__send`).

**Что чинить:**
Добавить `keydown` handler на второй textarea с условием `(e.metaKey || e.ctrlKey) && e.key === 'Enter'` → вызвать тот же submit, что и кнопка `.transcript-input__send`. И/или показать тот же hint под input'ом.

---

### BUG-010 🔵 §6.3 Attach media — testing limitation

**Страница:** `/sessions/<id>` → Idea page после Approve
**Severity:** Note (testing tooling)

**Контекст:**
Чеклист §6.3 требует проверить:
- `.jpg` ≤10MB → бейдж IMAGE + preview
- `.mp4` ≤100MB → бейдж VIDEO
- `.txt` / `.exe` → отклонено (MIME валидация через file-type)
- > 100MB → 413 от backend

**Что проверено:**
- File input существует, `accept="image/jpeg,image/png,video/mp4,video/quicktime"` — расширений `image/webp` и `image/gif` нет, **возможно намеренно** (проверьте с продуктом).
- Label `Add media` присутствует, кнопка enabled.

**Что НЕ проверено:**
Реальная загрузка файла через `<input type=file>` в Chrome MCP блокируется sandbox'ом:
- `mcp__Claude_in_Chrome__file_upload` → `{"code":-32000,"message":"Not allowed"}` (input в hidden parent)
- `DataTransfer + input.files = dt.files` → `input.files.length` сбрасывается в 0 после сабмита (вероятно фреймворк ресетит, или Chrome игнорирует programmatic File assignment)

**Action:**
- Прогнать §6.3 вручную пока это блокировано.
- Добавить hidden test fixture эндпоинт `POST /api/test/attach-media` который принимает file для e2e (если staging позволяет).

---

### BUG-011 🔵 §5.1 / §5.2 / §6.5 (cron) не покрыты — уже зафиксировано в BUG-007

См. BUG-007 — те же причины: нужен доступ к БД / cron-trigger.

§6.5 (Schedule later → дождаться cron → posted) дополнительно требует:
- Возможность создать ScheduledPost с близким `scheduledAt`
- Дождаться 60–90 сек и проверить переход status `pending → posted`
- Реальная публикация на threads.net (НЕ делается в этом прогоне per safety-rule)

В текущем прогоне Schedule popup открыт визуально: native HTML5 `<input type="date">` + `<input type="time">` + Schedule/Cancel — UI работает, popup закрывается по Cancel.

---

## §7 Content Calendar

### BUG-012 🔵 §7.3 Posted bubble не покрыт — нет реальных опубликованных постов

Чеклист §7.3 проверяет что клик по bubble «Posted» не делает ничего. У текущего юзера нет реальных опубликованных постов (мы их не публикуем). Status `READY` (черновик готов, ещё не запланирован/не опубликован) — это другое состояние, оно остаётся клик-невосприимчивым по умолчанию (на нашем тесте кликали на SCHED-bubble, не на READY).

**Action:** прогнать §7.3 после реальной публикации (или симулировать через прямой `UPDATE ScheduledPost SET status='posted'` в БД).

---

## §6.4 / §7.x — заметки для разработки тестинга

### BUG-013 🟡 Native `window.confirm()` блокирует Chrome MCP

**Страница:** `/content-calendar` → Edit scheduled → **Delete**
**Severity:** Warning (UX + testability)

**Симптом:**
При клике на Delete в Edit-модалке открывается **нативный** `window.confirm('Delete this scheduled post?')`. Это полностью блокирует renderer (Chrome MCP `javascript_tool` уходит в timeout 45 сек на любую следующую команду). Нативный диалог нельзя дисмиссить через `computer.key Return/Escape` — клавиши не достигают модального диалога.

**Что чинить (UX):**
- Заменить native `window.confirm` на in-app модалку (Vue component с собственным backdrop) — UX чище, тестируемо через `find`/`click`.
- Native `confirm` ломается в мобильных WKWebView, в e2e-тестах (Playwright/Cypress тоже требуют явный `page.on('dialog', dialog => dialog.accept())` хук).

**Action для тестов:**
- В test-mode переопределять `window.confirm = () => true` перед триггером Delete.

---

## §8 Settings

### BUG-014 🔵 PricingModal acceptance: minor wording diffs vs чеклист

**Страница:** `/settings` → Upgrade
**Severity:** Note (cosmetic)

**Чеклист §5.1 ожидает:**
- На Free кнопка «Free tier» disabled
- На Creator badge «Most creators pick this»

**Фактически в PricingModal:**
- На Free кнопка **«Current plan»** disabled (по сути то же — что ты на этом плане)
- На Creator badge **«Most Popular»** (вместо «Most creators pick this»)

Текущие тексты IMHO лучше — обновить чеклист.

---

### BUG-015 🟡 Mobile: длинный email (`info-value`) уходит за viewport на `/settings`

**Страница:** `/settings`, Account section, Email row
**Viewport:** ~525px (mobile floor в Chrome)
**Severity:** Warning

**Симптом:**
Email `threads-26386235864332312@postrr.local` (45 символов) рендерится в `<span class="info-value">` без `word-break: break-all` или `overflow-wrap: anywhere` → выходит за viewport на `right: 587px` при `viewport: 525px` (overshoot 62px). На реальном 390px overshoot будет ~200px.

**Что чинить:**
```css
.info-value {
  overflow-wrap: anywhere;   /* или word-break: break-all */
  min-width: 0;
}
```

Или использовать `text-overflow: ellipsis` с tooltip на полное значение.

---

## §9 Stripe flow

### BUG-016 🔴 Prod env: `STRIPE_PRICE_VOICE` / `STRIPE_PRICE_CHORUS` не выставлены — все checkout'ы 400

**Severity:** Critical — **блокирует ВСЮ монетизацию в проде**.

**Симптом:**
Любой клик «Choose plan» в `PricingModal` (Creator или Pro) → `POST /api/billing/checkout` отвечает **400** «This plan is not purchasable». Юзер остаётся на `/settings`, никакого визуального фидбека про ошибку нет (ошибка молча тонет).

**Reproduce:**
```
curl -X POST https://heypostrr.com/api/billing/checkout \
  -H 'cookie: better-auth.session_token=…' \
  -H 'content-type: application/json' \
  -d '{"planId":"creator"}'
→ 400 {"error":"This plan is not purchasable"}

curl ... -d '{"planId":"pro"}' → 400 {"error":"This plan is not purchasable"}
```

**Корень:**
[packages/backend/src/billing/plans.ts:24](packages/backend/src/billing/plans.ts#L24) и [:31](packages/backend/src/billing/plans.ts#L31):
```ts
creator: { ..., stripePriceId: process.env.STRIPE_PRICE_VOICE ?? null },
pro:     { ..., stripePriceId: process.env.STRIPE_PRICE_CHORUS ?? null },
```
[packages/backend/src/routes/billing.ts:62-64](packages/backend/src/routes/billing.ts#L62) проверяет `if (!plan.stripePriceId) return 400 "not purchasable"`. Поскольку в prod env vars пусты — обе монетизированные опции мертвы.

**Что чинить:**
1. Выставить в prod env (Coolify / docker-compose / .env):
   ```
   STRIPE_PRICE_VOICE=price_XXX     # Creator $20/mo recurring
   STRIPE_PRICE_CHORUS=price_YYY    # Pro $40/mo recurring
   ```
   Обе цены должны быть активны в том же Stripe account, что и `STRIPE_SECRET_KEY` (test/live mode матчится).
2. Перезапустить backend.
3. Проверить `GET /api/billing/plans` (если эндпоинт существует) → `purchasable: true` для обеих платных опций. В коде [billing.ts:34](packages/backend/src/routes/billing.ts#L34) уже отдаёт `purchasable: Boolean(plan.stripePriceId)` — фронт может это считывать и **отключать кнопки** до того, как юзер кликнет (сейчас кнопки активны и юзер получает unfriendly silent fail).

**Дополнительно (UX-фикс):**
Frontend должен:
- ловить `400 "not purchasable"` и показывать toast «Subscription temporarily unavailable. Please try again later.» (или contact support);
- желательно дисейблить «Choose plan» если `purchasable: false` приходит из API.

**Текущее состояние API:**
```
GET /api/billing/subscription → 200 {plan:"free", monthlyCredits:100, balance:84, ...}
POST /api/billing/checkout planId=creator → 400 not purchasable
POST /api/billing/checkout planId=pro → 400 not purchasable
POST /api/billing/checkout planId=voice → 400 Unknown plan (legacy ID, ОК что отклонён)
```

**Influence на остальной §9 чеклиста:**
Заблокировано до фикса:
- §9.2 Free → Creator
- §9.3 Idempotency replay (нет subscription)
- §9.4 Renewal trigger (нет subscription)
- §9.5 Upgrade Creator → Pro (нет starting subscription)
- §9.6 Downgrade Pro → Creator
- §9.7 Cancel at period end (нет subscription)
- §9.8 Payment failure
- §9.9 Idempotency на каждом хендлере
- §9.R Responsive — PricingModal сама работает (см. §8.1), но Stripe Checkout страница не загружается (никогда не редиректим на нее).

**Что уже проверено визуально:**
- §8.1 PricingModal открывается, 3 плана с правильными labels, 0 raw credits, Free disabled, Creator/Pro «Choose plan» (но кнопки не работают).
- `/api/billing/subscription` возвращает Free state корректно.

---

## §10 Logout

✅ Logout flow работает корректно:
- Клик Logout в sidebar → POST `/api/auth/logout` → 200
- Редирект на `/`
- `document.cookie` пуст после logout (cookie `better-auth.session_token` удалена)
- Попытка `/dashboard` без auth → middleware редиректит на `/`
- Anon landing рендерится без overflow на mobile (525px)

⚠ Не покрыто (нужен manual / network-throttle):
- «Backend выключен → попытка logout → frontend всё равно чистит локальный state и редирект» — требует временного отключения backend
- Re-login через Threads OAuth → проверка восстановления того же `User.id` — требует прохождения 2FA на устройстве пользователя

---

## §11.7 No raw credits audit

✅ Прогон по 5 logged-in страницам + landing:

| Page | `\b\d+\s*credits?\b` matches |
|---|---|
| `/dashboard` | 0 |
| `/content-calendar` | 0 |
| `/creator-profile` | 0 |
| `/sessions/<id>` | 0 |
| `/settings` | 0 |
| `/` (landing, logged-in) | 0 |
| `/` (landing, anon после logout) | 0 |
| PricingModal (overlay на `/settings`) | 0 |

🟢 Acceptance §11.7 закрыт. Замечание чеклиста про landing «всё ещё показывает цифры» — устарело, цифры удалены.

---

### BUG-005 🔵 Remove custom block без confirm-диалога

**Страница:** `/creator-profile`, кастомный memory-блок
**Severity:** Note (UX)

**Шаги:**
1. Создать любой custom memory block.
2. Кликнуть **Remove**.

**Фактическое:**
Блок удаляется немедленно, без confirm-диалога/undo. После reload — блок исчез.

**Вопрос:**
Это намеренное поведение? Для блоков с большим объёмом content потеря одним кликом — рискованно.

**Предложение:**
- Простой `window.confirm('Delete this custom block?')` — минимум.
- Или toast «Block removed» с кнопкой Undo (10 сек).

---

