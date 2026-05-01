# Research: Threads Insights — Analytics Dashboard & Per-Post Stats

## Цель

Изучить, какие метрики мы можем собирать из Threads Graph API на двух уровнях:

1. **Аккаунт целиком** — дневная динамика "вырос/упал за день / неделю / месяц"
2. **Каждый отдельный пост** — текущий срез (lifetime totals)

И на основе этого предложить варианты реализации.

---

## 1. Что даёт Threads API (полный список метрик)

Источник: [developers.facebook.com/docs/threads/insights](https://developers.facebook.com/docs/threads/insights). Scope: `threads_basic` + `threads_manage_insights` (оба у нас уже выданы — см. `threads-api.service.ts:48`).

### 1.1 User-level — `GET /{threads-user-id}/threads_insights`

| Метрика | Тип ответа | Range (`since`/`until`) | Что показывает |
|---|---|---|---|
| `views` | **Time Series** (`values[]` с `end_time` по дням) | ✅ | Просмотры профиля, разбито по дням |
| `likes` | Total Value (одна цифра за период) | ✅ | Сумма лайков на всех постах за период |
| `replies` | Total Value | ✅ | Top-level replies (без вложенных) |
| `reposts` | Total Value | ✅ | Сколько раз репостили |
| `quotes` | Total Value | ✅ | Сколько раз цитировали |
| `clicks` | Link Total Values (массив `{link_url, value}`) | ✅ | Клики по конкретным URL из постов |
| `followers_count` | Total Value | ❌ только текущее | Текущее число подписчиков |
| `follower_demographics` | Total Value + breakdown | ❌ только текущее | Demographics по `country` / `city` / `age` / `gender` (один breakdown за запрос). Минимум 100 фолловеров. |

**Доступная история:** с **13 апреля 2024** (Unix `1712991600`). До этой даты данных нет вообще.
**Default range при отсутствии since/until:** последние 2 дня.

### 1.2 Per-post — `GET /{threads-media-id}/insights`

| Метрика | Тип | Что показывает |
|---|---|---|
| `views` | Lifetime (одна цифра, накопительно) | Просмотры/показы поста |
| `likes` | Lifetime | Лайки |
| `replies` | Lifetime | Top-level replies (для root post) или direct replies (если это сам ответ) |
| `reposts` | Lifetime | Репосты |
| `quotes` | Lifetime | Цитаты |
| `shares` | Lifetime | Шеринг |

**Все метрики — lifetime (накопительно с момента публикации).** Time-series по постам API не отдаёт.
**Не отдаёт:** saves/bookmarks, profile_visits, follows_from_post, demographics поста.
**Пустой массив** для `REPOST_FACADE` (репостов чужого контента).

### 1.3 Что НЕ ходит в API

- Saves / bookmarks
- Profile visits с поста
- Follows from post
- Per-post demographics
- Время прочтения / engagement time
- Reach (отдельно от views)
- Карусель — каждый кадр отдельно

---

## 2. Ключевые ограничения, влияющие на дизайн

### 🔴 Главное ограничение: history follower_count

`followers_count` **не поддерживает `since`/`until`** — отдаёт только текущее значение. Чтобы показать "+12 за неделю / -3 за день" мы **обязаны снимать снапшоты сами** в БД. API не даст исторический график подписчиков.

### 🟡 Аккумулированные метрики vs дневные

- `likes`, `replies`, `reposts`, `quotes`, `clicks` за период — это **сумма за период**, а не дельта на конкретный день. Можно дёрнуть API три раза (24h / 7d / 30d) и получить три цифры.
- `views` единственная даёт daily breakdown.
- Чтобы построить "график лайков по дням" — снова нужны свои снапшоты (или ежедневные since=00:00 / until=23:59 запросы).

### 🟡 Per-post — только lifetime

Чтобы на странице поста показать "+50 views за сутки" нужно сравнить два снапшота. Сейчас в БД уже есть `ThreadsInsightsSnapshot` (см. `prisma/schema.prisma:401`) — но он создаётся только по запросу пользователя через `POST /threads/insights/:contentIdeaId/refresh`.

### 🟡 Earliest data = 13 April 2024

Если пользователь подключил Threads сегодня — историю до момента подключения мы получим только начиная с этой даты. Дольше история не доступна.

### 🟡 Demographics порог

`follower_demographics` требует **минимум 100 подписчиков** — иначе API вернёт ошибку. Нужно gracefully handle.

---

## 3. Текущее состояние в проекте

**Backend (`services/threads-api.service.ts`, `routes/threads.ts`):**

- `getProfileInsights(threadsUserId, accessToken, since, until)` — дёргает 6 метрик (`likes,replies,reposts,quotes,followers_count,views`). `clicks` и `follower_demographics` **не запрашиваются**.
- `GET /threads/insights` — возвращает агрегаты за **последние 30 дней** (один срез).
- `POST /threads/insights/:contentIdeaId/refresh` — снапшотит 6 lifetime-метрик поста в `ThreadsInsightsSnapshot`.
- `GET /threads/post-insights/:threadsPostId` — то же самое, но без сохранения.

**DB (`prisma/schema.prisma`):**

- `ThreadsAccount` — текущий стейт аккаунта, `postsCount` накапливается локально. **Нет полей followers / engagement.**
- `ThreadsInsightsSnapshot` — есть, но привязан к `contentIdeaId`, индекс `[contentIdeaId, fetchedAt(sort: Desc)]`. Хранит lifetime-снимки постов.

**Frontend (`components/threads/ThreadsStats.vue`):**

- Карточки за 30 дней: Followers, Posts, Eng. Rate, Likes (30d), Replies (30d), Reposts+Quotes (30d). Один срез, без сравнения с прошлым периодом, без динамики.

**Чего нет:**

- Снапшотов аккаунта во времени → не из чего считать "вырос/упал".
- Регулярного фонового сбора per-post insights → пользователь должен жмякать refresh.
- Demographics + clicks UI.
- Агрегации/чартов по дням.

---

## 4. Варианты реализации

### Цель А — Дневная динамика по аккаунту

#### Вариант А1. Daily snapshot worker (рекомендуется)

**Идея.** Один раз в сутки (cron в `node-cron` — у нас уже стоит scheduler в `threads-scheduler.service.ts`) для каждого подключённого `ThreadsAccount` снимаем полный срез в новую таблицу.

**Новая модель `ThreadsAccountSnapshot`:**

```prisma
model ThreadsAccountSnapshot {
  id               String   @id @default(cuid())
  threadsAccountId String
  threadsAccount   ThreadsAccount @relation(fields: [threadsAccountId], references: [id], onDelete: Cascade)
  userId           String
  capturedAt       DateTime @default(now())
  capturedDate     DateTime // truncated to YYYY-MM-DD UTC for day-uniqueness

  // Point-in-time
  followersCount   Int

  // Cumulative-since-13-Apr-2024 totals (для расчёта дельт)
  likesTotal       Int
  repliesTotal     Int
  repostsTotal     Int
  quotesTotal      Int
  viewsTotal       Int
  clicksTotal      Int

  // Optional snapshots
  postsCount       Int

  @@unique([threadsAccountId, capturedDate])
  @@index([threadsAccountId, capturedAt(sort: Desc)])
}
```

**Логика воркера** (новый сервис `threads-insights-snapshot.service.ts`):

1. Cron — `0 3 * * *` (каждый день в 03:00 UTC, можно подвинуть).
2. Для каждого аккаунта с непротухшим токеном:
   - `followers_count` → отдельный запрос (без since/until).
   - `likes,replies,reposts,quotes,views,clicks` с `since=1712991600` (13 Apr 2024), `until=now` → cumulative totals с момента появления API.
   - Upsert по `(threadsAccountId, capturedDate)` чтобы повторный запуск не дублировал.

**Расчёт дельт на запрос пользователя:**

`GET /threads/insights/timeline?period=day|week|month`

```ts
const today = await getLatestSnapshot();
const previousDate = subDays(today.capturedDate, 1 | 7 | 30);
const previous = await getSnapshotByDate(previousDate);

// дельта
delta.followers = today.followersCount - previous.followersCount;
delta.likes     = today.likesTotal     - previous.likesTotal;
// ... и т.д.
```

**Плюсы:**
- Полная история, любой период — 1d / 7d / 30d / custom range.
- Можно строить графики (линейный график followers по дням).
- Дёшево по API (1 запрос/день/аккаунт).
- Сравнения "период vs предыдущий период".

**Минусы:**
- Новая таблица + cron + миграция.
- В первый день после релиза дельт ещё нет — нужен fallback "Not enough data yet".

#### Вариант А2. On-demand агрегация через 3 запроса

Без снапшотов: на каждый запрос с фронта дёргать `/me/threads_insights` 3 раза параллельно (since=24h ago, since=7d ago, since=30d ago).

**Плюсы:** ноль миграций, реализуется за час.
**Минусы:**
- Нельзя показать **рост followers** — это API не отдаёт за период.
- Нет графика по дням (кроме `views`).
- 3 API-запроса на каждый просмотр дашборда → быстро упрёмся в rate-limit.

**Вердикт:** не годится как единственное решение — упускаем followers growth, который и есть главный сигнал для креатора.

#### Вариант А3. Гибрид (А1 + А2)

Снапшот для followers + ежедневная сумма (для дельт). Остальные метрики дёргаем через API on-demand с разными `since/until`. Сложнее, но экономит storage. **Не рекомендую** — сложность больше выгоды, А1 делает то же самое и быстрее на чтение.

### Цель Б — Аналитика по постам

Сейчас уже есть `ThreadsInsightsSnapshot`, но он наполняется руками.

#### Вариант Б1. Daily refresh для всех опубликованных постов

В тот же воркер из А1 добавляем шаг: для каждого `ContentIdea` со статусом `posted` (или для всех `ScheduledPost` со статусом `published`) за последние N дней:

- Дёргаем `/{threadsPostId}/insights` (6 метрик).
- Пишем в `ThreadsInsightsSnapshot`.

**N = 30 дней** — после этого engagement затухает, экономим запросы.

**Расчёт "прирост за сутки" в UI:** `latest_snapshot - snapshot_24h_ago`.

**Плюсы:**
- Юзер видит свежие данные без кнопки refresh.
- Появляется график "engagement по дням после публикации".
- Можно агрегировать "топ постов" по разным периодам.

**Минусы:**
- 1 запрос/пост/день → у активного юзера 30+ запросов/день. Терпимо. По соображениям rate-limit можно батчить **по 5 параллельно** с `Promise.allSettled`.

#### Вариант Б2. Lazy refresh при открытии страницы поста

Только при просмотре конкретного поста — если последний снапшот старше 1 часа, делаем новый.

**Плюсы:** минимум запросов.
**Минусы:** для "топ постов" / списка нужны свежие данные сразу — иначе сортировка соврёт.

**Рекомендация:** **Б1 для постов, опубликованных < 7 дней назад** (где engagement живой) + **Б2 для всех остальных** (на случай ручного просмотра старого поста).

### Цель В — Расширение метрик

Что добавить помимо текущей шестёрки:

1. **`clicks`** — top-3 кликаемых ссылок из постов. Полезно для тех, кто кладёт CTA-ссылки.
2. **`follower_demographics`** — отдельный таб "Audience" с breakdown по странам/городам/возрасту/полу.
   - Дёргать раз в день в том же воркере.
   - Хранить в отдельной таблице `ThreadsAudienceSnapshot { capturedDate, breakdownType, breakdownValue, count }` (длинная таблица — удобно фильтровать).
   - На фронте gracefully handle случай "<100 followers".
3. **`shares`** — уже доступен в per-post, не забыть в UI.

---

## 5. Рекомендуемый план

**Phase 1 — Account daily growth (Цель А)**

1. Миграция: модель `ThreadsAccountSnapshot`.
2. Сервис `threads-insights-snapshot.service.ts` + cron в `index.ts` (по аналогии с `threadsSchedulerService.start()`).
3. Endpoint `GET /threads/insights/timeline?period=day|week|month` → возвращает текущие значения + дельты.
4. UI: рефактор `ThreadsStats.vue` — переключатель "Day / Week / Month", каждая карточка показывает значение + дельту (`+12` / `-3`) + arrow.

**Phase 2 — Per-post auto refresh (Цель Б)**

5. В тот же cron-воркер: refresh insights для постов опубликованных < 7 дней назад.
6. Endpoint `GET /threads/posts/insights?contentIdeaIds=...` → последний снапшот + 24h delta для списка постов.
7. UI: на карточке поста — counters + маленькая зелёная/красная стрелка с суточным приростом.

**Phase 3 — Расширенная аналитика (Цель В)**

8. Добавить `clicks` в воркер. UI: блок "Top clicked links".
9. Добавить `follower_demographics` (4 breakdowns × 1 запрос/день = 4 запроса/аккаунт/день). Новая таблица `ThreadsAudienceSnapshot`. UI: таб "Audience" со столбчатыми диаграммами.

**Phase 4 — Графики**

10. Endpoint для time-series (день/неделя/месяц): `GET /threads/insights/series?metric=followers&days=30`.
11. UI: line chart на дашборде (Chart.js / vue-chartjs / or Lightweight Charts).

---

## 6. Открытые вопросы для уточнения

1. **Часовой пояс снапшота** — UTC midnight или UTC 03:00? Влияет на то, как юзер видит "сегодня".
   - Предложение по умолчанию: **UTC 03:00**, в UI всё показывать в TZ юзера (берём из `MemoryBlock` если есть, иначе UTC).

2. **Backfill при первом подключении** — делать ли разовый pull истории с 13 Apr 2024 в момент `threads/callback` чтобы юзер сразу видел дельты, или ждать 7 дней пока накапаем снапшоты?
   - Предложение: **разовый pull cumulative totals + followers за момент подключения**, далее ежедневно.

3. **Retention снапшотов** — хранить вечно или резать по N месяцам?
   - Предложение: **вечно** — данные мизерные (1 строка на аккаунт в день).

4. **Rate-limit на Threads API** — официальной документации нет. Стоит обернуть запросы в простой in-memory throttle (max 5 concurrent / 1 sec gap).

5. **Failed snapshots** — что показывать если воркер упал? Дельта будет некорректной.
   - Предложение: помечать снапшот как `partial: true` если хотя бы одна метрика не пришла, в UI показывать предупреждение.
