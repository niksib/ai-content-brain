# Full Manual QA — HeyPostrr (ai-content-brain)

Тестируем продукт с нуля: от чистой БД и инкогнито до работающей подписки и опубликованного треда. Всё, что в чеклисте, должно быть зелёным перед prod-деплоем.

> Правила:
> - Одна галочка = один acceptance, не «в целом работает».
> - Если шаг упал — пометь красным, приложи логи и номер шага (`§5.2 fail`).
> - Не прыгаем через шаги: сессия/подписка/онбординг имеют зависимости.

---

## 📐 Responsive & UI/UX (сквозная проверка)

На каждой продуктовой секции (§4–§10, §11.7) после functional-шагов прогнать **3 breakpoint'а** и фиксировать на каждом:

| Preset | Viewport | Что проверяем |
|---|---|---|
| Desktop | 1440×900 | Основной layout, hover-состояния, focus rings |
| Tablet | 768×1024 | Стек/grid переходы, nav не рвётся, модалки ≤viewport |
| Mobile | 390×844 | 1-кол layout, нет горизонтального overflow, touch-targets ≥40px, модалки full-width |

**Общие acceptance для каждого viewport:**
- [ ] `document.documentElement.scrollWidth === window.innerWidth` (нет гориз. overflow)
- [ ] Нет рваных слов в заголовках/кнопках/nav (`word-break` не ломает)
- [ ] Все интерактивные элементы видны и кликабельны (ничего не за viewport)
- [ ] Primary-кнопки: hover меняет bg/shadow; disabled — opacity 0.5–0.7 + `cursor: not-allowed`
- [ ] Инпуты: focus-state с outline или border-color change
- [ ] Формы: error-state красный border + читаемый текст ошибки
- [ ] Модалки: backdrop кликабельный для close, на mobile занимают ≈100% ширины с мелким padding
- [ ] Console: 0 ошибок за время прохождения
- [ ] Network: 0 красных статусов (404/5xx) кроме ожидаемых 402 на credit gate

---

## 0. Preflight

### 0.1 Окружение
- [ ] `.env` заполнены: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GCS_*`, `THREADS_APP_ID/SECRET/REDIRECT_URI`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_VOICE` (Creator), `STRIPE_PRICE_CHORUS` (Pro)
- [ ] Node **22+** (Prisma 7 требует): `node -v` ≥ 22
- [ ] `docker compose up -d` → Postgres + Redis живы (`docker ps` показывает оба)
- [ ] `cd packages/backend && pnpm prisma migrate deploy` — без ошибок
- [ ] `pnpm prisma generate`
- [ ] Stripe test mode: 2 продукта с recurring $20/mo и $40/mo, `price_xxx` подставлены в env
- [ ] `stripe listen --forward-to localhost:3001/api/billing/webhook` запущен, webhook secret скопирован в `.env`
- [ ] `pnpm dev` в корне → backend на `:3001`, frontend на `:3000`, оба без ошибок в логах
- [ ] Открыт `/` в Chrome **инкогнито** (чистые куки)

### 0.2 Чистая БД (для полного теста подписки)
- [ ] В psql / Prisma Studio подтвердить что твой тестовый email не встречается в `User`, `CreditBalance`, `Subscription`
- [ ] Если есть — удалить через каскад: `DELETE FROM "User" WHERE email = 'test@...'`

---

## 1. Лендинг (анонимный)

- [ ] `/` открывается, нет редиректа
- [ ] Hero: заголовок читается, subtitle упоминает «Threads. LinkedIn, Instagram, X coming soon.»
- [ ] Под hero — бегущая строка фрагментов идей, не рекламно-кликбейтная
- [ ] Секция «The Loop» показывает 3 шага: record → listen → approve
- [ ] Секция «One voice note. Four native drafts.»:
  - [ ] Таб **Threads** активный
  - [ ] LinkedIn / Reels / X — серые с бейджем **Soon**, не кликаются
  - [ ] Иконки 18px, не замылены
- [ ] Секция Pricing: 3 плана (Free $0 / Creator $20 / Pro $40), на Creator badge «Most creators pick this»
- [ ] Кнопка Sign in в nav работает → открывается модалка auth
- [ ] Footer без битых ссылок
- [ ] Навигация `/dashboard` без логина → редирект на `/`

---

## 2. Регистрация и логин

