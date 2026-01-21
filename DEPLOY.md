# Руководство по развёртыванию HLR Bulk Checker

Это руководство описывает несколько способов развёртывания приложения на собственном сервере.

## Содержание

1. [Требования к серверу](#требования-к-серверу)
2. [Способ 1: Ручная установка на VPS](#способ-1-ручная-установка-на-vps)
3. [Способ 2: Docker](#способ-2-docker)
4. [Способ 3: Docker Compose](#способ-3-docker-compose)
5. [Настройка базы данных](#настройка-базы-данных)
6. [Настройка Nginx](#настройка-nginx)
7. [SSL сертификат](#ssl-сертификат)
8. [Systemd сервис](#systemd-сервис)
9. [Мониторинг и логи](#мониторинг-и-логи)
10. [Обновление](#обновление)
11. [Резервное копирование](#резервное-копирование)
12. [Решение проблем](#решение-проблем)

---

## Требования к серверу

### Минимальные требования

| Параметр | Значение |
|----------|----------|
| CPU | 1 ядро |
| RAM | 1 GB |
| Диск | 10 GB SSD |
| ОС | Ubuntu 20.04+ / Debian 11+ |

### Рекомендуемые требования

| Параметр | Значение |
|----------|----------|
| CPU | 2 ядра |
| RAM | 2 GB |
| Диск | 20 GB SSD |
| ОС | Ubuntu 22.04 LTS |

### Необходимое ПО

- Node.js 18+ или Docker
- MySQL 8.0+ (или TiDB/PlanetScale)
- Nginx (для production)
- Certbot (для SSL)

---

## Способ 1: Ручная установка на VPS

Этот способ подходит для полного контроля над установкой.

### Шаг 1: Подготовка сервера

Подключитесь к серверу по SSH и обновите систему:

```bash
ssh root@your-server-ip
apt update && apt upgrade -y
```

### Шаг 2: Установка Node.js 18

```bash
# Добавляем репозиторий NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Устанавливаем Node.js
apt install -y nodejs

# Проверяем версию
node --version  # Должно быть v18.x.x
npm --version
```

### Шаг 3: Установка pnpm

```bash
# Устанавливаем pnpm глобально
npm install -g pnpm

# Проверяем
pnpm --version
```

### Шаг 4: Установка MySQL

```bash
# Устанавливаем MySQL Server
apt install -y mysql-server

# Запускаем безопасную настройку
mysql_secure_installation
```

При настройке MySQL:
- Установите пароль для root
- Удалите анонимных пользователей (Y)
- Запретите удалённый вход root (Y)
- Удалите тестовую базу данных (Y)
- Перезагрузите таблицы привилегий (Y)

### Шаг 5: Создание базы данных

```bash
# Входим в MySQL
mysql -u root -p

# Создаём базу данных и пользователя
CREATE DATABASE hlr_checker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hlr_user'@'localhost' IDENTIFIED BY 'ваш_надёжный_пароль';
GRANT ALL PRIVILEGES ON hlr_checker.* TO 'hlr_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Шаг 6: Создание пользователя приложения

Не запускайте приложение от root:

```bash
# Создаём пользователя
adduser hlr
usermod -aG sudo hlr

# Переключаемся на пользователя
su - hlr
```

### Шаг 7: Клонирование и настройка проекта

```bash
# Клонируем репозиторий
git clone https://github.com/your-username/hlr-checker.git
cd hlr-checker

# Устанавливаем зависимости
pnpm install

# Создаём файл конфигурации
cp .env.example .env
nano .env
```

Заполните `.env` файл:

```env
DATABASE_URL=mysql://hlr_user:ваш_надёжный_пароль@localhost:3306/hlr_checker
SEVEN_IO_API_KEY=ваш_api_ключ_seven_io
JWT_SECRET=сгенерируйте_командой_openssl_rand_hex_32
VITE_APP_TITLE=HLR Bulk Checker
NODE_ENV=production
PORT=3000
```

Генерация JWT_SECRET:

```bash
openssl rand -hex 32
```

### Шаг 8: Применение миграций

```bash
pnpm db:push
```

### Шаг 9: Сборка приложения

```bash
pnpm build
```

### Шаг 10: Тестовый запуск

```bash
pnpm start
```

Приложение должно запуститься на порту 3000. Проверьте в браузере: `http://your-server-ip:3000`

### Шаг 11: Создание первого администратора

При первом запуске создайте администратора через базу данных:

```bash
mysql -u hlr_user -p hlr_checker
```

```sql
-- Вставляем администратора (пароль будет хэширован при первом входе)
-- Используйте bcrypt для хэширования пароля
INSERT INTO users (username, password_hash, role, is_active, created_at)
VALUES ('admin', '$2b$10$...хэш_пароля...', 'admin', 1, NOW());
```

Или используйте скрипт для генерации хэша:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('ваш_пароль', 10).then(console.log)"
```

---

## Способ 2: Docker

Быстрый способ развёртывания с использованием Docker.

### Шаг 1: Установка Docker

```bash
# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh

# Добавляем пользователя в группу docker
usermod -aG docker $USER

# Перелогиньтесь для применения изменений
```

### Шаг 2: Сборка образа

```bash
git clone https://github.com/your-username/hlr-checker.git
cd hlr-checker

# Собираем образ
docker build -t hlr-checker .
```

### Шаг 3: Запуск контейнера

```bash
docker run -d \
  --name hlr-checker \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e SEVEN_IO_API_KEY="your_key" \
  -e JWT_SECRET="your_secret" \
  hlr-checker
```

---

## Способ 3: Docker Compose

Рекомендуемый способ для production с автоматическим управлением зависимостями.

### Шаг 1: Установка Docker и Docker Compose

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Docker Compose (v2)
apt install docker-compose-plugin
```

### Шаг 2: Настройка

```bash
git clone https://github.com/your-username/hlr-checker.git
cd hlr-checker

# Создаём .env для docker-compose
cat > .env << EOF
DATABASE_URL=mysql://hlr_user:hlrpassword@mysql:3306/hlr_checker
SEVEN_IO_API_KEY=ваш_api_ключ
JWT_SECRET=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_PASSWORD=hlrpassword
VITE_APP_TITLE=HLR Bulk Checker
EOF
```

### Шаг 3: Запуск

```bash
# Запуск в фоновом режиме
docker compose up -d

# Просмотр логов
docker compose logs -f

# Остановка
docker compose down
```

### Шаг 4: Применение миграций

```bash
docker compose exec app pnpm db:push
```

---

## Настройка Nginx

Nginx используется как reverse proxy для production.

### Установка Nginx

```bash
apt install -y nginx
```

### Конфигурация

Создайте файл `/etc/nginx/sites-available/hlr-checker`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Статические файлы
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Активация конфигурации

```bash
# Создаём символическую ссылку
ln -s /etc/nginx/sites-available/hlr-checker /etc/nginx/sites-enabled/

# Проверяем конфигурацию
nginx -t

# Перезапускаем Nginx
systemctl restart nginx
```

---

## SSL сертификат

Используем Let's Encrypt для бесплатного SSL.

### Установка Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Получение сертификата

```bash
certbot --nginx -d your-domain.com
```

Certbot автоматически:
- Получит сертификат
- Настроит Nginx для HTTPS
- Добавит автообновление

### Проверка автообновления

```bash
certbot renew --dry-run
```

---

## Systemd сервис

Для автозапуска приложения при перезагрузке сервера.

### Создание сервиса

Создайте файл `/etc/systemd/system/hlr-checker.service`:

```ini
[Unit]
Description=HLR Bulk Checker
Documentation=https://github.com/your-username/hlr-checker
After=network.target mysql.service

[Service]
Type=simple
User=hlr
WorkingDirectory=/home/hlr/hlr-checker
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=hlr-checker
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Активация сервиса

```bash
# Перезагружаем systemd
systemctl daemon-reload

# Включаем автозапуск
systemctl enable hlr-checker

# Запускаем сервис
systemctl start hlr-checker

# Проверяем статус
systemctl status hlr-checker
```

### Управление сервисом

```bash
# Остановка
systemctl stop hlr-checker

# Перезапуск
systemctl restart hlr-checker

# Просмотр логов
journalctl -u hlr-checker -f
```

---

## Мониторинг и логи

### Просмотр логов приложения

```bash
# Systemd логи
journalctl -u hlr-checker -f

# Docker логи
docker logs -f hlr-checker

# Docker Compose логи
docker compose logs -f app
```

### Мониторинг ресурсов

```bash
# Использование CPU и памяти
htop

# Дисковое пространство
df -h

# Статус MySQL
mysqladmin -u root -p status
```

---

## Обновление

### Ручное обновление

```bash
cd /home/hlr/hlr-checker

# Останавливаем сервис
systemctl stop hlr-checker

# Получаем обновления
git pull origin main

# Устанавливаем зависимости
pnpm install

# Применяем миграции
pnpm db:push

# Собираем
pnpm build

# Запускаем
systemctl start hlr-checker
```

### Docker обновление

```bash
cd /path/to/hlr-checker

# Получаем обновления
git pull origin main

# Пересобираем и перезапускаем
docker compose down
docker compose build --no-cache
docker compose up -d

# Применяем миграции
docker compose exec app pnpm db:push
```

---

## Резервное копирование

### Резервная копия базы данных

```bash
# Создание бэкапа
mysqldump -u hlr_user -p hlr_checker > backup_$(date +%Y%m%d).sql

# Восстановление
mysql -u hlr_user -p hlr_checker < backup_20250121.sql
```

### Автоматическое резервное копирование

Создайте скрипт `/home/hlr/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/hlr/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Бэкап базы данных
mysqldump -u hlr_user -p'пароль' hlr_checker | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Добавьте в cron:

```bash
crontab -e
# Добавьте строку:
0 3 * * * /home/hlr/backup.sh >> /home/hlr/backup.log 2>&1
```

---

## Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
journalctl -u hlr-checker -n 100

# Проверьте порт
netstat -tlnp | grep 3000

# Проверьте .env файл
cat /home/hlr/hlr-checker/.env
```

### Ошибка подключения к базе данных

```bash
# Проверьте MySQL
systemctl status mysql

# Проверьте подключение
mysql -u hlr_user -p -h localhost hlr_checker

# Проверьте права
SHOW GRANTS FOR 'hlr_user'@'localhost';
```

### Ошибка 502 Bad Gateway

```bash
# Проверьте, запущено ли приложение
systemctl status hlr-checker

# Проверьте Nginx
nginx -t
systemctl status nginx

# Проверьте логи Nginx
tail -f /var/log/nginx/error.log
```

### Высокое потребление памяти

```bash
# Проверьте процессы
ps aux --sort=-%mem | head

# Перезапустите приложение
systemctl restart hlr-checker
```

### Проблемы с SSL

```bash
# Проверьте сертификат
certbot certificates

# Обновите сертификат
certbot renew

# Проверьте конфигурацию Nginx
nginx -t
```

---

## Контакты поддержки

При возникновении проблем:
1. Проверьте раздел [Решение проблем](#решение-проблем)
2. Создайте Issue на GitHub
3. Свяжитесь с разработчиком

---

*Документация обновлена: Январь 2025*
