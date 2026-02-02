# DataCheck Pro - TODO

## Core Features
- [x] Database schema for API keys, check history, and results
- [x] Secure API key storage and management
- [x] Phone number input via text field (comma/newline separated)
- [x] CSV file upload for phone numbers
- [x] Bulk HLR request processing to Seven.io API
- [x] Results table with: phone, validity, operator, country, roaming, portability
- [x] Progress indicator during batch operations
- [x] CSV export functionality
- [x] Filter results by status, operator, country
- [x] Sort results by any column
- [x] History of previous checks
- [x] View saved results from history

## UI/UX
- [x] Elegant dark theme design
- [x] Dashboard layout with sidebar navigation
- [x] Responsive design for all screen sizes
- [x] Loading states and animations
- [x] Error handling and user feedback

## Admin Panel
- [x] Admin-only user management page
- [x] Create invite codes for new users (admin only)
- [x] View all users list
- [x] Delete user accounts
- [x] Invite-only registration system

## Design Update
- [x] Minimalist light theme design
- [x] Dark theme support with toggle
- [x] Clean white backgrounds with thin lines
- [x] Modern typography and spacing

## Bugs
- [x] Fix: getResults query called with null batchId causing validation error

## Custom Auth System
- [x] Add username and password_hash fields to users table
- [x] Create login endpoint with password verification
- [x] Create admin endpoint to create users with login/password
- [x] Build login page UI
- [x] Update admin panel to create users with credentials
- [x] Remove Manus OAuth dependency from auth flow

## SEO Fixes
- [x] Add H1 and H2 headings to home page
- [x] Set proper page title (30-60 characters)
- [x] Add meta description (50-160 characters)
- [x] Add keywords meta tag

## SEO Fixes - Login Page
- [x] Add H1 and H2 headings to login page
- [x] Set proper page title on login page
- [x] Add meta description for login page

## New Features - Security
- [x] Change password - users can change their own password
- [x] Reset password - admin can reset user password
- [x] Account lockout - block after 5 failed login attempts

## New Features - Limits & Monitoring
- [x] Check limits - restrict HLR requests per user per day/month
- [x] Low balance notification - alert when Seven.io balance is low
- [x] Action logging - record who and when made checks

## New Features - UX Improvements
- [x] Pagination - for large batches (1000+ numbers)
- [x] Re-check numbers - re-verify numbers from history
- [x] Usage statistics - dashboard with check graphs

## UI Restrictions
- [x] Balance visible only to admin users
- [x] Single phone number check (quick check without batch)

## Password Management Fix
- [x] Remove Profile page (users cannot change their own password)
- [x] Only admin can change passwords (for self and other users)
- [x] Remove Profile from sidebar menu for regular users

## Unique Features (New)
- [x] Number Health Score (0-100) - composite score based on validity, portability, roaming, history
- [x] Duplicate Detection - auto-detect duplicates before checking, show count and option to remove
- [x] Cost Calculator - show estimated cost before starting batch
- [x] Export Templates - customizable export with field selection
- [x] Admin can view all users' check history (batches from all users)

## Localization
- [x] Add Russian language support for all UI elements
- [x] Add Health Score filter (low/normal/high) in results table
- [x] Remove 1000 numbers limit - unlimited for all users
- [x] Fix HLR price from €0.02 to €0.01 per number
- [x] Full localization: Russian, Ukrainian, English with language switcher button
- [x] Complete localization - check all pages for untranslated text

## Branding
- [x] Generate and set favicon for the website

## Documentation
- [x] Create user guide with status explanations and usage instructions
- [x] Add Help/Manual page inside the application with usage guide (Help Center page created)

## Bug Fixes
- [x] Show Reachable status in results table
- [x] Make results dialog wider to fit all columns
- [x] BUG: Large batch (2700+ numbers) stops processing - timeout issue (fixed: 10 min timeout + immediate save)
- [x] CRITICAL: Save results immediately after each number check (not at the end)
- [x] Add resume functionality for interrupted batches