### 2.1 Email + password (fallback-путь)
- [ ] В модалке Sign in переключиться на tab **Create account**
- [ ] Email + пароль ≥8 символов → Submit
- [ ] Редирект на `/onboarding`
- [ ] В БД: `User` + `Account` (better-auth), `CreditBalance.balance = 100` (free trial), `Subscription` = нет (free plan)
- [ ] Cookie `better-auth.session_token` установлена, HttpOnly, Secure (в prod)

### 2.2 Threads OAuth (основной путь)
- [ ] Сначала выйти (logout или в инкогнито новая вкладка)
- [ ] Sign in → **Continue with Threads** над email-формой
- [ ] Редирект на `threads.net/oauth/authorize`
- [ ] Подтвердить permissions → редирект обратно на `/onboarding?threads_connected=true`
- [ ] В БД: новый `User` c `email = threads-<id>@postrr.local`, `ThreadsAccount` с `accessToken` (зашифрован), `loginSecret` per-user (random)
- [ ] `CreditBalance.balance = 100` (free trial, одинаково для email и Threads пути)
- [ ] `OAuthState` row удалена после use (state single-use)

### 2.3 Повторная попытка OAuth с тем же state
- [ ] Скопировать URL callback с `state=...`, подождать, открыть ещё раз
- [ ] **Ожидание:** ошибка `invalid_state` (row уже удалена) → не даёт вторичный логин

---

## 3. Онбординг (Ori, v2)

На `/onboarding`, Threads уже привязан после §2.2.

### 3.1 Connect
- [ ] Бабл Ori: «Hi, I'm Ori… I can see your Threads account, **@username**»
- [ ] Кнопка **Continue** со стрелкой
- [ ] Ссылка «Continue without Threads» скрыта если Threads уже привязан
- [ ] Клик Continue → переход в **Analyzing**, лоадер крутится

### 3.2 Analyze
- [ ] 10–30 сек анализа постов Threads
- [ ] Если у юзера <5 постов — fallback на questions-only
- [ ] Ошибка сети → retry-кнопка видна, не крашится

### 3.3 Questions (3–5 вопросов)
- [ ] Первый вопрос появился без обрыва текста
- [ ] Если в `bubbleContext` есть контекст («I noticed…») — он **над** вопросом, разделён пустой строкой
- [ ] Чипы-опции кликаются, выбранные подсвечиваются
- [ ] Можно набить текст в input — работает как free-text
- [ ] «Next» активна когда есть хотя бы 1 chip или непустой text
- [ ] Последний вопрос — про anti-patterns / no-go topics

### 3.4 Summary
- [ ] После последнего вопроса → **Finalizing** (короткий лоадер) → **Summary**
- [ ] Summary: 3–5 предложений, читается как описание юзера
- [ ] Input clarification внизу → «make it more about B2B» → текст обновляется
- [ ] Кнопка **Save** → POST `/onboarding/session/complete`
- [ ] Редирект на `/dashboard`
- [ ] В БД: `CreatorProfile` заполнен канониками (niche, audience, voice_tone, content_goals, anti_patterns), `OnboardingSession.status = 'completed'`

---

## 4. Creator Profile + custom memory blocks

- [ ] `/creator-profile` открылся
- [ ] Канонические блоки (niche, audience, voice_tone, content_goals, anti_patterns) видны с текстом из онбординга
- [ ] На канонических блоках **нет** кнопки Remove
- [ ] Внизу — **+ Add custom memory**
- [ ] Клик → форма: title, description, textarea

### 4.1 Валидация custom block
- [ ] Title `niche` → ошибка «reserved for a canonical block»
- [ ] Title `audience` / `voice_tone` / `content_goals` / `anti_patterns` — то же
- [ ] Title `my no-go topics` → live-preview ключа `my_no_go_topics` под textarea
- [ ] Пустой content → **Add block** disabled
- [ ] Валидно → Add → блок в списке, форма закрылась

### 4.2 Редактирование
- [ ] Изменить текст канонического блока → Save → ОК в БД
- [ ] Удалить кастомный блок → Remove → исчез, refresh → его нет
- [ ] Reload страницы → блоки на месте

### 4.R Responsive
- [ ] **Desktop 1440:** блоки канонические + Add-кнопка читаемы, sidebar виден, форма Add memory (title + textarea) не съезжает
- [ ] **Tablet 768:** блоки 1-кол, заголовок не рвётся, textarea full-width внутри карточки
- [ ] **Mobile 390:** sidebar collapsed/hamburger или скрыт; блоки stack'аются, Remove-кнопка доступна пальцем (≥40px target), live-preview key не выезжает

