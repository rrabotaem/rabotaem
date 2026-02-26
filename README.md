<p align="center">
  <a href="https://rabotaem.app/" rel="noopener">
  <img width=200px height=200px src="https://raw.githubusercontent.com/rrabotaem/rabotaem/main/static/rabotaem_logo.svg"></a>

 <h1 align="center"><a href="https://rabotaem.app/">Работаем!</a></h1>
 <p align="center"><strong>Твой собственный VC RU</strong></p>
 <p align="center">Open source федеративная сеть SEO контента</p>
</p>

<p align="center">
  <a href="https://rabotaem.app/">Демо</a> •
  <a href="#быстрый-старт">Быстрый старт</a> •
  <a href="#примеры-работающих-сайтов">Примеры</a> •
  <a href="https://t.me/rabotaemapp">Контакты</a> •
  <a href="#лицензия">Лицензия</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/version-1.31.5-green.svg" alt="Version">
</p>

 

## Оглавление

- [О продукте](#о-продукте)
- [Технологии](#технологии)
- [Примеры работающих сайтов](#примеры-работающих-сайтов)
- [Быстрый старт](#быстрый-старт)
- [Конфигурация](#конфигурация)
- [Разработка](#разработка)
- [Деплой](#деплой)
- [О проекте](#о-проекте)
- [Контакты](#контакты)
- [Лицензия](#лицензия)

 

## О продукте

### Для кого

**Работаем!** — для независимых авторов, компаний и бизнесов, которым важно владеть своим контентом, развивать аудиторию и строить собственные блоги и медиа без зависимости от централизованных платформ.

### Проблема

На централизованных платформах — VC RU, Reddit, Habr — вы не владеете ни аудиторией, ни охватом. Алгоритмы непрозрачны, монетизация ограничена, а полноценный доступ требует корпоративной подписки.

### Решение

**Работаем!** — open source федеративная сеть SEO контента. Контент распространяется в децентрализованную сеть (ActivityPub), увеличивая охваты. Ставьте на свой сервер или используйте готовые площадки.

### Преимущества

- **Полная независимость и контроль над контентом** — вы владеете своими данными
- **Встроенная дистрибуция через Fediverse (ActivityPub)** — автоматическое распространение контента в федеративную сеть
- **SEO-оптимизация** — ваш контент индексируется поисковыми системами
- **Низкие затраты и масштабируемость** — для блогов и сообществ
- **Открытый исходный код** — полная прозрачность и возможность кастомизации

 

## Технологии

- **Svelte/SvelteKit** — современный фреймворк для веб-приложений
- **TypeScript** — типизированный JavaScript
- **TailwindCSS** — utility-first CSS фреймворк
- **Lemmy API** — интеграция с децентрализованной социальной сетью
- **ActivityPub** — протокол для федеративных сетей
- **Open Source (AGPL-3.0)** — свободная лицензия

 

## Примеры работающих сайтов

Проект уже используется в продакшене на следующих площадках:

- 🌐 **[rabotaem.app](https://rabotaem.app/)** — основная площадка проекта
- 📝 **[kanun.blog](https://kanun.blog/)** — пример независимого блога
- 📰 **[zavtra.io](https://zavtra.io/)** — пример медиа-платформы

 

## Быстрый старт

### Использование готовых площадок

Вы можете использовать уже работающие площадки, такие как [rabotaem.app](https://rabotaem.app/), для публикации своего контента без необходимости настройки собственного сервера.

### Развертывание своего сервера

Если вы хотите полный контроль и независимость, вы можете развернуть свой собственный экземпляр.

#### Локальная сборка

```bash
docker compose build
docker compose up -d
```

#### Детальная инструкция

Подробная инструкция по установке и настройке доступна в [deploy/README.md](deploy/README.md) (на русском языке).

 

## Конфигурация

Настройка проекта осуществляется через переменные окружения. Ниже перечислены наиболее важные параметры.

### Основные настройки

| Variable                    | Values              | Default Value                          |
| --------------------------- | ------------------- | -------------------------------------- |
| `PUBLIC_INSTANCE_URL`       | URL                 | `lemmy.ml`                             |
| `PUBLIC_INTERNAL_INSTANCE`  | URL                 | Value of `PUBLIC_INSTANCE_URL`         |
| `PUBLIC_LOCK_TO_INSTANCE`   | `bool`              | `true` if `PUBLIC_INSTANCE_URL` is set |
| `PUBLIC_FAVICON`            | URL                 | `/img/logo-background.svg`             |
| `PUBLIC_LANGUAGE`           | `string`            | `en`                                   |

**`PUBLIC_LANGUAGE`** — язык интерфейса (например, `ru`, `en`).

### Производительность и SEO

| Variable                    | Values              | Default Value                          |
| --------------------------- | ------------------- | -------------------------------------- |
| `PUBLIC_SSR_ENABLED`        | `bool`              | `false`                                |
| `PUBLIC_MIGRATE_COOKIE`     | `bool`              | `false`                                |

**`PUBLIC_SSR_ENABLED`** — включает серверный рендеринг для более быстрой начальной загрузки и лучшей индексации поисковыми системами. Также позволяет пользователям с отключенным JavaScript просматривать базовую версию сайта.

**`PUBLIC_MIGRATE_COOKIE`** — полезно, если вы хотите переключить Photon на ваш фронтенд по умолчанию. Преобразует cookie из lemmy-ui в аккаунт Photon. Работает только если установлен `PUBLIC_INSTANCE_URL`.

### Внешний вид и темы

| Variable                    | Values              | Default Value                          |
| --------------------------- | ------------------- | -------------------------------------- |
| `PUBLIC_THEME`              | JSON                | Photon's default colors                |
| `PUBLIC_COLORSCHEME`        | system\|dark\|light | system                                 |

### Поведение интерфейса

| Variable                    | Values              | Default Value                          |
| --------------------------- | ------------------- | -------------------------------------- |
| `PUBLIC_EXPANDABLE_IMAGES`  | `bool`              | true                                   |
| `PUBLIC_MARK_READ_POSTS`    | `bool`              | true                                   |
| `PUBLIC_HIDE_DELETED`       | `bool`              | true                                   |
| `PUBLIC_HIDE_REMOVED`       | `bool`              | true                                   |
| `PUBLIC_NSFW_BLUR`          | `bool`              | true                                   |
| `PUBLIC_RANDOM_PLACEHOLDERS`| `bool`              | true                                   |
| `PUBLIC_REMOVE_CREDIT`      | `bool`              | false                                  |

### Сортировка по умолчанию

| Variable                      | Values              | Default Value                        |
| ----------------------------- | ------------------- | ------------------------------------ |
| `PUBLIC_DEFAULT_FEED_SORT`    | `SortType`          | Active                               |
| `PUBLIC_DEFAULT_FEED`         | `ListingType`       | All                                  |
| `PUBLIC_DEFAULT_COMMENT_SORT` | `CommentSortType`   | Hot                                  |
| `PUBLIC_MIXED_FEED`           | `bool`              | false                                |

**`PUBLIC_MIXED_FEED`** — при выборе `TopDay`, по мере промотки лента автоматически перейдёт на `TopWeek` и далее.

### SEO мета-теги

| Variable                      | Values    | Default Value |
| ----------------------------- | --------- | ------------- |
| `PUBLIC_SITE_TITLE`           | `string`  | —             |
| `PUBLIC_SITE_DESCRIPTION`     | `string`  | —             |
| `PUBLIC_META_DESCRIPTION`     | `string`  | —             |
| `PUBLIC_OG_TITLE`             | `string`  | —             |
| `PUBLIC_OG_DESCRIPTION`       | `string`  | —             |
| `PUBLIC_OG_IMAGE`             | URL       | —             |
| `PUBLIC_OG_URL`               | URL       | —             |
| `PUBLIC_TWITTER_TITLE`        | `string`  | —             |
| `PUBLIC_TWITTER_DESCRIPTION`  | `string`  | —             |

### Аналитика

| Variable                      | Values    | Default Value |
| ----------------------------- | --------- | ------------- |
| `PUBLIC_GA_MEASUREMENT_ID`    | `string`  | —             |
| `PUBLIC_YM_MEASUREMENT_ID`    | `string`  | —             |

**`PUBLIC_GA_MEASUREMENT_ID`** — идентификатор Google Analytics (формат `G-XXXXXXXXXX`).

**`PUBLIC_YM_MEASUREMENT_ID`** — идентификатор Яндекс.Метрики.

### Сайдбар и навигация

| Variable                      | Values    | Default Value |
| ----------------------------- | --------- | ------------- |
| `PUBLIC_TELEGRAM_URL`         | URL       | —             |
| `PUBLIC_GITHUB_URL`           | URL       | —             |
| `PUBLIC_PROJECT_ABOUT`        | URL/path  | —             |
| `PUBLIC_PROJECT_ADVRTISEMENT` | URL/path  | —             |
| `PUBLIC_PROJECT_AUTHORS`      | URL/path  | —             |
| `PUBLIC_PROJECT_RULES`        | URL/path  | —             |
| `PUBLIC_SHOW_SIDEBAR_BANNER`  | `bool`    | true          |

Ссылки на ресурсы, отображаемые в левом сайдбаре. Значения формата `/post/ID-slug` — внутренние ссылки на посты.

### Рекламные посты

| Variable                      | Values    | Default Value |
| ----------------------------- | --------- | ------------- |
| `PUBLIC_AD_POST_IDS`          | `string`  | —             |

**`PUBLIC_AD_POST_IDS`** — список ID постов через запятую (например, `1364,1291`), которые будут показаны в ленте как рекомендуемые/рекламные.

### Дополнительные настройки

Больше опций доступно в `src/lib/settings.ts`, в объекте `defaultSettings`.

#### Listing Type

Значения для `ListingType` определены в [lemmy-js-client](https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/ListingType.ts):

- `All`
- `Local`
- `Subscribed`
- `Moderator`

#### Sort Type

Значения для `SortType` (регистр важен) определены в [lemmy-js-client](https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/SortType.ts):

- `Active`
- `Hot`
- `New`
- `Old`
- `TopDay`
- `TopWeek`
- `TopMonth`
- `TopAll`
- `MostComments`
- `NewComments`
- `TopHour`
- `TopSixHour`
- `TopTwelveHour`
- `TopThreeMonths`
- `TopSixMonths`
- `TopNineMonths`
- `TopYear`

#### Comment Sort Type

Значения для `CommentSortType` определены в [lemmy-js-client](https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/CommentSortType.ts):

- `Hot`
- `Top`
- `New`
- `Old`
- `Controversial`



## Разработка

### Команды для разработки

```bash
# Запуск в режиме разработки
npm run dev

# Сборка проекта
npm run build

# Запуск тестов
npm test

# Проверка типов
npm run check

# Предпросмотр собранного проекта
npm run preview
```


## Деплой

### Локальная сборка

Сборка и запуск образа локально:

```bash
docker compose build
docker compose up -d
```

### Сборка и отправка в внешний registry

Если у вас есть контейнерный registry, вы можете отправить собранный образ туда:

```bash
docker build -t <registry>/rabotaem:latest .
docker push <registry>/rabotaem:latest
```

На продакшн сервере обновите `docker-compose.yml`, заменив секцию `build` на:

```yaml
image: <registry>/rabotaem:latest
```

### Деплой через SSH без registry

Если нет контейнерного registry, вы можете собрать архив образа и передать его через SSH:

```bash
# Сборка образа
docker build -t rabotaem:latest .

# Сохранение как tar
docker save rabotaem:latest | gzip > rabotaem.tar.gz

# Копирование на сервер через scp
scp rabotaem.tar.gz user@host:/tmp/
```

На сервере загрузите и запустите:

```bash
gunzip -c /tmp/rabotaem.tar.gz | docker load
docker compose up -d
```


## О проекте

**Работаем!** — это форк [Photon](https://github.com/Xyphyn/photon), современного клиента для Fediverse, написанного на Svelte. Этот форк был создан для дальнейшей разработки и экспериментов.

Проект основан на [Photon](https://github.com/Xyphyn/photon) от [Xyphyn](https://github.com/Xyphyn) и использует [Lemmy](https://github.com/LemmyNet/lemmy) в качестве бэкенда для децентрализованной социальной сети.


## Контакты

- 📢 **Telegram канал**: [@rabotaemapp](https://t.me/rabotaemapp)


## Лицензия

Этот проект лицензирован под **AGPL-3.0**.  
Для подробностей см. файл [LICENSE](./LICENSE).
