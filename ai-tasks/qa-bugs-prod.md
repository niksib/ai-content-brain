# QA Bugs — Production (heypostrr.com)

Открытые баги после retest 2026-04-25. Всё что FIXED — удалено.

> **Окружение:** prod `https://heypostrr.com`, юзер `@my.devlife`, Free-tier.

Severity: 🔴 Critical · 🟡 Warning · 🔵 Note (тех.долг или test-gap).

## TL;DR

Критических блокеров нет. Только мелкие UX-вопросы и пробелы тестирования.

1. **BUG-005** 🔵 — Remove custom memory без confirm (риск случайного удаления).
2. **BUG-003** 🟡 — title `content_goals` не reserved (легаси-имя, мелочь).
3. **BUG-002** 🔵 — обновить чеклист (canonical set расширился до 10).
4. **BUG-007/010/011/012** ⏸ — пробелы coverage, требуют DB / Stripe CLI / cron / time.

---

## 🟡 Warning

### BUG-003 🟡 Title `content_goals` не помечен как reserved

**Status:** Подтверждён 2026-04-25.
**Страница:** `/creator-profile` → `+ Add custom memory`

**Шаги:**
1. Открыть форму Add custom memory.
2. В поле title ввести `content_goals`.

**Ожидаемое:**
Ошибка «reserved for a canonical block», Add disabled.

**Фактическое:**
Ошибки нет (Add disabled только потому что content textarea пустая). Если юзер заполнит content — блок создастся с ключом `content_goals` параллельно с реальным каноническим `goal`.

**Корень причины:**
Реальный canonical-ключ называется `goal`, не `content_goals` (легаси-имя из старого чеклиста). Бэк защищает только актуальные canonicals.

**Что чинить:**
- Либо добавить `content_goals` в reserved list (на случай отката или путаницы) в `packages/backend/src/billing/plans.ts` или где определены reserved keys для memory.
- Либо обновить чеклист (см. BUG-002) и оставить как есть.

---

## 🔵 Notes

### BUG-005 🔵 Remove custom memory block без confirm-диалога

**Status:** Подтверждён 2026-04-25 (`nativeConfirmCalled=false`, `modals=0`, `blockStillThere=false` после клика Remove).
**Страница:** `/creator-profile`, кастомный memory-блок
**Severity:** Note (UX, потенциальная потеря данных)

**Шаги:**
1. Создать любой custom memory block с большим content.
2. Кликнуть **Remove**.

**Фактическое:**
Блок удаляется немедленно, без confirm-диалога/undo (ни native ни in-app). После reload — блок исчез. Юзер может случайно потерять важный текст одним кликом.

**Предложение:**
- Использовать тот же pattern что для Schedule Delete (BUG-013): inline-confirm в footer'е блока — «Delete this block? Cancel | Confirm delete». Отличный UX, уже сделан в `.sched-modal__footer`.
- Альтернатива: toast «Block removed» с кнопкой Undo (10 сек).

---

### BUG-002 🔵 Чеклист устарел: расширенный canonical memory set

**Status:** Documentation TODO, не код.

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
- В §4.1 валидации добавить проверку всех 10 ключей как reserved.

---

## ⏸ Deferred coverage (не баги, а пробелы тестирования)

Эти секции чеклиста требуют доступа к БД / Stripe CLI / cron / время. Не блокеры — это test infrastructure issues.

### BUG-007 §5.1 / §5.2 не покрыты — нужен доступ к БД

**Что не проверено:**
- При `balance < 2` клик «Create New Post» открывает `PricingModal` (а не создаёт сессию)
- Глобальный 402-интерцептор в `billing.ts` store открывает `PricingModal` на любом стримовом 402

**Что нужно:**
- Доступ к Prisma Studio / dev-эндпоинт для эмуляции `balance=0`
- Либо staging-окружение с тестовым юзером и низким балансом

---

### BUG-010 §6.3 Attach media — Chrome MCP sandbox блокирует programmatic upload

Проверено через `accept` атрибут input: `image/jpeg, image/png, video/mp4, video/quicktime`. Реальная загрузка `<input type=file>` через MCP даёт `Not allowed`. `DataTransfer + input.files` обнуляется фреймворком.

**Action:** прогнать §6.3 вручную или добавить hidden test fixture эндпоинт.

---

### BUG-011 §6.5 / §9.3-§9.9 — нужны Stripe CLI + cron-trigger + 60+ сек ожидания

§6.5 (Schedule later → дождаться cron → posted), §9.3 (Idempotency replay), §9.4 (Renewal), §9.5 (Upgrade Creator → Pro через Portal), §9.6 (Downgrade scheduled), §9.7 (Cancel at period end + симуляция cycle end), §9.8 (Payment failure), §9.9 (Idempotency на каждом хендлере).

**Action:** прогнать в отдельной сессии с `stripe listen` + `stripe trigger`.

---

### BUG-012 §7.3 Posted bubble не покрыт

Чеклист §7.3 проверяет что клик по bubble «Posted» не делает ничего. У текущего юзера нет реальных опубликованных постов (мы их не публикуем — safety rule).

**Action:** прогнать после реальной публикации (или симулировать через прямой `UPDATE ScheduledPost SET status='posted'` в БД).

---

## ✅ Закрыто после retest 2026-04-25

Удалено из активного списка, оставлено для истории:

- ~~BUG-001~~ ✅ Mobile sidebar → off-canvas + hamburger (`-translate-x-full ... lg:relative`)
- ~~BUG-004~~ ✅ Connected Platforms — `Soon` badges на 3 платформах
- ~~BUG-006~~ ✅ Vue/Nuxt SSR hydration mismatch на `/dashboard` исчез
- ~~BUG-008~~ ✅ Idea 404 — на новых сессиях все идеи возвращают 200; вчерашняя orphan-запись осталась 404 (legacy data, не код)
- ~~BUG-009~~ ✅ Cmd+Return на 2-м textarea теперь submit'ит сообщение
- ~~BUG-013~~ ✅ Schedule Delete теперь inline in-app confirm (отличный pattern, см. `.sched-modal__footer-confirm`)
- ~~BUG-014~~ ✅ PricingModal — текст "Current plan" / "MOST POPULAR" принят как лучший
- ~~BUG-015~~ ✅ Mobile email overflow — `.info-value` получил `overflow-wrap: anywhere`
- ~~BUG-016~~ ✅ Stripe env `STRIPE_PRICE_VOICE` / `STRIPE_PRICE_CHORUS` выставлены, checkout 200
- ~~REG-017~~ ✅ (intermittent / not reproducible) Session page Vue transition — на свежих сессиях с контентом рендерится корректно (`chat-state` div). Вчерашний застрявший случай был, видимо, race condition при первоначальном empty-session SSR; больше не воспроизводится.