---

## 5. Dashboard + кредитный гейт

- [ ] `/dashboard` открыт
- [ ] Видно приветствие / сегодняшняя сессия / календарь предыдущих сессий
- [ ] Sidebar: «Create New Post» primary button

### 5.1 Credit gate < 2
- [ ] В Prisma Studio: `CreditBalance.balance = 0` (или 1)
- [ ] Клик **Create New Post**
- [ ] **Ожидание:** открывается `PricingModal`, сессия НЕ создаётся
- [ ] В PricingModal:
  - [ ] Заголовок «Reached this month's limit»
  - [ ] 3 плана с labels: Free=**Casual usage**, Creator=**Daily posting**, Pro=**Multiple posts per day**
  - [ ] **Нет** цифр кредитов («1000 credits» etc.)
  - [ ] На Free кнопка «Free tier» disabled (if current)
  - [ ] На Creator/Pro кнопка «Choose plan»
- [ ] Close (X или backdrop) → модалка закрылась
- [ ] Вернуть `balance = 100` → Create New Post → сессия создаётся

### 5.2 402 из любого API → модалка
- [ ] Искусственно обнулить баланс, начать streamable endpoint (chat, session runner)
- [ ] HTTP 402 от backend → глобальный интерцептор в `billing.ts` store открывает `PricingModal`

### 5.R Responsive
- [ ] **Desktop 1440:** dashboard grid (greeting + сегодняшняя сессия + прошлые) читается, sidebar с nav виден, «Create New Post» primary-кнопка
- [ ] **Tablet 768:** grid stack'ается в 1–2 колонки, контент не обрезан
- [ ] **Mobile 390:** sidebar скрыт/hamburger; «Create New Post» доступна; PricingModal на mobile = 1 колонка планов, кнопка Close (X) в углу читается и кликается
- [ ] PricingModal scroll: на mobile содержимое скроллится внутри модалки, а не за её пределами

---

## 6. Сессия + публикация

### 6.1 Запись / чат
- [ ] В `/sessions/{id}` запустить voice recording: разрешить микрофон → запись 30–90 сек → stop
- [ ] Transcription (Whisper) отрабатывает → текст появился в чате
- [ ] Альтернатива: вбить текст в чат-панель руками
- [ ] Content Strategist агент пишет ответ через SSE stream
- [ ] Баланс в sidebar не показан цифрами (если так предусмотрено); внутри settings — только %

### 6.2 Идея
- [ ] Агент предлагает 2–3 идеи → клик по одной
- [ ] Откроется idea-page (Notion-like), Threads agent стримит черновик
- [ ] Hover по карточке во время редактирования → индиго-свечение не пропадает
- [ ] Готовый черновик редактируемый
- [ ] Для мульти-треда: «+ Add reply» → появляется вторая запись

### 6.3 Attach media
- [ ] В посте «Attach media» → выбрать .jpg ≤10MB → появился бейдж IMAGE, preview
- [ ] Replace → .png → работает
- [ ] Attach .mp4 ≤100MB → бейдж VIDEO
- [ ] Попытка загрузить .txt или .exe → отклонено (MIME-валидация через file-type)
- [ ] Попытка >100MB → 413 от backend

### 6.4 Publish now
- [ ] Клик **Publish now** на готовом треде
- [ ] UI: статус меняется на **Scheduled** (специально, не Posted — постинг до ~60 сек)
- [ ] Под кнопкой: «Your post is queued, it'll publish in about a minute.»
- [ ] В БД: `ScheduledPost.status = pending`, `scheduledAt ≈ now`
- [ ] Подождать 60–90 сек → cron забирает → `status = posted`, `publishedAt` заполнен
- [ ] Открыть threads.net/@user → пост реально есть, с медиа, цепочка reply-ов корректная
- [ ] В БД: `CreditTransaction` на -N кредитов (reconcile после SSE), `CreditBalance.balance` уменьшился

### 6.5 Schedule later (через idea page — если поддерживается)
- [ ] Выбрать дату/время через 3–5 мин
- [ ] Подтвердить → `ScheduledPost` с будущим `scheduledAt`
- [ ] Дождаться cron → `posted`