## Number Normalization & Validation
- [x] Normalize phone numbers to E.164 format before API call
- [x] Validate format (7-15 digits, no letters)
- [x] Filter out invalid numbers before sending to API

## Caching & Optimization
- [x] Cache results for 24-48 hours - reuse without API call
- [x] Warn about duplicates in history ("This number was checked 2 hours ago")
- [x] Warn if batch has many invalid numbers

## Export
- [x] Export to Excel (XLSX) format

## Resume Functionality
- [x] Backend API for resuming interrupted batches
- [x] UI warning for incomplete batches
- [x] Add "Resume" button in UI for incomplete batches


## Documentation
- [x] Create comprehensive README.md with hero block, features, quickstart
- [x] Add screenshots/visual materials (5 key screens added)
- [x] Document API examples (single/batch/results)
- [x] Add Security section with current measures and roadmap
- [x] Add .env configuration table
- [x] Add Tech Stack section
- [x] Add Roadmap section


## Bug Fixes
- [x] Fix: History of single HLR lookups not being saved (already implemented)


## Bug Fixes & Improvements
- [x] Add caching for previously checked numbers to avoid duplicate API calls
- [x] Show cached results indicator in UI
- [x] Fix history not being saved/displayed (single checks now save to DB)

- [x] Add duplicate cleaner tab (no API, client-side only) - Tools page
- [x] Add export filter: valid only / invalid only
- [x] Show user limits (used/total) for users with limits
- [x] Show estimated checks based on balance for users without limits

- [x] Add file upload to Tools page for duplicate cleaning

- [x] Add visual progress bar for user limits (used/available)
- [x] Show warning message when limit is exhausted


