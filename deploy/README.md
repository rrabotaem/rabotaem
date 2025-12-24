# Деплой сервиса «Работаем»

Развёртывание инстанса на базе Lemmy с фронтендом Photon, Traefik и (опционально) генератором sitemap.

---

## Оглавление

1. [Архитектура](#архитектура)  
2. [Структура каталогов](#структура-каталогов)  
3. [Предварительные требования](#предварительные-требования)  
4. [Что нужно отредактировать](#что-нужно-отредактировать)  
5. [Сборка и деплой Photon](#сборка-и-деплой-photon)  
6. [Запуск всех сервисов](#запуск-всех-сервисов)  
7. [Бэкапы БД](#бэкапы-бд)

---

## Архитектура

Сервисы:

- **Photon** — фронтенд (этот репозиторий) форк [Photon](https://github.com/Xyphyn/photon)
- **Lemmy** — бэкенд + PostgreSQL + pictrs (изображения) [Lemmy](https://github.com/LemmyNet/lemmy)
- **Traefik** — обратный прокси и роутинг, HTTPS  
- **Sitemap generator (опционально)** — контейнер для генерации sitemap.xml

Все сервисы живут в `/opt/` и управляются через `docker compose`.

---

## Структура каталогов

```text
/opt
├── lemmy
│   ├── docker-compose.yaml
│   ├── lemmy.hjson
│   └── volumes
│       ├── pictrs
│       └── postgres
├── photon
│   └── docker-compose.yml
├── readme.md
├── sitemap-generator
│   ├── docker-compose.yaml
│   ├── dockerfile
│   ├── pyproject.toml
│   ├── src
│   │   ├── app.py
│   │   ├── lemmy_client.py
│   │   ├── settings.py
│   │   ├── sheduler.py
│   │   └── sitemap_generator.py
│   └── uv.lock
└── traefik
    ├── data
    │   ├── certs
    │   ├── custom
    │   │   ├── dashboard.yml
    │   │   ├── example.yml
    │   │   └── tls-redirection.yml
    │   └── traefik.yml
    └── docker-compose.yaml
```

---

## Предварительные требования

### Домен и DNS

Нужно доменное имя, напр.:

- `example.com`

Прописывается в:

- `/opt/lemmy/lemmy.hjson`
- `/opt/photon/docker-compose.yaml`
- `/opt/photon/.env`
- `/opt/sitemap-generator/src/settings.py`
- `/opt/traefik/data/custom/example.yml`

### SMTP-аккаунт

Нужен SMTP для отправки писем. Параметры прописываются в:

- `/opt/lemmy/lemmy.hjson`

### Пароли и токены (обязательно поменять)

1. **Админ Lemmy**

   - Логин: `admin`  
   - Пароль: `strong_admin_password`

   Используется в:

   - `/opt/lemmy/lemmy.hjson`  
   - `/opt/sitemap-generator/src/settings.py` (если sitemap логинится от админа)

2. **PostgreSQL**

   - Пользователь: `lemmy`  
   - Пароль: `strong_pg_password`

   Используется в:

   - `/opt/lemmy/docker-compose.yaml`  
   - `/opt/lemmy/lemmy.hjson`

   БД доступна только локально: `127.0.0.1:5439` (порт уточняется в `docker-compose.yaml`).

3. **pictrs**

   - Токен: `strong_pictrs_token`

   Используется в:

   - `/opt/lemmy/docker-compose.yaml`  
   - `/opt/lemmy/lemmy.hjson`

---

## Сборка и деплой Photon

Ниже — варианты сборки и доставки образа Photon.

### 1. Локальная сборка и запуск (dev / простой прод)

Если `docker-compose.yml` настроен на локальную сборку (через `build:` — в т.ч. `build: /src/photon/`):

```bash
cd /opt/photon
docker compose build
docker compose up -d
```

Так образ собирается и сразу запускается на той же машине.

---

### 2. Сборка и пуш во внешний реестр

Если у вас есть реестр (Docker Hub, GitLab, GHCR и т.п.):

```bash
# в каталоге с Dockerfile Photon
docker build -t <registry>/rabotaem:latest .

docker push <registry>/rabotaem:latest
```

На прод-сервере в `docker-compose.yml` Photon замените блок `build` на:

```yaml
services:
  photon:
    image: <registry>/rabotaem:latest
    # остальная конфигурация (env, labels, сети и т.п.)
```

И запустите:

```bash
cd /opt/photon
docker compose up -d
```

---

### 3. Деплой без реестра (через архив образа по SSH)

Если реестра нет, образ можно передать архивом:

На машине сборки:

```bash
# Сборка образа
docker build -t rabotaem:latest .

# Сохранить в tar.gz
docker save rabotaem:latest | gzip > rabotaem.tar.gz

# Отправить на сервер
scp rabotaem.tar.gz user@host:/tmp/
```

На прод-сервере:

```bash
# Загрузить образ
gunzip -c /tmp/rabotaem.tar.gz | docker load

# Убедиться, что в docker-compose.yml используется image: rabotaem:latest
cd /opt/photon
docker compose up -d
```

---

## Запуск всех сервисов

Рекомендуемый порядок:

1. **Traefik**

   ```bash
   cd /opt/traefik
   docker compose up -d
   ```

2. **Lemmy (бэкенд + БД + pictrs)**

   ```bash
   cd /opt/lemmy
   docker compose up -d
   ```

3. **Photon (фронтенд)**

   Если образ уже доступен (любой из вариантов выше):

   ```bash
   cd /opt/photon
   docker compose up -d
   ```

   После этого сайт должен быть доступен по `https://example.com`.

4. **Sitemap generator (если нужен)**

   ```bash
   cd /opt/sitemap-generator
   docker compose up -d
   ```

---

## Бэкапы БД

Пример команды для создания дампа PostgreSQL:

```bash
docker exec lemmy-postgres-1 sh -c \
  'export PGUSER=lemmy; export PGPASSWORD=strong_pg_password; \
   pg_dump -Fc --clean --create lemmy' \
  > lemmy-db-$(date +"%Y-%m-%d").dump
```

Где:

- `lemmy-postgres-1` — имя контейнера PostgreSQL (`docker ps`)  
- `strong_pg_password` — ваш пароль БД

Полученный `.dump` можно использовать для восстановления инстанса.