### 6.R Responsive
- [ ] **Desktop 1440:** chat panel + workspace panel + idea cards в 2-колонном layout; hover-highlight на idea card чёткий
- [ ] **Tablet 768:** панели стек'аются или сжимаются; кнопка Publish now + Schedule видны
- [ ] **Mobile 390:** chat / idea в 1 кол; record-кнопка (мик) доступна; attach media попап не обрезан; «+ Add reply» читается
- [ ] Media preview (IMAGE/VIDEO badge) корректно масштабируется на mobile, Remove-кнопка ≥40px

---

## 7. Content Calendar

- [ ] `/content-calendar` открылся
- [ ] Пост из §6.4 в сегодняшнем дне (по `publishedAt`, не `createdAt`)
- [ ] Старые posted-посты на правильных датах (backfill сработал)
- [ ] В хедере — primary-indigo кнопка **Schedule post**

### 7.1 Создание через Schedule popup
- [ ] Клик Schedule post → модалка
- [ ] Tab Threads активный; LinkedIn / Reels / X серые с Soon, не кликаются
- [ ] «When»: строка timezone «Times are in your local timezone (Europe/Kyiv)» (или твоя)
- [ ] Дата в прошлом → кнопка Schedule disabled
- [ ] Text >500 символов → счётчик оранжевый, Schedule disabled при превышении лимита платформы
- [ ] «+ Add reply» → второй пост
- [ ] Attach .jpg в первом → IMAGE badge + Remove
- [ ] Attach .mp4 → VIDEO badge
- [ ] 2 поста + media + date+time через 3 мин → Schedule
- [ ] Модалка закрылась, в ячейке календаря появился bubble **Sched**
- [ ] Дождаться cron → bubble меняется на **Posted**
- [ ] На threads.net пост реально есть

### 7.2 Edit scheduled
- [ ] Создать новый scheduled на будущее
- [ ] Клик на bubble → модалка в режиме **Edit scheduled post**
- [ ] Все поля заполнены из поста
- [ ] Справа **Save changes**, слева красная **Delete**
- [ ] Изменить текст и дату → Save → ячейка обновилась
- [ ] Открыть снова → Delete → confirm → пост исчез из календаря и БД

### 7.3 Published
- [ ] Клик по bubble **Posted** → ничего не происходит, cursor обычный, hover-эффекта нет

### 7.R Responsive
- [ ] **Desktop 1440:** full 7-day grid, bubbles в ячейках не обрезаны, Schedule post в хедере
- [ ] **Tablet 768:** grid скроллится горизонтально или показывает 3–4 дня, Schedule post доступен
- [ ] **Mobile 390:** календарь 1-col day list или horizontal scroll, bubbles bottom-align, tap-targets ≥40px
- [ ] Schedule popup на mobile: date/time picker не обрезан, +Add reply доступен, Attach media попап не вылезает за экран

---

## 8. Settings

### 8.1 Subscription секция (Free)
- [ ] `/settings` → Plan: **Free**
- [ ] «Renews on» **не** показано (у Free нет periodEnd)
- [ ] Прогресс-бар «Monthly usage» с лейблом **X% used**
- [ ] **Нет** текста «N of 100 credits remaining»
- [ ] **Нет** цифр кредитов нигде в секции
- [ ] Кнопка **Upgrade** → открывает `PricingModal` (не `/pricing` страницу)
- [ ] Кнопки **Manage billing** нет у Free

### 8.2 Account секция
- [ ] Email отображается корректно
- [ ] **Change Password**: открыть форму → старый+новый+confirm → Save → «Password updated successfully»
- [ ] Mismatch confirm → ошибка валидации
- [ ] Password <8 символов → ошибка
- [ ] Неправильный current → API ошибка отображается

### 8.R Responsive
- [ ] **Desktop 1440:** Subscription + Account секции в читаемых карточках; «Upgrade» + «Manage billing» рядом
- [ ] **Tablet 768:** карточки full-width, progress bar растягивается, форма Change Password не ломается
- [ ] **Mobile 390:** секции стек'аются, кнопки full-width или читаемые, Delete Account красный CTA не вызывает случайный клик
- [ ] Progress bar на всех viewport: ширина анимируется плавно, `%` читается контрастно

---

## 9. Stripe flow

> ⚠️ **Prereq:** проверить что `sk_test_*` в `.env` не истёк. Если истёк:
> ```bash
> stripe login                    # получить новый test API key
> stripe config --list            # скопировать test_mode_api_key → .env/STRIPE_SECRET_KEY
> ```
> Продукты с правильными `price_*` должны быть созданы в том же account.

