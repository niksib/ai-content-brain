# План мануального тестирования (от нуля до всех фич)

## 0. Preflight (один раз перед началом)

- [ ] Запустить миграции: `cd packages/backend && npx prisma migrate deploy`
- [ ] Перегенерить Prisma client: `npx prisma generate`
- [ ] В Stripe Dashboard (test mode) создать 2 продукта:
  - Creator — $20/month recurring → скопировать `price_xxx` в `STRIPE_PRICE_CREATOR`
  - Pro — $40/month recurring → `STRIPE_PRICE_PRO`
- [ ] Запустить `stripe listen --forward-to localhost:3001/api/billing/webhook` → webhook secret в `STRIPE_WEBHOOK_SECRET`
- [ ] Поднять backend + frontend, открыть `/` в инкогнито

---

## 1. Лендинг глазами нового юзера

Открыт `/` в чистой вкладке, не залогинен.

- [ ] Hero: **нет** счётчика "1,247 creators posting from their walk today"
- [ ] Hero subtitle: читается "on Threads. LinkedIn, Instagram, X coming soon."
- [ ] Под hero — бегущая строка с 10 фрагментами (про клиентов, launch, productivity advice, Sarah, и т.д.) — не про "call mom" / "Cheyenne"
- [ ] Секция "The Loop": карточка 02 "We listen" показывает "We find ideas. We suggest 2-3 posts worth making. You pick."
- [ ] Секция "One voice note. Four native drafts.":
  - [ ] Таб Threads активный, подсвечивается при наведении
  - [ ] Табы LinkedIn / Reels / X серые, с мини-бейджем "Soon", не кликаются
  - [ ] Иконка Threads в табе чёткая, читается что это "@"
  - [ ] LinkedIn, Instagram, X иконки одного размера (18px), чёткие
  - [ ] В превью-карточке справа аватар Threads с читаемой иконкой (не размытая)
- [ ] **Нет** блока с цитатой Maya Okafor / "42k followers"
- [ ] Секция Pricing: 3 плана — Free $0/100 credits, Creator $20/1000 (Most Popular), Pro $40/2000
- [ ] Final CTA "Your next post is already in your head": hover на кнопке "Start talking" → тёмно-индиго фон (не светло-фиолетовый)

---

## 2. Регистрация через Threads (рекомендуемый путь)

- [ ] Нажать "Sign in" в навигации → модалка открылась
- [ ] Над email-формой видна кнопка "Continue with Threads" + разделитель "or"
- [ ] Клик "Continue with Threads" → редирект на `threads.net/oauth/authorize`
- [ ] Залогиниться / подтвердить permissions на threads.net
- [ ] Редирект обратно → попадаешь на `/onboarding?threads_connected=true`
- [ ] **Проверка в БД:** создан `User` с email `threads-<your-threads-id>@postrr.local`, привязан `ThreadsAccount` с accessToken
- [ ] **Проверка:** начислились триал-кредиты 150 (`CreditBalance.balance = 150`)
- [ ] Cookie `better-auth.session_token` установлена

> **Важно (для dev с ngrok):** front и back должны быть на одном eTLD+1 (или оба через ngrok), иначе Chrome не дотащит куку после редиректа из-за cookie partitioning. Для локального теста можно залогиниться паролем под созданным юзером: email `threads-<id>@postrr.local`, пароль = `HMAC(BETTER_AUTH_SECRET, "threads-login:<threadsUserId>")`.

---

## 3. Онбординг

На `/onboarding`, Threads уже подключён после логина.

- [ ] **Step 1 Connect:** если Threads аккаунт уже привязан (логинились через Threads):
  - Бабл: "Hi, I'm Ori... I can see your Threads account, **<имя/юзернейм>**..."
  - Кнопка: **"Continue"** (со стрелкой)
  - Ссылка "Continue without Threads" скрыта
  - Клик "Continue" → сразу анализ, без OAuth повторно
