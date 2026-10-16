# Tasks: Учётные записи и синхронизация избранного

План: `tasks/plan.md` · Спека: `tasks/SPEC-accounts.md`

## Phase 1: Backend

### Task 1: api/auth.php — register / login / logout / me
- **Description:** Создать `api/auth.php` с действиями: `register` (ник `[a-zA-Z0-9_-]{3,32}`, пароль ≥6, `password_hash()`), `login`, `logout`, `me` (профиль по сессии). JSON-ответы `{ok, ...}` / `{ok:false, error}`. Сессии через PHP `session_start()`, cookie SameSite=Lax.
- **Acceptance:**
  - [ ] Регистрация создаёт запись в `api/users.json`; ник уникален; ошибки валидных полей возвращают дружелюбную ошибку
  - [ ] login открывает сессию; me возвращает `{nick}`; logout разрушает сессию
  - [ ] Все ответы `Content-Type: application/json; charset=utf-8`
- **Verify:** `php -l api/auth.php`; curl-сценарий register/login/me/logout
- **Files:** `api/auth.php`, `api/users.json` (runtime)
- **Scope:** M

### Task 2: «Запомнить меня» + лимит попыток
- **Description:** В `auth.php` добавить relogin-токен (случайный, хранится в `users.json`, cookie `ayp_remember`) для флажка «запомнить меня»; при `me` — восстановление сессии по токену. Добавить лимит попыток 5/15 мин по IP через `api/auth_fail.json` на `login`.
- **Acceptance:**
  - [ ] С cookies remember сессия переживает закрытие браузера (при `me` без активной PHP сессии токен восстанавливает её)
  - [ ] 6-я неудачная попытка за 15 мин → ошибка «попробуйте позже»; счётчик тает через 15 мин
- **Verify:** `php -l`; curl с `-c/-b` cookie jar; имитация неудач
- **Files:** `api/auth.php`, `api/auth_fail.json` (runtime)
- **Scope:** M (расширяет Task 1)

### Task 3: api/favorites.php — избранное + настройки
- **Description:** `GET favorites.php` (аутентификация сессии) → `{favs:[file...], settings:{...}}`. `PUT favorites.php` с JSON `{favs, settings}` → сохранить `api/favorites.json` (`[ник => {favs, settings}]`) c `LOCK_EX`. Валидация ключей settings по списку из `xe()`.
- **Acceptance:**
  - [ ] GET возвращает данные текущего пользователя или пустые
  - [ ] PUT сохраняет; повторный GET отдаёт то же
  - [ ] Неизвестные ключи settings игнорируются; favs — массив строк ≤ 5000
- **Verify:** `php -l`; curl register→login→PUT→GET
- **Files:** `api/favorites.php`, `api/favorites.json` (runtime)
- **Scope:** M

### Task 4: Защита JSON + .gitignore
- **Description:** Добавить в корневой `.htaccess` (или `api/.htaccess`) запрет прямого доступа к `api/*.json` (пользователи/избранное/лимиты), оставив доступ через PHP. Добавить `api/users.json`, `api/favorites.json`, `api/auth_fail.json` в `.gitignore`.
- **Acceptance:**
  - [ ] `GET /api/users.json` → 403/404
  - [ ] `git status` не показывает json-файлы (кроме уже существующих карт)
- **Verify:** локальный `php -S` + `curl -i`, `git status --short`
- **Files:** `.htaccess`, `.gitignore`
- **Scope:** S

## Checkpoint: Backend
- [ ] `php -l` всех файлов ок
- [ ] curl register → login → me → favorites GET/PUT → logout
- [ ] Ошибки: дубль ника, слабый пароль, лимит попыток
- [ ] JSON-файлы недоступны по HTTP

## Phase 2: Frontend auth UI

### Task 5: player/ui/auth-ui.js — меню + модалка
- **Description:** Модуль: рендер меню `about help login` сверху (в `index.html` над `#player`), модалка с вкладками «Вход»/«Регистрация», поля ник/пароль/чекбокс «запомнить меня», кнопки «Войти»/«Выйти». После входа меню показывает ник. about/help — простые модалки со статичным текстом.
- **Acceptance:**
  - [ ] Меню рендерится; клики открывают нужные модалки
  - [ ] Вход/регистрация через `api/auth.php`; ошибки показываются в модалке
  - [ ] После входа кнопка «login» → ник + «Выйти»; «Выйти» вызывает logout и обновляет UI
  - [ ] Все вставки ника через `textContent`
- **Verify:** локальный `php -S`, мануальные клики, `node --check player/ui/auth-ui.js`
- **Files:** `player/ui/auth-ui.js`, `index.html`
- **Scope:** M