### 9.0 Webhook event coverage (аудит)

Обрабатываем в [`billing.service.ts`](../packages/backend/src/services/billing.service.ts):

| Событие | Что делает | Блокирует grant |
|---|---|---|
| `checkout.session.completed` | create/update `Subscription`, grant credits на plan allowance | — |
| `invoice.paid` | **только `billing_reason=subscription_cycle`** → renewal-refresh credits | skip для `subscription_create` / `subscription_update` / прочих |
| `customer.subscription.updated` | sync status/plan/periodEnd/cancelAtPeriodEnd; если planId сменился — grant для нового плана | — |
| `customer.subscription.deleted` | downgrade в free, сброс баланса на 100 | — |

Игнорируются молча (OK): `customer.subscription.created` (дублируется checkout), `invoice.created`, `invoice.finalized`, `payment_intent.*`, `charge.*`.

Не хэндлим (вне scope MVP): `invoice.payment_failed` (status=past_due придёт через `subscription.updated`), `charge.refunded`, `charge.dispute.created`, `subscription.paused/resumed`.

Idempotency: каждое событие пишется в `StripeWebhookEvent.eventId` (unique) до выполнения сайд-эффектов. P2002 → skip.

### 9.1 Preflight для Stripe тестов

```bash
# Terminal A
stripe listen --forward-to localhost:3001/api/billing/webhook --format JSON > /tmp/stripe.jsonl

# Скопировать whsec_… в .env → STRIPE_WEBHOOK_SECRET → рестарт backend
```

- [ ] `stripe listen` показал `Ready! Your webhook signing secret is whsec_…`
- [ ] Webhook secret обновлён в `.env`, backend перезапущен
- [ ] Backend логи чисты, ошибок `ERR_REQUIRE_ESM` нет

### 9.2 Free → Creator (первая подписка)

- [ ] На `/settings` → Upgrade → PricingModal → Creator → Choose plan → Stripe Checkout
- [ ] Карта `4242 4242 4242 4242`, любой CVC, будущая дата, индекс `42424`
- [ ] Редирект на `/settings?billing=success`, зелёный «Payment successful! Your plan is active.»
- [ ] Plan: **Creator**, «Renews on <дата+1мес>»
- [ ] В stripe listen видны события (у каждого status 200):
  - `customer.created`
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `invoice.created` / `invoice.finalized` (ignored)
  - `invoice.paid` с `billing_reason=subscription_create` → **skipped** (в backend логе `invoice.paid ignored`)
  - `payment_intent.succeeded` / `charge.succeeded` (ignored)
  - `customer.subscription.updated` (sync, без plan change → кредиты не начисляются повторно)
- [ ] В БД:
  - `Subscription`: plan=creator, status=active, stripeSubscriptionId заполнен, currentPeriodEnd ≈ +1 мес
  - `CreditBalance.balance = 1000`
  - `CreditTransaction`: ровно **одна** запись с `type=subscription_grant`, `amount=1000`
  - `StripeWebhookEvent`: все полученные events записаны с уникальными eventId

### 9.3 Idempotency (повторная доставка)

```bash
# найти eventId нужного события (например, checkout.session.completed)
stripe events list --limit 5
stripe events resend evt_XXXXXX
```

- [ ] `stripe events resend` → backend вернул 200
- [ ] В логе: `Duplicate event evt_XXXXXX — skipping`
- [ ] `CreditTransaction` **без** новой записи
- [ ] `CreditBalance.balance` **не изменился**

### 9.4 Renewal (новый цикл подписки)

**Задача:** убедиться, что на новом цикле кредиты обнуляются и начисляются заново.

```bash
# Симулировать renewal invoice (Stripe CLI):
stripe trigger invoice.payment_succeeded
# или явно для твоей подписки:
stripe trigger invoice.payment_succeeded \
  --override invoice:subscription=sub_XXXXXX \
  --override invoice:billing_reason=subscription_cycle
```

- [ ] Перед триггером: израсходовать несколько кредитов (`balance = 950` например)
- [ ] Выполнить trigger
- [ ] В stripe listen: `invoice.paid` → backend 200
- [ ] В backend логе: **нет** «invoice.paid ignored» (т.к. `billing_reason=subscription_cycle`)
- [ ] `CreditBalance.balance = 1000` (сброс на plan allowance, остаток сгорел)
- [ ] Новая запись в `CreditTransaction`: `type=subscription_grant`, `amount=1000`, `reference=<invoice.id>`
- [ ] `Subscription.currentPeriodEnd` продлён на +1 мес