## UI Redesign
- [x] Redesign sidebar navigation (Dashboard, HLR Lookup, Batch Checker, Settings, Support)
- [x] Add Support link to Telegram (https://t.me/toskaqwe1)
- [x] Create Dashboard page with limits, usage stats, account info
- [x] Create HLR Lookup page (single check)
- [x] Create Batch Checker page (bulk check with completed batches table)
- [x] Move Billing & Usage to admin-only section
- [x] Add Language selector to header
- [x] Add Help Center link to header

## Help Center
- [x] Create Help Center page with full HLR guide
- [x] Add HLR response codes explanation (GSM codes, status meanings)
- [x] Add service features documentation
- [x] Add translations for Help Center (RU/UK/EN)
- [x] Link Help Center button in header to the page
- [x] Add FAQ/Troubleshooting section with self-help solutions

## Admin All Users History
- [x] Create backend procedure to get all batches from all users (admin only)
- [x] Update Dashboard to show all users' check history for admins
- [x] Add ability to view full report for each batch
- [x] Add user filter/search in admin history view
- [x] Show GSM error codes (lookupOutcome) in results report with descriptions
- [x] Auto-run database migrations on server start (db:push)

## History Filters
- [x] Add date sorting filter (newest/oldest first)
- [x] Add status filter (completed/in progress/all)
- [x] Add user filter dropdown (admin only)

## Admin Report Management
- [x] Add delete batch API endpoint for admins
- [x] Add delete button in Dashboard UI with confirmation dialog
- [x] Add translations for delete functionality (RU/UK/EN)

## Bug Fixes - Large Files
- [x] Fix: 2000+ numbers batch only processes 1000 numbers (MySQL IN() limit fixed with chunking)

## UI Improvements
- [x] Add real-time progress bar with percentage during batch processing

## Health Score Classification (Improved)
- [x] Implement separate qualityStatus field (high/medium/low) based on Health Score
- [x] Keep validNumber from API unchanged
- [x] Update UI to show both validity and quality statuses
- [x] Add quality filter to results
- [ ] Add translations for quality statuses (RU/UK/EN)

## UI Fix - Results Table
- [x] Remove horizontal scrollbar from results table
- [x] Make table responsive and fit all content without scrolling

## Export Improvements
- [x] Export filtered results to CSV (only numbers matching current quality filter)

## Table Sorting
- [x] Add sorting by Health Score column
- [x] Add sorting by Status column
- [x] Add sorting by Operator column

## UI Improvements - Dialog Size
- [x] Increase results dialog size to fill more screen space
- [x] Change dialog to fullscreen inline view (not modal overlay)

## Pagination
- [x] Add pagination with page size selector (50/100/1000)
- [x] Add page navigation controls

## Help Center Simplification
- [x] Simplify Help Center - remove technical info, keep only basic user guide

## GSM Codes & Status Display
- [x] Show GSM code (lookupOutcome) in results table
- [x] Show detailed status (Bad Number, Absent Subscriber, etc.) in results
- [x] Add GSM codes documentation to Help Center

## GSM Display Fix
- [x] Show both text status AND numeric GSM code (e.g. "Bad Number (1)")
- [x] Add numeric GSM codes to Help Center table

## Validity Status Fix
- [x] Numbers with GSM codes 1, 5, 9, 12 (Bad Number, Blocked) should show as "invalid" status

## Major Features - Security & Reliability

### Retry Logic
- [x] Add retry mechanism for Seven.io API calls (3 attempts with exponential backoff)
- [ ] Log retry attempts in action_logs

### Graceful Shutdown
- [x] Save batch processing state on server shutdown
- [x] Resume interrupted batches on server restart

### Auto-logout
- [x] Add inactivity timeout (30 min default)
- [x] Show warning before auto-logout
- [x] Clear session on timeout

### Sessions Management
- [x] Create sessions table in database
- [x] Track active sessions per user (device, IP, browser)
- [x] UI to view active sessions
- [x] Logout from specific session
- [x] Logout from all sessions

### Login History UI
- [x] Create login history page for users
- [x] Show: date, IP, browser, location, status
- [x] Filter by action type
- [ ] Admin can view any user's login history

### Audit Actions UI
- [x] Create audit log page for admin
- [x] Show all user actions with filters
- [x] Export audit log to CSV
- [x] Search by user, action type, date

### User Quotas Enhancement
- [x] Add weekly limits
- [x] Add per-batch limits
- [x] Quota usage notifications (warning at 80%)
- [ ] Quota reset scheduling

### Granular Roles
- [x] Create permissions table (role_permissions)
- [x] Define permission types (hlr.single, hlr.batch, hlr.export, admin.users, etc.)
- [x] Create roles table with permission sets (DEFAULT_PERMISSIONS)
- [x] UI to manage roles and permissions
- [x] Assign roles to users

### Redis Queue
- [ ] Install and configure Redis
- [ ] Create job queue for batch processing
- [ ] Worker process for background jobs
- [ ] Job status tracking
- [ ] Priority queue support

## Access Control Fix
- [x] Remove Sessions link from regular user menu (admin only)
- [x] Remove Login History link from regular user menu (admin only)
- [x] Add admin check on /sessions and /login-history routes

## Granular Roles UI
- [x] UI для настройки permissions ролей в админ-панели (4 роли: viewer, user, manager, admin)
- [ ] Отображение роли и её возможностей в профиле

## Quotas UI
- [x] UI для отображения квот пользователя (оставшиеся лимиты)
- [x] Алерты при приближении к лимитам (80% warning)

## Permissions System
- [x] Создать таблицу role_permissions в БД
- [x] Определить типы разрешений (hlr.single, hlr.batch, hlr.export, admin.users, etc.)
- [x] Backend API для получения и обновления permissions
- [x] UI для настройки permissions в админ-панели
- [x] Интегрировать проверку permissions в существующие процедуры
- [x] Переводы для permissions (RU/UK/EN)

## Access Request System
- [x] Создать таблицу access_requests в БД (name, email, phone, reason, status, createdAt)
- [x] Backend API: создание заявки (публичный), получение списка (админ), одобрение/отклонение (админ)
- [x] Форма заявки на странице логина
- [x] Панель управления заявками в админ-панели
- [ ] Уведомление админу о новой заявке
- [x] Автоматическое создание пользователя при одобрении
- [x] Переводы для формы заявки (RU/UK/EN)

## Session Management Enhancement
- [x] Время жизни токена 12 часов - автоматический logout
- [x] Обновление токена при активности (updateSessionActivity)
- [x] Админ может завершить сессию любого пользователя (UI в Admin)

## UI Fixes
- [x] Убрать поля email и телефон из формы заявки на доступ
- [x] Заменить поле "причина запроса" на "Telegram тег/номер"

## Telegram Notifications
- [x] Добавить настройки Telegram бота (bot token, chat ID) в админ-панель
- [x] Реализовать отправку уведомлений через Telegram Bot API
- [x] Интегрировать уведомления в процесс создания заявки на доступ
- [x] UI страница настроек Telegram (/admin/telegram)
- [x] Переводы для Telegram настроек (RU/UK/EN)

## Drag & Drop File Upload
- [x] Создать компонент FileDropZone для перетаскивания файлов
- [x] Интегрировать в страницу проверки номеров (Home.tsx)
- [x] Поддержка форматов Excel (.xlsx, .xls) и CSV
- [x] Визуальная индикация при перетаскивании файла
- [x] Переводы (RU/UK/EN)

## Email Validator (MillionVerifier)
- [x] Добавить API ключ MillionVerifier в настройки
- [x] Создать модуль для работы с MillionVerifier API
- [x] Создать таблицу email_batches и email_results в БД
- [x] UI страница для валидации email (аналогично HLR)
- [x] Поддержка single и batch проверки
- [x] История проверок email
- [x] Экспорт результатов в Excel
- [x] Переводы (RU/UK/EN)
- [x] Раздельные лимиты для HLR и Email (daily, weekly, monthly, batch)
- [x] UI для настройки раздельных лимитов в админ-панели
- [x] Переименовать приложение в DataCheck Pro

## Email Validator - Полный функционал

### Навигация и UI
- [x] Вкладка "Email Проверка" в боковом меню
- [x] Вкладка "Email Массовая проверка" в боковом меню
- [x] Баланс API MillionVerifier на Dashboard (кредиты)

### Страницы проверки
- [x] Страница Email Lookup (single проверка)
- [x] Страница Email Batch Checker (массовая проверка)
- [x] Drag & Drop загрузка файлов для email
- [x] Прогресс-бар при проверке email
- [x] Кэширование результатов email (24ч)

### Результаты
- [x] Таблица результатов email с фильтрами
- [ ] Сортировка по колонкам
- [x] Экспорт email в CSV/Excel
- [ ] Шаблоны экспорта для email

### История и аудит
- [x] История проверок email пользователя
- [x] Просмотр сохранённых результатов email
- [x] Удаление проверок email
- [ ] Возобновление прерванных проверок email
- [ ] Админ: история email проверок всех пользователей
- [x] Аудит email действий в логах

### Дополнительные функции
- [x] Email Score (оценка качества 0-100)
- [x] Категоризация email (корпоративные/бесплатные/временные)
- [ ] Информация о домене (MX записи)
- [ ] Определение одноразовых email
- [x] Статистика email на Dashboard

## UI Fixes
- [x] Убрать карточку "Невалидных" с Dashboard
- [x] Исправить вкладки на странице Email Validator
- [x] Добавить раздел "Email проверки" в редактирование прав
- [x] Убрать баланс API со страницы HLR Bulk Checker

## Help Center Update
- [x] Полностью переписать Help Center для новичков
- [x] Добавить раздел Email Validator в Help Center


## GitHub Export (2026-02-02)
- [x] Обновить README.md с актуальной информацией
- [x] Обновить CHANGELOG.md (добавить v2.0.0)
- [x] Заменить HLR Bulk Checker на DataCheck Pro везде
- [x] Создать .env.example без конфиденциальных данных
- [x] Загрузить на GitHub (приватный репозиторий)


## Admin Email History (2026-02-02)
- [x] Backend: процедура для получения email батчей всех пользователей (admin only)
- [x] UI: страница AdminEmailHistory с фильтрами по пользователю
- [x] Просмотр результатов email проверок любого пользователя
- [x] Удаление email проверок администратором
