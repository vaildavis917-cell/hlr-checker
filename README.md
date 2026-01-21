# HLR Bulk Checker

Сервис массовой проверки телефонных номеров через HLR lookup.

## Возможности

- Массовая проверка номеров (до 2000+ за раз)
- Загрузка CSV/TXT файлов
- Экспорт результатов в CSV/Excel
- Health Score оценка качества номера (0-100)
- Обнаружение дубликатов
- Кэширование результатов на 24 часа
- Многоязычный интерфейс (RU/UK/EN)
- Система авторизации с блокировкой после 5 неудачных попыток
- Админ-панель управления пользователями

## GSM коды

| Код | Статус | Описание |
|-----|--------|----------|
| 0 | OK | Номер активен |
| 1 | Bad Number | Unknown Subscriber |
| 5 | Bad Number | Unidentified Subscriber |
| 6 | Absent | Телефон выключен |
| 9 | Blocked | Illegal Subscriber |
| 12 | Blocked | Illegal Equipment |

## Технологии

- React 19 + TypeScript
- Tailwind CSS 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB
- Seven.io API

## Установка

```bash
pnpm install
```

## Переменные окружения

Создайте файл `.env`:

```
DATABASE_URL=mysql://user:password@host:port/database
SEVEN_IO_API_KEY=your_api_key
JWT_SECRET=random_secret_string
```

## Запуск

```bash
pnpm dev
```

## Тесты

```bash
pnpm test
```