### 9.5 Upgrade Creator → Pro (mid-cycle)

**Задача:** убедиться, что кредиты перешли на новое allowance, и НЕ задвоились.

- [ ] Settings → **Manage billing** → Stripe Customer Portal
- [ ] Change plan → Pro → Confirm (обычно «prorate and invoice now»)
- [ ] Вернуться в `/settings` → refresh → Plan: **Pro**
- [ ] В stripe listen: `customer.subscription.updated`, `invoice.created`, `invoice.paid`, `payment_intent.succeeded`
- [ ] В backend логе: `invoice.paid ignored (billing_reason=subscription_update)` — renewal-грант **не** вызывается
- [ ] В БД:
  - `Subscription.plan = pro`, `stripePriceId` обновлён
  - `CreditBalance.balance = 2000`
  - `CreditTransaction`: **ровно одна** новая запись `subscription_grant amount=2000` (от `customer.subscription.updated` хендлера, не от invoice.paid)

### 9.6 Downgrade Pro → Creator (scheduled to cycle end)

- [ ] Stripe Portal → Change plan → Creator → обычно scheduled к concurrent_period_end
- [ ] В stripe listen: `customer.subscription.updated` (status=active, но item.price остаётся Pro до cycle end)
- [ ] `/settings` всё ещё показывает **Pro**, `cancelAtPeriodEnd=false` (это downgrade, не cancel)
- [ ] На момент переключения (можно симулировать через `stripe trigger invoice.payment_succeeded` с новой ценой): новый `invoice.paid` с `billing_reason=subscription_cycle` + новая цена Creator → balance=1000

### 9.7 Cancel at period end

- [ ] Stripe Portal → Cancel subscription (cancel at end of period)
- [ ] В stripe listen: `customer.subscription.updated` с `cancel_at_period_end=true`
- [ ] `/settings`: «Cancels on <date>», Plan = Pro/Creator (тот что был)
- [ ] Кредиты **не меняются** до конца цикла
- [ ] Симулировать конец цикла:

```bash
stripe trigger customer.subscription.deleted \
  --override subscription:id=sub_XXXXXX
```

- [ ] Backend получает `customer.subscription.deleted` → 200
- [ ] В БД: `Subscription.plan=free`, `status=canceled`, `stripeSubscriptionId=null`, `cancelAtPeriodEnd=false`
- [ ] `CreditBalance.balance = 100`
- [ ] `CreditTransaction`: новая `subscription_grant amount=100 reference=<sub.id>`
- [ ] `/settings` показывает Plan=Free, Upgrade-кнопку снова, Manage billing скрыт

### 9.8 Payment failure на renewal

```bash
stripe trigger invoice.payment_failed \
  --override invoice:subscription=sub_XXXXXX
```

- [ ] В stripe listen: `invoice.payment_failed` → backend 200 (ignored, нет хендлера)
- [ ] Далее Stripe пришлёт `customer.subscription.updated` с `status=past_due`
- [ ] В БД: `Subscription.status=past_due`
- [ ] Кредиты **не** сбрасываются (старый баланс сохранён)
- [ ] Юзер всё ещё может работать на остатках до нуля → credit middleware корректно отдаст 402 когда balance<2

### 9.9 Повтор идемпотентности на каждом хендлере

Для каждого из `checkout.session.completed`, `invoice.paid` (renewal), `customer.subscription.updated`, `customer.subscription.deleted`:

- [ ] `stripe events resend evt_xxx` → backend 200, в логе `Duplicate event … skipping`
- [ ] Ни balance, ни transactions не двоятся

### 9.10 Сводная таблица: юзер получает за что платит

| Действие | Ожидаемый баланс | Ожидаемые transactions |
|---|---|---|
| Signup (email/Threads) | 100 | 1× `trial_grant` +100 |
| Checkout Creator | 1000 | 1× `subscription_grant` +1000 |
| Upgrade Creator→Pro | 2000 | 1× `subscription_grant` +2000 |
| Renewal (new cycle) | plan allowance | 1× `subscription_grant` +allowance |
| Downgrade mid-cycle | без изменений до cycle end | — |
| Downgrade в новом цикле | new plan allowance | 1× `subscription_grant` |
| Cancel at period end | без изменений до cycle end | — |
| Subscription deleted | 100 | 1× `subscription_grant` +100 |
| Payment failed | без изменений | — |
| Webhook replay | без изменений | — |