- [ ] Появляется экран Analyzing (крутится лоадер пока идёт анализ постов)
- [ ] Через ~10-30 сек переходит в Questions
- [ ] **Проверка вопросов (баг #1):**
  - Если агент добавил `bubbleContext` — видно И контекст сверху ("I noticed...") И сам вопрос
  - Текст разделён пустой строкой, не слитый
  - Вопрос не обрывается на середине фразы
- [ ] Кликать чипы-опции, отвечать на 3-4 вопроса подряд
- [ ] Last question (anti-patterns) — чипы про "post styles to avoid"
- [ ] После последнего вопроса → Finalizing → Summary
- [ ] Summary: 3-5 предложений про себя, можно отредактировать через clarification
- [ ] Нажать Save → редирект на `/dashboard`

---

## 4. /creator-profile и custom memory blocks

- [ ] Перейти на `/creator-profile`
- [ ] Видны канонические блоки (niche, audience, voice_tone и т.д.) с текстом из онбординга
- [ ] Под ними — кнопка **"+ Add custom memory"**
- [ ] Клик → появляется форма (title, description, textarea)
- [ ] Ввести title "My no-go topics" → под textarea виден live-preview ключа `my_no_go_topics`
- [ ] Попробовать title "niche" → ошибка красным: "niche" is reserved for a canonical block
- [ ] Попробовать пустой content → кнопка "Add block" disabled
- [ ] Заполнить валидно → "Add block" → форма закрылась, новый блок появился в списке
- [ ] Обновить страницу → новый блок на месте
- [ ] На кастомном блоке видна кнопка "Remove" → клик → блок удалился
- [ ] На канонических блоках **нет** кнопки Remove
- [ ] Редактировать содержимое канонического блока → Save → сохраняется

---

## 5. Сессия и идея — отложенная публикация

- [ ] На `/dashboard` создать новую сессию (Voice note / Chat)
- [ ] Записать голосовую или надиктовать текстом 1-2 мин на интересную тему
- [ ] Агент создаёт контент-план с идеями → кликнуть на идею
- [ ] На странице идеи агент сгенерирует Threads post
- [ ] **Проверка hover (баг #3):** когда агент правит карточку → навести мышь → индиго-свечение не пропадает
- [ ] Готовый пост → нажать **"Publish now"**
- [ ] **Ожидание:** под кнопкой сообщение "Your post is queued, it'll publish in about a minute."
- [ ] Статус идеи → `scheduled`, в БД создана `ScheduledPost` со `status=pending`
- [ ] Подождать ~1-2 мин (крон раз в минуту проверяет)
- [ ] Статус идеи → `posted`
- [ ] Открыть Threads в браузере → пост реально опубликован
- [ ] **Повторить** с мульти-тредом (несколько связанных replies) — публикуется цепочкой
- [ ] **Повторить** с прикреплённым медиа (картинкой) — публикуется с медиа

---

## 6. /content-calendar

- [ ] Перейти на `/content-calendar`
- [ ] Пост из шага 5 (уже опубликован) должен быть в сегодняшнем дне (баг #4 — `publishedAt`, не `createdAt`)
- [ ] Если есть старые posted-посты — у них тоже правильная дата (backfill сработал)
- [ ] В хедере календаря рядом со стрелками — primary-indigo кнопка **"Schedule post"**

### 6.1 Schedule Post popup (создание)
- [ ] Клик "Schedule post" → модалка
- [ ] Таб Threads активен, остальные 3 — серые с "Soon", не кликаются
- [ ] В "When" видна строка "Times are in your local timezone (Europe/Kyiv)" (или твоя TZ)
- [ ] Попробовать дату в прошлом → кнопка Schedule disabled
- [ ] Ввести текст >500 символов → счётчик оранжевый, >500 кнопка disabled
- [ ] Нажать "+ Add reply" → появляется второй пост в списке
- [ ] В первом посте: "Attach media" → загрузить .jpg или .png → появляется бейдж `IMAGE` + кнопка Remove
- [ ] Прикрепить .mp4 → бейдж `VIDEO`
- [ ] Заполнить: 2 поста, медиа в первом, дата+время через 3-5 минут, Schedule
- [ ] Модалка закрывается
- [ ] Пост появляется на календаре в нужной ячейке с бейджем **Sched**
- [ ] Подождать → крон опубликовал, bubble меняет статус на **Posted**

### 6.2 Редактирование и удаление scheduled-поста
- [ ] Создать пост на будущее (через шаги 6.1)
- [ ] Клик на bubble этого поста в ячейке календаря → открывается модалка в режиме **Edit scheduled post**
- [ ] Поля (текст, треды, медиа, дата, время) уже заполнены из поста
- [ ] Справа кнопка **"Save changes"**, слева красная **Delete**
- [ ] Изменить текст / дату → Save changes → ячейка обновляется
- [ ] Открыть снова → Delete → confirm → пост удалился из календаря и БД
- [ ] На **published**-посте клик ничего не делает (курсор обычный, hover-эффекта нет)

---

## 7. /settings — баг #5 + текущий план

- [ ] Открыть `/settings`
- [ ] Секция Subscription:
  - Plan: **Free**
  - "Renews on" не показано (у Free нет periodEnd)
  - Progress bar "Monthly Limit" (не "Credits Used") — показывает % использованных от 100 кредитов
  - Под прогресс-баром "N of 100 credits remaining"
  - Кнопка **"Upgrade"** (ведёт на /pricing)
  - Нет кнопки "Buy Credits" / "Buy Usage"
  - Нет кнопки "Manage billing" (только для платных)
- [ ] В Account секции работает Change Password, Delete Account (не тестировать последнее на рабочем юзере)

---

## 8. Logout (баг #2)

- [ ] В сайдбаре нажать Logout
- [ ] **Ожидание:** редирект на `/` + полный reload страницы
- [ ] DevTools → Network → `POST /api/auth/logout` вернул **200**
- [ ] DevTools → Application → Cookies → `better-auth.session_token` удалена
- [ ] Попытка открыть `/dashboard` в новой вкладке → редирект на `/` (middleware)
- [ ] Снова залогиниться тем же Threads аккаунтом → тот же User.id, сессия восстановлена

---

## 9. Stripe subscription — Free → Creator

- [ ] Залогинен, на `/settings` текущий план Free
- [ ] Клик "Upgrade" → `/pricing`
- [ ] Видны 3 плана, у Free кнопка "Current plan" disabled
- [ ] На Creator клик "Choose plan"
- [ ] Редирект на Stripe Checkout
- [ ] Оплатить тестовой картой `4242 4242 4242 4242`, любой CVC, будущая дата
- [ ] Редирект на `/settings?billing=success`
- [ ] Зелёное сообщение "Payment successful! Your plan is active."
- [ ] Plan: **Creator**, "Renews on <дата через месяц>"
- [ ] Balance обновился на 1000 (credits сбросились на plan allowance)

### Проверки через Stripe CLI / Dashboard
- [ ] В `stripe listen` терминале видно события: `checkout.session.completed`, `customer.subscription.created`, `invoice.paid` — все 200 OK
- [ ] В БД: `Subscription` создался с `plan=creator`, `status=active`, `stripeSubscriptionId` заполнен
- [ ] `CreditBalance.balance = 1000`, в `CreditTransaction` — запись `subscription_grant` на +1000

### Credit burn на renewal (симулировать)
- [ ] Использовать несколько кредитов (начать сессию, создать пост)
- [ ] В Stripe Dashboard → Subscriptions → найти свою → Actions → **"Invoice upcoming now"** или вручную создать invoice и оплатить
- [ ] Или через CLI: `stripe trigger invoice.paid --override invoice:subscription=sub_xxx`
- [ ] **Ожидание:** `invoice.paid` webhook → в БД `CreditBalance.balance = 1000` (полный сброс, остаток сгорел)
- [ ] Транзакция `subscription_grant` на +1000 с новым `reference`

---

## 10. Manage billing / upgrade / cancel

- [ ] На `/settings` появилась кнопка **"Manage billing"**
- [ ] Клик → редирект на Stripe Customer Portal
- [ ] В портале сменить план с Creator на Pro
- [ ] Вернуться → refresh `/settings`
- [ ] Plan: **Pro**, Monthly Limit показывает 2000
- [ ] Balance пересчитался? (зависит от Stripe proration — кредиты могут обновиться на следующем invoice)

### Отмена
- [ ] Manage billing → Cancel subscription (at period end)
- [ ] Вернуться на `/settings`
- [ ] "Cancels on <date>" вместо "Renews on", Plan всё ещё Pro
- [ ] После `currentPeriodEnd` → webhook `customer.subscription.deleted` → Plan = Free, balance = 100

---

## 11. Edge cases / регресс

- [ ] Открыть страницу идеи где агент редактирует (hover highlight должен держаться) — баг #3
- [ ] /pricing в инкогнито (без логина) — видны планы, но клик "Choose plan" должен попросить логин (или упасть на API — проверить)
- [ ] Threads login → /onboarding: `threads_connected=true` корректно запускает analyze, не показывает ошибку
- [ ] Сетевой failover: остановить backend → попытаться logout → frontend всё равно редиректит на `/` и чистит локальную сессию
- [ ] Schedule Post с файлом > 25 MB → backend отклоняет с ошибкой (см. gcs validation)

---

## Критерии готовности

Всё зелёное → можно катить в прод.

Если что-то красное — фикс с указанием шага, в котором упало (например, "шаг 5.3, Publish now вернул 500") — пришли логи.
