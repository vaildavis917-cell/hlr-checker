<p align="center">
  <img src="client/public/favicon.svg" alt="HLR Checker Logo" width="80" height="80">
</p>

<h1 align="center">HLR Checker</h1>

<p align="center">
  <strong>Bulk HLR Lookup + очистка баз + Health Score</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#env-config">Env</a> •
  <a href="#security">Security</a> •
  <a href="#api">API</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#license">License</a>
</p>

---

## Что даёт бизнесу

| Проблема | Решение HLR Checker |
|----------|---------------------|
| Высокие расходы на SMS по невалидным номерам | Проверка валидности до отправки — экономия до 30% бюджета |
| Грязная CRM-база с мёртвыми номерами | Bulk-проверка + Health Score для приоритизации |
| Недоставки из-за портированных номеров | Определение текущего оператора и статуса портирования |
| Антифрод: фейковые номера при регистрации | Single check в реальном времени |
| Нет понимания качества базы | Health Score 0–100 для каждого номера |

---

## Features

### Реализовано

| Функция | Описание |
|---------|----------|
| **Single Check** | Мгновенная проверка одного номера с полным отчётом |
| **Batch Check** | Загрузка CSV/TXT, до 10 000 номеров за раз |
| **Дедупликация** | Автоматическое удаление дубликатов перед проверкой |
| **Health Score** | Оценка качества номера 0–100 (см. [формулу](#health-score-formula)) |
| **Экспорт CSV/XLSX** | Выгрузка результатов с настраиваемыми полями |
| **Шаблоны экспорта** | Сохранение конфигураций полей для повторного использования |
| **Лимиты per-user** | Daily/monthly ограничения на количество проверок |
| **Роли admin/user** | Разделение прав: админ управляет пользователями и лимитами |
| **Audit Logs** | Логирование действий пользователей |
| **Мультиязычность** | RU / UK / EN интерфейс |
| **Возобновление батчей** | Просмотр и завершение прерванных проверок |

### Health Score Formula

Health Score рассчитывается по 5 параметрам:

| Параметр | Баллы | Условие |
|----------|-------|---------|
| Validity | 40 | `valid` = 40, `unknown` = 20 |
| Reachability | 25 | `reachable` = 25, `unknown` = 10 |
| Ported | 15 | `not_ported` = 15, `ported` = 10 |
| Roaming | 10 | `not_roaming` = 10, `roaming` = 5 |
| Network Type | 10 | `mobile` = 10, `fixed_line_or_mobile` = 7 |

**Итого: 0–100 баллов**

---

## Screenshots

> TODO: add screenshots

Планируемые скриншоты:
1. Home / Single check
2. Upload batch + прогресс
3. Results table + pagination + health score
4. Export templates
5. Admin panel / users / limits

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11 |
| Database | MySQL / TiDB + Drizzle ORM |
| Auth | JWT cookie session (httpOnly) |
| HLR Provider | [Seven.io](https://www.seven.io/) |

---

## Quickstart

### Требования

- Node.js 22+
- pnpm 10+
- MySQL 8+ или TiDB

### Local Development

```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-org/hlr-checker.git
cd hlr-checker

# 2. Установить зависимости
pnpm install

# 3. Настроить переменные окружения
cp .env.example .env
# Отредактировать .env (см. секцию Env Config)

# 4. Применить миграции БД
pnpm db:push

# 5. Запустить dev-сервер
pnpm dev
```

Откроется: `http://localhost:3000`

### Production Build

```bash
# Сборка
pnpm build

# Запуск
NODE_ENV=production pnpm start
```

### Common Issues

| Проблема | Решение |
|----------|---------|
| `EADDRINUSE: port 3000` | Освободить порт: `lsof -i :3000` → `kill -9 <PID>` |
| `Connection refused` (DB) | Проверить `DATABASE_URL` и доступность MySQL |
| `401 Unauthorized` (Seven.io) | Проверить `SEVEN_IO_API_KEY` |
| `Invalid JWT` | Сгенерировать новый `JWT_SECRET` (min 32 символа) |

---

## Env Config

### Обязательные переменные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/hlr` |
| `JWT_SECRET` | Секрет для подписи JWT (min 32 символа) | `your-super-secret-key-here-32ch` |
| `SEVEN_IO_API_KEY` | API ключ Seven.io | `abc123...` |

### Опциональные переменные

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `VITE_APP_TITLE` | Название приложения | `HLR Checker` |
| `VITE_APP_LOGO` | URL логотипа | — |
| `VITE_ANALYTICS_ENDPOINT` | Endpoint аналитики | — |
| `VITE_ANALYTICS_WEBSITE_ID` | ID сайта для аналитики | — |

### Только для Manus Platform

| Переменная | Описание |
|------------|----------|
| `VITE_APP_ID` | ID приложения Manus |
| `OAUTH_SERVER_URL` | URL OAuth сервера |
| `VITE_OAUTH_PORTAL_URL` | URL портала авторизации |
| `OWNER_OPEN_ID` | OpenID владельца |
| `OWNER_NAME` | Имя владельца |
| `BUILT_IN_FORGE_API_*` | Встроенные API Manus |

---

## Как это работает

### Single Check

```
Пользователь → вводит номер → API → Seven.io HLR → результат → Health Score → UI
```

### Batch Check

```
CSV/TXT → парсинг → дедупликация → очередь → Seven.io (по 1 номеру) 
    → сохранение в DB (инкрементально) → прогресс UI → экспорт
```

### Архитектура (ASCII)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   tRPC API  │────▶│  Seven.io   │
│  (React)    │◀────│  (Express)  │◀────│   HLR API   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   MySQL     │
                    │  (Drizzle)  │
                    └─────────────┘
```

---

## API

### tRPC Endpoints

Все запросы идут через `/api/trpc/<procedure>`.

### hlr.checkSingle

Проверка одного номера.

**Request:**
```typescript
{
  phoneNumber: "+380501234567"
}
```

**Response:**
```typescript
{
  id: 123,
  phoneNumber: "+380501234567",
  internationalFormat: "+380501234567",
  validNumber: "valid",
  reachable: "reachable",
  countryName: "Ukraine",
  countryCode: "UA",
  currentCarrierName: "Vodafone Ukraine",
  currentNetworkType: "mobile",
  ported: "not_ported",
  roaming: "not_roaming",
  healthScore: 100
}
```

### hlr.startBatch

Запуск пакетной проверки.

**Request:**
```typescript
{
  phoneNumbers: ["+380501234567", "+380671234567", "+380931234567"],
  name: "Campaign Q1 2026"  // optional
}
```

**Response:**
```typescript
{
  batchId: 45,
  totalNumbers: 3,
  uniqueNumbers: 3,
  duplicatesRemoved: 0,
  estimatedCost: 0.03,
  status: "processing"
}
```

### hlr.getResults

Получение результатов батча с пагинацией.

**Request:**
```typescript
{
  batchId: 45,
  page: 1,
  pageSize: 50,
  statusFilter: "all",      // "all" | "valid" | "invalid"
  countryFilter: "all",     // "all" | "UA" | "RU" | ...
  operatorFilter: "all",    // "all" | "Vodafone" | ...
  healthFilter: "all"       // "all" | "high" | "normal" | "low"
}
```

**Response:**
```typescript
{
  results: [
    {
      id: 1,
      phoneNumber: "+380501234567",
      validNumber: "valid",
      reachable: "reachable",
      healthScore: 100,
      // ... остальные поля
    }
  ],
  total: 3,
  page: 1,
  pageSize: 50,
  totalPages: 1
}
```

### exportTemplates.create

Создание шаблона экспорта.

**Request:**
```typescript
{
  name: "Basic Export",
  fields: ["phoneNumber", "validNumber", "reachable", "healthScore"],
  isDefault: true
}
```

**Response:**
```typescript
{
  id: 1,
  name: "Basic Export",
  fields: ["phoneNumber", "validNumber", "reachable", "healthScore"],
  isDefault: "yes",
  createdAt: "2026-01-16T10:00:00.000Z"
}
```

### exportTemplates.list

Получение списка шаблонов пользователя.

**Response:**
```typescript
{
  templates: [
    {
      id: 1,
      name: "Basic Export",
      fields: ["phoneNumber", "validNumber", "reachable", "healthScore"],
      isDefault: "yes"
    },
    {
      id: 2,
      name: "Full Export",
      fields: ["phoneNumber", "internationalFormat", "validNumber", "reachable", "countryName", "currentCarrierName", "ported", "roaming", "healthScore"],
      isDefault: "no"
    }
  ]
}
```

---

## Security

### Реализовано

| Мера | Описание |
|------|----------|
| **httpOnly cookies** | JWT хранится в httpOnly cookie, недоступен из JS |
| **Account lockout** | Блокировка после 5 неудачных попыток входа на 15 минут |
| **Per-user limits** | Daily/monthly лимиты на количество проверок |
| **Role-based access** | Разделение admin/user с проверкой на сервере |
| **Audit logs** | Логирование действий: login, batch_start, export и др. |
| **Password hashing** | bcrypt с salt rounds = 10 |

### Roadmap Security

| Мера | Статус | Приоритет |
|------|--------|-----------|
| Rate limiting (IP + user) | Планируется | Высокий |
| Atomic quota reservation | Планируется | Высокий |
| Timeout + retry/backoff для Seven.io | Планируется | Средний |
| Masking/hash телефонов в логах | Планируется | Средний |
| Cancel batch (graceful stop) | Планируется | Средний |
| 2FA для админов | Планируется | Низкий |

---

## Data Retention

### Что хранится

| Данные | Таблица | Описание |
|--------|---------|----------|
| Результаты HLR | `hlr_results` | Полные данные проверки |
| Метаданные батчей | `hlr_batches` | Статистика и статус |
| Audit logs | `action_logs` | Действия пользователей |
| Пользователи | `users` | Учётные записи и лимиты |

### Срок хранения

По умолчанию данные хранятся **бессрочно**.

> **Рекомендация:** Настроить TTL/cleanup job для удаления старых результатов (например, > 90 дней).

### Что НЕ хранить

- Сырые номера телефонов в логах (только masked/hashed)
- Пароли в открытом виде (только bcrypt hash)

---

## Roadmap

### Next (1–2 недели)

- [ ] Rate limiting (IP + user level)
- [ ] Atomic quota reservation (prevent race conditions)
- [ ] Timeout + exponential backoff для Seven.io API
- [ ] Phone number masking в audit logs
- [ ] Cancel batch functionality

### Later

- [ ] Redis queue для batch processing
- [ ] Webhooks для уведомлений о завершении батча
- [ ] CRM integrations (Bitrix24, amoCRM)
- [ ] E.164 нормализация при импорте
- [ ] Scheduled batch checks
- [ ] API rate limits dashboard

---

## Contributing

### Как внести вклад

1. Fork репозитория
2. Создать feature branch: `git checkout -b feature/amazing-feature`
3. Commit изменений: `git commit -m 'Add amazing feature'`
4. Push в branch: `git push origin feature/amazing-feature`
5. Открыть Pull Request

### Security Issues

Для сообщений о уязвимостях **не используйте публичные issues**.

Пишите напрямую: [@toskaqwe1](https://t.me/toskaqwe1)

---

## License

MIT License — см. [LICENSE](LICENSE) файл.

---

## Author

**@toskaqwe1** — [Telegram](https://t.me/toskaqwe1)

---

<p align="center">
  Made with ❤️ for clean databases
</p>