### 9.R Responsive (UI-часть флоу)
- [ ] **Desktop 1440:** PricingModal 3-col, Stripe Checkout читается, `/settings?billing=success` banner центрирован
- [ ] **Tablet 768:** PricingModal 1-col с max-width, Checkout адаптируется, success banner не ломает layout
- [ ] **Mobile 390:** PricingModal full-width, scroll внутри модалки работает, Stripe Checkout mobile-friendly (это ответственность Stripe, но переход из модалки не должен ломаться), возврат на `/settings?billing=success` показывает успех

---

## 10. Logout / auth regression

- [ ] Sidebar → Logout
- [ ] POST `/api/auth/logout` → 200
- [ ] Cookie `better-auth.session_token` удалена
- [ ] Full reload → редирект на `/`
- [ ] В новой вкладке `/dashboard` → редирект на `/` (middleware)
- [ ] Снова Sign in через Threads → тот же `User.id`, сессия восстановлена
- [ ] Backend выключен → попытка logout → frontend всё равно чистит локальный state и редирект

### 10.R Responsive
- [ ] **Desktop 1440:** Logout-кнопка в sidebar видна, редирект на `/` чист
- [ ] **Tablet 768:** Logout доступен (sidebar compact или hamburger)
- [ ] **Mobile 390:** Logout доступен через hamburger/menu; после редиректа `/` рендерится без overflow

---

## 11. Безопасность / edge cases

### 11.1 Rate limits
- [ ] 10 login попыток подряд с неправильным паролем → 429 / throttle
- [ ] SSE endpoint → несколько одновременных сессий на одного юзера: закрытие одной не ломает другую

### 11.2 Media
- [ ] Upload >100MB → 413
- [ ] Upload MIME mismatch (renamed .mp4 → `.jpg`) → отклонено по file-type detection
- [ ] GCS: проверить что blob приватный, доступ через signed URL

### 11.3 OAuth state
- [ ] State reuse → §2.3 ✅
- [ ] State с чужим user_id → невалидный (state single-use + bound to session)

### 11.4 SSE disconnect
- [ ] Запустить stream (idea generation), закрыть вкладку
- [ ] В backend логах: «client disconnected» → run aborted, reservation reconciled
- [ ] `CreditBalance` не двоится

### 11.5 Concurrent publish
- [ ] Два одинаковых `ScheduledPost` c одним `ideaId` → второй идёт в failed / deduped
- [ ] Cron не публикует дважды (атомарный `updateMany WHERE publishingAt IS NULL`)

### 11.6 Prisma / БД
- [ ] `prisma validate` ✅
- [ ] Все миграции применяются с чистой БД (`migrate reset` + `migrate deploy` — без ошибок)

### 11.7 UI аудит «нет сырых кредитов»
- [ ] Settings: только % ✅
- [ ] PricingModal: только labels ✅
- [ ] Sidebar: **не** показывает число кредитов
- [ ] Dashboard: **не** показывает число кредитов
- [ ] Idea page: **не** показывает число кредитов
- [ ] Landing (`/`): pricing-карточки для anon visitor — ⚠ текущее состояние всё ещё показывает цифры (решение по маркетингу, не по продукту)

---

## 12. Регресс после всех фиксов

- [ ] Логин паролем (§2.1) всё ещё работает после Threads OAuth
- [ ] Onboarding можно перепройти? (нет, completed — но можно reset через админа если нужно)
- [ ] Custom memory blocks сохраняются между сессиями агента
- [ ] `/content-calendar` с 0 постов — пустое состояние не крашится
- [ ] Dark mode / high-contrast — если поддерживаем, проверить
- [ ] Mobile ≤900px: `PricingModal` 1 колонка, calendar scrollable, sidebar collapsible (если реализовано)
- [ ] Перезапуск backend во время SSE: клиент видит разрыв, не крашится

---

## Критерии готовности

- 🟢 **Все §§1–10** зелёные → фичи работают
- 🟢 **§11** зелёный → безопасность и edge cases закрыты
- 🟡 **§11.7 landing** — отдельное решение с маркетингом, не блокер
- 🟢 **§12** зелёный → без регрессий

Красное = фикс с указанием шага (`§5.1 fail: balance=0 не открывает modal`) + логи backend/browser console.
