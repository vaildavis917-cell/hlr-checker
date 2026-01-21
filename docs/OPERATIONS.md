# Инструкция дежурного оператора

Краткое руководство по мониторингу и обслуживанию HLR Bulk Checker.

---

## 1. Проверка работоспособности

### Health Check эндпоинты

| Эндпоинт | Метод | Ожидаемый ответ | Описание |
|----------|-------|-----------------|----------|
| `/api/health` | GET | `200 OK` | Базовая проверка сервера |
| `/api/trpc/health` | GET | `200 OK` | Проверка tRPC |
| `/api/trpc/hlr.getBalance` | POST | JSON с балансом | Проверка Seven.io API |

### Быстрая проверка через curl

```bash
# Проверка сервера
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health

# Проверка tRPC (должен вернуть 200)
curl -s http://localhost:3000/api/trpc/health

# Проверка баланса Seven.io (требует авторизацию)
curl -X POST http://localhost:3000/api/trpc/hlr.getBalance \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

### Автоматический мониторинг

Добавьте в cron для проверки каждые 5 минут:

```bash
*/5 * * * * curl -sf http://localhost:3000/api/health || echo "HLR Checker DOWN" | mail -s "ALERT" admin@example.com
```

---

## 2. Логи

### Расположение логов

| Источник | Путь | Описание |
|----------|------|----------|
| Приложение (systemd) | `journalctl -u hlr-checker` | Основные логи |
| Приложение (Docker) | `docker logs hlr-checker` | Логи контейнера |
| Nginx | `/var/log/nginx/access.log` | HTTP запросы |
| Nginx ошибки | `/var/log/nginx/error.log` | Ошибки прокси |
| MySQL | `/var/log/mysql/error.log` | Ошибки БД |

### Просмотр логов в реальном времени

```bash
# Systemd
journalctl -u hlr-checker -f

# Docker
docker logs -f hlr-checker

# Docker Compose
docker compose logs -f app

# Последние 100 строк с ошибками
journalctl -u hlr-checker -n 100 | grep -i error
```

### Что искать в логах

| Паттерн | Значение | Действие |
|---------|----------|----------|
| `SEVEN_IO_ERROR` | Ошибка API Seven.io | См. раздел 3 |
| `429 Too Many Requests` | Rate limit Seven.io | Подождать 1 мин |
| `ECONNREFUSED` | БД недоступна | Проверить MySQL |
| `JWT_EXPIRED` | Истёк токен | Пользователь перелогинится |
| `BATCH_TIMEOUT` | Батч завис | См. раздел 4 |

---

## 3. Проблемы с Seven.io

### Ошибка 429 (Rate Limit)

Seven.io ограничивает количество запросов. При получении 429:

1. **Подождите 60 секунд** — лимит сбрасывается
2. Проверьте, нет ли параллельных батчей
3. Если повторяется — уменьшите скорость проверки в настройках

```bash
# Проверка текущих батчей в процессе
mysql -u hlr_user -p -e "SELECT id, name, status, processed_numbers, total_numbers FROM hlr_batches WHERE status = 'processing';" hlr_checker
```

### Баланс Seven.io = 0

При нулевом балансе проверки не работают.

1. **Проверьте баланс:**
```bash
curl -X GET "https://gateway.seven.io/api/balance" \
  -H "X-Api-Key: YOUR_API_KEY"
```

2. **Пополните баланс** на [seven.io](https://app.seven.io/)

3. **Уведомите пользователей** о временной недоступности

### Ошибка аутентификации Seven.io

Если API возвращает 401/403:

1. Проверьте `SEVEN_IO_API_KEY` в `.env`
2. Убедитесь, что ключ активен в панели Seven.io
3. Перезапустите приложение после изменения ключа

---

## 4. Зависшие батчи

### Признаки зависания

Батч считается зависшим, если:
- Статус `processing` более 30 минут без прогресса
- `processed_numbers` не увеличивается

### Диагностика

```bash
# Найти зависшие батчи (processing > 30 мин)
mysql -u hlr_user -p -e "
SELECT id, name, status, processed_numbers, total_numbers, 
       TIMESTAMPDIFF(MINUTE, updated_at, NOW()) as minutes_stuck
FROM hlr_batches 
WHERE status = 'processing' 
  AND TIMESTAMPDIFF(MINUTE, updated_at, NOW()) > 30;
" hlr_checker
```

### Решение

**Вариант 1: Возобновить батч (рекомендуется)**

Пользователь может нажать "Возобновить" в интерфейсе. Система продолжит с последнего проверенного номера.

**Вариант 2: Сбросить статус вручную**

```sql
-- Сбросить статус на paused (пользователь сможет возобновить)
UPDATE hlr_batches SET status = 'paused' WHERE id = <BATCH_ID>;

-- Или отменить полностью
UPDATE hlr_batches SET status = 'failed' WHERE id = <BATCH_ID>;
```

**Вариант 3: Перезапуск приложения**

```bash
systemctl restart hlr-checker
# или
docker restart hlr-checker
```

---

## 5. Ежедневные проверки

| Время | Действие | Команда |
|-------|----------|---------|
| 09:00 | Проверить health | `curl http://localhost:3000/api/health` |
| 09:00 | Проверить баланс Seven.io | Через админ-панель |
| 09:00 | Проверить зависшие батчи | SQL запрос выше |
| 18:00 | Проверить логи на ошибки | `journalctl -u hlr-checker --since "08:00"` |

---

## 6. Контакты эскалации

| Уровень | Проблема | Контакт |
|---------|----------|---------|
| L1 | Сервис недоступен | Перезапуск, проверка логов |
| L2 | Проблемы с БД | DBA / DevOps |
| L3 | Проблемы с Seven.io API | Поддержка Seven.io |

---

## 7. Полезные команды

```bash
# Статус всех сервисов
systemctl status hlr-checker mysql nginx

# Использование диска
df -h

# Использование памяти
free -m

# Активные подключения к БД
mysql -u root -p -e "SHOW PROCESSLIST;"

# Размер базы данных
mysql -u root -p -e "
SELECT table_name, 
       ROUND(data_length/1024/1024, 2) as 'Data MB',
       ROUND(index_length/1024/1024, 2) as 'Index MB'
FROM information_schema.tables 
WHERE table_schema = 'hlr_checker';
"
```
