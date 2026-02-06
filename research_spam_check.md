# Исследование API для Spam Check DID номеров

## Уже подключённые сервисы в проекте
- **Seven.io** — HLR Lookup (gateway.seven.io/api/lookup/hlr)
- **MillionVerifier** — Email validation (api.millionverifier.com)

## Найденные API для проверки спам-статуса

### 1. Twilio Lookup + Nomorobo Spam Score
- Цена: $0.003 за запрос
- Возвращает: score 0 или 1 (спам/не спам)
- Только для US номеров (+1)
- Требует аккаунт Twilio

### 2. Hiya Developer API
- Enterprise решение (нет публичных цен)
- Возвращает: flagged/mixed_high/mixed_low/unflagged
- Плюс reputation report card (Maturity, Connection, Engagement, Sentiment)
- Требует регистрацию бизнеса

### 3. CallerID Reputation
- От $64/мес за 10 номеров
- Мониторинг репутации номеров
- API доступен

### 4. Truecaller Business API
- Enterprise решение
- Нет публичных цен
- Caller ID + spam detection

### 5. RapidAPI - Spam Caller Check
- Бесплатный тир
- Простой endpoint: GET spam check по номеру
- 882 подписчика
- Низкая популярность (0.1)

### 6. RapidAPI - Scout (Icehook)
- Spam и robocall history
- Fraud detection
- Только US номера (+1)
