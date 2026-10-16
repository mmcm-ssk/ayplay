# Implementation Plan: Учётные записи и синхронизация избранного

## Overview

Добавить полноценную авторизацию (регистрация/вход/выход, «запомнить меня») и синхронизацию избранного + настроек плеера на сервер через PHP JSON-хранилища. Гости работают как раньше (локально). После входа браузерные данные сливаются с аккаунтом (аккаунт первичен).

Спека: `tasks/SPEC-accounts.md`.

## Architecture Decisions

- **Backend**: один файл `api/auth.php` (register/login/logout/me + sendToken для «запомнить меня») и один `api/favorites.php` (GET/PUT избранное+настройки). Пароли только `password_hash()`. Сессии через PHP session + cookie.
- **Хранилище**: JSON-файлы `api/users.json`, `api/favorites.json`, `api/auth_fail.json`. Все — в `.gitignore` (НЕ коммитить). Доступ через PHP, напрямую запрещён `.htaccess` в `api/` (или через существующий корневой `.htaccess` добавить RewriteRule).
- **«Запомнить меня»**: relogin-токен, хранится в `users.json` per user (token => hash), отдельная cookie `ayp_remember`. Проверка при `action=me`.
- **Merge при входе**: аккаунт первичен (settings и favorites из аккаунта), браузерные восполняют только пустые/отсутствующие поля. Настройки применяются через тот же механизм restore, что уже есть в `ayPlayer.js` (блок `getItem(me)` ~101819).
- **Клиент**: `player/ui/auth-ui.js` (меню about/help/login + модалка), правки в `ayPlayer.js` (toggleFavorite + xe() синхронизация). Стили — в `ayPlayer.css`.
- **Меню сверху**: about, help, login — рендерится из `auth-ui.js`/`ayPlayer.js` в `index.html` (над `#player`). about/help — простые модалки или статичные блоки (без отдельных страниц, чтобы не плодить роутинг).
- **Лимит попыток**: файловый, 5 неудач / 15 мин на IP (через `auth_fail.json`).
- Локальный дев: `php -S localhost:8080` + включить DELETE/POST через fetch (same-origin, ок).

## Task List

### Phase 1: Backend (api/auth.php + favorites.php)

- [ ] Task 1: api/auth.php — register/login/logout/me
- [ ] Task 2: «Запомнить меня» (relogin token) + лимит попыток
- [ ] Task 3: api/favorites.php — GET/PUT избранное + настройки
- [ ] Task 4: `.htaccess` защита JSON + `.gitignore`.

### Checkpoint: Backend
- [ ] `php -l` всех файлов ок
- [ ] Ручной тест curl: register → login → me → favorites PUT/GET → logout
- [ ] Ошибки: дубль ника, слабый пароль, лимит попыток
- [ ] JSON-файлы недоступны по HTTP

### Phase 2: Frontend auth UI

- [ ] Task 5: player/ui/auth-ui.js — меню (about/help/login) + модалка входа/регистрации
- [ ] Task 6: стили меню/модалки в ayPlayer.css
- [ ] Task 7: подключение в index.html + sw.js (кэш-список)

### Checkpoint: Auth UI
- [ ] Меню рендерится, модалка открывается/закрывается, вкладки Вход/Регистрация работают
- [ ] Ошибки бэкенда показываются в модалке
- [ ] После входа кнопка меняется на ник + «Выйти»

### Phase 3: Синхронизация в плеере

- [ ] Task 8: toggleFavorite — писать на сервер после входа (merge локально/сервер)
- [ ] Task 9: xe() — отправлять настройки на сервер после входа; при загрузке account-me применять merge
- [ ] Task 10: восстановление состояния: после login запросить account, применить settings к плееру, перерисовать звёзды

### Checkpoint: Синхронизация
- [ ] Звёздочка появляется мгновенно + сохраняется на сервер
- [ ] Перезагрузка / другое устройство (тот же логин) — те же звёзды
- [ ] Настройки аккаунта применяются после входа
- [ ] Гостевой режим не меняется

### Phase 4: Полировка + финальная проверка

- [ ] Task 11: обработка offline/ошибок сети (тихий fallback на локальный режим), таймауты
- [ ] Task 12: финальный e2e сценарий по спец Success Criteria

### Checkpoint: Complete
- [ ] Все Success Criteria из спеки выполнены
- [ ] Меню about/help/login работает, без поломки плеера
- [ ] JSON/users не в репозитории
- [ ] Готово к коммиту (по просьбе пользователя)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Не забыть .gitignore для users.json | High | Task 4 явно добавляет в .gitignore; финальный чек `/api/users.json` не в списке git |
| Разрыв соединения при синхронизации | Med | Тихий fallback, повторная попытка при следующем действии; без потери UX |
| PHP версия хостинга | Med | Использовать только PHP 7.4+ синтаксис; избегать чужеродных функций |
| Огромный minified ayPlayer.js | Med | Таргетные маленькие вставки по известным индексам (toggleFavorite ~125944, xe ~4597, restore ~101819) |
| XSS в нике | High | Экранирование ника при выводе (`textContent`/`escapeHtml`), валидация `[a-zA-Z0-9_-]` |
| CSRF на endpoint'ах | Med | Проверка session cookie + same-origin (PHP `$_SESSION` + проверка Origin header) |

## Open Questions

- Меню about/help — отдельные страницы или модалки? (Предполагаю модалки, чтобы не трогать роутинг/SEO.)
- Хранить настройки в favorites.json той же записью «user» (favs + settings) — да, одна запись на аккаунт, меньше гонок.