### Task 6: Стили меню/модалки
- **Description:** CSS в `ayPlayer.css`: верхняя панель меню (тёмная, мелкий текст, как существующий стиль плеера), модалка с вкладками, поля, кнопки, состояния ошибок.
- **Acceptance:**
  - [ ] Меню и модалка читаемы в тёмной теме, не разбивают плеер (z-index, переиспользуемый класс модалки если уже есть)
  - [ ] На мобильных не ломается (max-width, overflow)
- **Verify:** визуальный мануальный чек на desktop + mobile-вью
- **Files:** `player/ayPlayer.css`
- **Scope:** S

### Task 7: Подключение в index.html + sw.js
- **Description:** Подключить `player/ui/auth-ui.js` в `index.html` (после `ayPlayer.js`, до `init.js`), добавить в кэш-список `sw.js`, поднять версии (`?v=`).
- **Acceptance:**
  - [ ] Скрипт загружается, ошибок в консоли нет
  - [ ] sw.js precache содержит новый файл с актуальным v
- **Verify:** `node --check`, консоль браузера, очистка SW кэша
- **Files:** `index.html`, `sw.js`
- **Scope:** S

## Checkpoint: Auth UI
- [ ] Меню рендерится, модалка открывается/закрывается, вкладки работают
- [ ] Ошибки бэкенда показываются
- [ ] После входа — ник + «Выйти»

## Phase 3: Синхронизация в плеере

### Task 8: toggleFavorite → сервер
- **Description:** В `ayPlayer.js` `toggleFavorite` (~125944): после локального переключения, если залогинен — отправить актуальный `te` (избранное) на `favorites.php` (PUT) фоном; при `me` мержить серверное с локальным (аккаунт первичен).
- **Acceptance:**
  - [ ] Звёздочка переключается мгновенно + уходит на сервер тихо
  - [ ] На «другом устройстве» с тем же логином звёзды совпадают
- **Verify:** двойное устройство/инкогнито, `favorites.json` меняется, `node --check`
- **Files:** `player/ayPlayer.js`
- **Scope:** M

### Task 9: xe() настройки → сервер
- **Description:** В `xe()` (~4597) после `localStorage.setItem(me,...)` — если залогинен, отправить настройки на `favorites.php`. В `applyAccount` (новая функция) мержить серверные settings.
- **Acceptance:**
  - [ ] Смена настройки (shuffle, громкость и т.д.) уходит на сервер
  - [ ] После входа применяется merge (аккаунт первичен, браузерные восполняют пустые)
- **Verify:** мануальный чек смены настроек + перезагрузка
- **Files:** `player/ayPlayer.js`
- **Scope:** M

### Task 10: restore после входа
- **Description:** После успешного login (в `auth-ui.js` колбэк) запросить `favorites.php`, применить settings через существующий restore-механизм (`getItem(me)` блок ~101819), обновить `te`, перерисовать плейлист (`Ae()`/ре-рендер звёзд).
- **Acceptance:**
  - [ ] После входа фильтры/громкость/etc изменяются на аккаунтовые
  - [ ] Звёзды перерисовываются по аккаунту
- **Verify:** вход → визуальная проверка настроек и звёзд
- **Files:** `player/ayPlayer.js`, `player/ui/auth-ui.js`
- **Scope:** M

## Checkpoint: Синхронизация
- [ ] Звёздочка мгновенно + сервер
- [ ] Другое устройство — те же звёзды
- [ ] Настройки применяются после входа
- [ ] Гость работает как раньше

## Phase 4: Полировка

### Task 11: Offline/ошибки сети
- **Description:** Тихий fallback: при недоступности `favorites.php` локальный режим, без тултипов ошибок; повторная синхронизация при следующем действии/входе.
- **Acceptance:**
  - [ ] При обрыве сети плеер работает локально, ошибок в UI нет
- **Verify:** DevTools offline
- **Files:** `player/ayPlayer.js`, `player/ui/auth-ui.js`
- **Scope:** S

### Task 12: Финальный e2e
- **Description:** Прогнать все Success Criteria из `tasks/SPEC-accounts.md`.
- **Acceptance:**
  - [ ] Все 9 пунктов спеки выполнены
  - [ ] `php -l` и `node --check` без ошибок
  - [ ] JSON-файлы не в git
- **Verify:** полный мануальный сценарий локально
- **Files:** —
- **Scope:** S

## Checkpoint: Complete
- [ ] Все Success Criteria из спеки выполнены
- [ ] Меню about/help/login работает без поломки плеера
- [ ] users/favorites json не в репозитории
- [ ] Готово к коммиту (по просьбе пользователя)