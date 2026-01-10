# Документация по созданию постов через API Lemmy

## Обзор

Данная документация описывает процесс создания постов через Lemmy API v3, используемый в платформах на базе Работаем! (например, rabotaem.app). Процесс включает авторизацию, загрузку медиа-файлов, формирование HTML-контента и публикацию поста.

## Архитектура

### Основные компоненты

1. **Авторизация** — получение JWT токена через `/api/v3/user/login`
2. **Получение сообщества** — получение информации о community через `/api/v3/community`
3. **Загрузка изображений** — загрузка изображений в pictrs через `/api/v3/image/upload`
4. **Формирование HTML** — сборка HTML-контента поста с SEO-данными
5. **Создание поста** — публикация поста через `/api/v3/post`

## Процесс публикации

### Шаг 1: Авторизация в Lemmy API

Для работы с API Lemmy необходимо получить JWT токен. Используется стандартный endpoint авторизации:

**Endpoint:** `POST /api/v3/user/login`

**Запрос:**
```json
{
  "username_or_email": "your_username",
  "password": "your_password"
}
```

**Ответ:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_view": {
    "user": { ... },
    "follows": [],
    "moderates": [],
    "community_blocks": [],
    "instance_blocks": [],
    "person_blocks": [],
    "discussion_languages": []
  }
}
```

**Пример реализации:**
```typescript
const loginResponse = await fetch(`${apiEndpoint}/api/v3/user/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username_or_email: login,
    password: password,
  }),
})

if (!loginResponse.ok) {
  throw new Error(`Ошибка авторизации: ${loginResponse.statusText}`)
}

const loginData = await loginResponse.json()
const jwt = loginData.jwt

if (!jwt) {
  throw new Error('Не получен JWT токен')
}
```

### Шаг 2: Получение информации о сообществе (Community)

Перед созданием поста необходимо получить ID или имя сообщества (community), в котором будет опубликован пост.

**Endpoint:** `GET /api/v3/community?name={community_name}`

**Заголовки:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Ответ:**
```json
{
  "community_view": {
    "community": {
      "id": 123,
      "name": "community_name",
      "title": "Community Title",
      "description": "...",
      ...
    },
    "subscribed": "NotSubscribed",
    "blocked": false,
    ...
  }
}
```

**Пример реализации:**
```typescript
const communityName = "community_name"

const communityResponse = await fetch(
  `${apiEndpoint}/api/v3/community?name=${encodeURIComponent(communityName)}`,
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
  }
)

let communityId: number | undefined
if (communityResponse.ok) {
  const communityData = await communityResponse.json()
  communityId = communityData.community_view?.community?.id
}
```

**Примечание:** Для создания поста можно использовать либо `community_id` (предпочтительно), либо `community_name`.

### Шаг 3: Загрузка изображений в pictrs

Для использования изображений в постах необходимо загрузить их в pictrs (система хранения изображений Lemmy).

**Endpoint:** `POST /api/v3/image/upload`

**Альтернативный endpoint:** `POST /pictrs/image` (напрямую в pictrs)

**Заголовки:**
```
Authorization: Bearer {jwt}
```

**Тело запроса:** `FormData` с полем `images[]`

**Поддерживаемые форматы:** JPEG, PNG, GIF, WebP

**Пример реализации:**
```typescript
async function uploadImageToLemmy(
  apiEndpoint: string,
  jwt: string,
  imagePath: string
): Promise<string | null> {
  // Читаем файл
  const fileBuffer = fs.readFileSync(imagePath)
  const fileName = path.basename(imagePath)
  const ext = path.extname(fileName).toLowerCase()
  
  // Определяем MIME тип
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  
  const mimeType = mimeTypes[ext] || 'image/jpeg'
  
  // Создаём FormData
  const formData = new FormData()
  const fileBlob = new Blob([fileBuffer], { type: mimeType })
  formData.append('images[]', fileBlob, fileName)
  
  // Пробуем загрузить через /api/v3/image/upload
  const uploadUrl = `${apiEndpoint}/api/v3/image/upload`
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
    body: formData,
  })
  
  if (!uploadResponse.ok) {
    // Fallback: пробуем через pictrs напрямую
    const pictrsUrl = `${apiEndpoint}/pictrs/image`
    const pictrsResponse = await fetch(pictrsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      body: formData,
    })
    
    if (!pictrsResponse.ok) {
      return null
    }
    
    const pictrsData = await pictrsResponse.json()
    if (pictrsData.files && pictrsData.files.length > 0) {
      const uploadedFile = pictrsData.files[0].file
      return `${apiEndpoint}/pictrs/image/${uploadedFile}`
    }
    
    return null
  }
  
  const uploadData = await uploadResponse.json()
  
  // Формат ответа: { msg: "ok", files: [{ file: "filename.jpg", delete_token: "..." }] }
  if (uploadData.files && uploadData.files.length > 0) {
    const uploadedFile = uploadData.files[0].file
    return `${apiEndpoint}/pictrs/image/${uploadedFile}`
  }
  
  // Альтернативный формат: { url: "..." }
  if (uploadData.url) {
    return uploadData.url
  }
  
  return null
}
```

**Ответ (успешный):**
```json
{
  "msg": "ok",
  "files": [
    {
      "file": "filename.jpg",
      "delete_token": "token123..."
    }
  ]
}
```

**URL загруженного изображения:**
```
{apiEndpoint}/pictrs/image/{file}
```

### Шаг 4: Формирование HTML-контента поста

HTML-контент поста должен быть правильно структурирован для поддержки SEO и корректного отображения на платформе.

#### Структура HTML body

Согласно документации rabotaem.app, структура HTML body должна быть следующей:

1. **Тег `<meta-description>`** (обязательно в начале) — используется для SEO meta-тегов
2. **OG Image** (первое изображение) — если есть
3. **Основной контент** — HTML-контент поста
4. **Дополнительные медиа-файлы** — остальные изображения, видео, документы

#### Тег `<meta-description>`

Тег `<meta-description>` должен быть первым элементом в body. Он автоматически удаляется из видимого контента, но используется для генерации meta-тегов:

- `<meta name="description">`
- `<meta property="og:description">`
- `<meta property="twitter:description">`

**Важно:** Внутри тега должен быть только чистый текст, без HTML-тегов.

**Пример:**
```html
<meta-description>Краткое описание поста для SEO и социальных сетей. Только чистый текст без HTML.</meta-description>
```

**Обработка текста:**
```typescript
if (seoDescription) {
  // Удаляем HTML-теги
  const cleanDescription = seoDescription
    .replace(/<[^>]*>/g, '') // Удаляем HTML теги
    .replace(/&nbsp;/g, ' ') // Заменяем &nbsp; на пробел
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ') // Убираем множественные пробелы
    .trim()
  
  // Экранируем специальные символы для XML/HTML
  const escapedDescription = cleanDescription
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  parts.push(`<meta-description>${escapedDescription}</meta-description>`)
}
```

#### Полная структура HTML body

```html
<meta-description>Краткое описание поста</meta-description>

<p><img src="https://api.example.com/pictrs/image/og-image.jpg" alt="Описание изображения" class="og-image" /></p>

<p>Основной HTML-контент поста...</p>
<p>Еще параграф контента...</p>

<hr />

<p><strong>Дополнительные материалы:</strong></p>
<p><img src="https://api.example.com/pictrs/image/image2.jpg" alt="Второе изображение" /></p>
<p><a href="https://example.com/video.mp4" target="_blank" rel="noopener noreferrer">📹 Видео: Название видео</a></p>
<p><a href="https://example.com/document.pdf" target="_blank" rel="noopener noreferrer">📄 Название документа.pdf</a></p>
```

**Пример реализации функции сборки HTML:**
```typescript
const buildPostBodyHTML = async (
  contentHtml: string,
  seoDescription: string | null,
  ogImageUrl: string | null,
  mediaFiles: MediaFile[],
  postTitle: string,
  firstPhotoIndex: number,
  jwt: string,
  apiEndpoint: string
): Promise<string> => {
  const parts: string[] = []
  
  // 1. Meta description тег (обязательно в начале)
  if (seoDescription) {
    const cleanDescription = seoDescription
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    
    const escapedDescription = cleanDescription
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    parts.push(`<meta-description>${escapedDescription}</meta-description>`)
  }
  
  // 2. OG Image (первое изображение)
  if (ogImageUrl) {
    const altText = postTitle.substring(0, 50).trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    parts.push(`<p><img src="${ogImageUrl}" alt="${altText}" class="og-image" /></p>`)
  }
  
  // 3. Основной контент
  if (contentHtml && contentHtml.trim()) {
    parts.push(contentHtml)
  }
  
  // 4. Дополнительные медиа-файлы
  const otherMedia = mediaFiles.filter((_, index) => index !== firstPhotoIndex)
  
  if (otherMedia.length > 0) {
    parts.push('<hr />')
    parts.push('<p><strong>Дополнительные материалы:</strong></p>')
    
    for (const media of otherMedia) {
      if (media.type === 'photo' && media.fileUrl) {
        // Обработка изображений
        const altText = (media.caption || 'Изображение').substring(0, 100)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
        parts.push(`<p><img src="${media.fileUrl}" alt="${altText}" /></p>`)
      } else if (media.fileUrl) {
        // Обработка видео, документов, аудио
        const caption = (media.caption || media.fileName || 'Медиа-файл')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
        
        if (media.type === 'video') {
          parts.push(`<p><a href="${media.fileUrl}" target="_blank" rel="noopener noreferrer">📹 Видео: ${caption}</a></p>`)
        } else if (media.type === 'document') {
          parts.push(`<p><a href="${media.fileUrl}" target="_blank" rel="noopener noreferrer">📄 ${caption}</a></p>`)
        } else if (media.type === 'audio' || media.type === 'voice') {
          parts.push(`<p><a href="${media.fileUrl}" target="_blank" rel="noopener noreferrer">🎵 ${caption}</a></p>`)
        }
      }
    }
  }
  
  return parts.join('\n\n')
}
```

### Шаг 5: Создание поста через API

После формирования всех необходимых данных можно создать пост через Lemmy API.

**Endpoint:** `POST /api/v3/post`

**Заголовки:**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "name": "Заголовок поста",
  "community_id": 123,
  "community_name": "community_name",
  "body": "<meta-description>Описание</meta-description><p>HTML контент...</p>",
  "language_id": 75,
  "nsfw": false
}
```

**Поля запроса:**

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `name` | string | Да | Заголовок поста |
| `community_id` | number | Нет* | ID сообщества (предпочтительно) |
| `community_name` | string | Нет* | Имя сообщества (если нет `community_id`) |
| `body` | string | Нет | HTML-контент поста |
| `language_id` | number | Нет | ID языка (75 для русского) |
| `nsfw` | boolean | Нет | Контент для взрослых (по умолчанию `false`) |
| `url` | string | Нет | Внешняя ссылка (для link-постов) |

*Одно из полей `community_id` или `community_name` обязательно.

**Пример реализации:**
```typescript
const postPayload: any = {
  name: postTitle,
  language_id: 75, // Русский язык
  nsfw: false,
}

// Используем community_id если получили, иначе community_name
if (communityId) {
  postPayload.community_id = communityId
} else {
  postPayload.community_name = communityName
}

// Добавляем body только если есть контент
if (postBody && postBody.trim()) {
  postPayload.body = postBody
}

const createPostResponse = await fetch(`${apiEndpoint}/api/v3/post`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
  },
  body: JSON.stringify(postPayload),
})
```

**Ответ (успешный):**
```json
{
  "post_view": {
    "post": {
      "id": 456,
      "name": "Заголовок поста",
      "body": "<p>HTML контент...</p>",
      "creator_id": 789,
      "community_id": 123,
      "published": "2024-01-01T12:00:00.000Z",
      "ap_id": "https://api.example.com/post/456",
      "local": true,
      ...
    },
    "creator": { ... },
    "community": { ... },
    ...
  }
}
```

**Извлечение данных из ответа:**
```typescript
const postData = JSON.parse(responseText)
const platformPostId = postData.post_view?.post?.id?.toString()
const platformPostUrl = postData.post_view?.post?.ap_id || 
  `${apiEndpoint}/post/${platformPostId}`
```

### Шаг 6: Обработка ошибок

При работе с Lemmy API могут возникнуть различные ошибки. Важно правильно их обрабатывать.

**Коды ошибок:**
- `401 Unauthorized` — неверный JWT токен или истёк срок действия
- `403 Forbidden` — недостаточно прав для создания поста
- `404 Not Found` — сообщество не найдено
- `400 Bad Request` — неверный формат запроса
- `500 Internal Server Error` — ошибка на стороне сервера

**Пример обработки ошибок:**
```typescript
if (!createPostResponse.ok) {
  let errorData
  try {
    errorData = JSON.parse(responseText)
  } catch {
    errorData = { message: responseText }
  }
  
  console.error('Lemmy API error details:', {
    status: createPostResponse.status,
    error: errorData,
    payload: postPayload,
  })
  
  throw new Error(
    `Ошибка создания поста: ${errorData.error || errorData.message || createPostResponse.statusText}`
  )
}
```

**Типичные ошибки и решения:**

1. **"couldnt_find_community"**
   - Причина: Сообщество с указанным именем не найдено
   - Решение: Проверить корректность имени сообщества

2. **"not_a_moderator"**
   - Причина: У пользователя нет прав на создание постов в сообществе
   - Решение: Убедиться, что пользователь подписан на сообщество и имеет права

3. **"rate_limit_error"**
   - Причина: Превышен лимит запросов
   - Решение: Добавить задержку между запросами

## Полный пример процесса публикации

```typescript
async function publishPostToLemmy(
  apiEndpoint: string,
  credentials: { login: string; password: string },
  communityName: string,
  postTitle: string,
  postBody: string
): Promise<{ postId: string; postUrl: string }> {
  // 1. Авторизация
  const loginResponse = await fetch(`${apiEndpoint}/api/v3/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username_or_email: credentials.login,
      password: credentials.password,
    }),
  })
  
  if (!loginResponse.ok) {
    throw new Error('Ошибка авторизации')
  }
  
  const { jwt } = await loginResponse.json()
  
  // 2. Получение community
  const communityResponse = await fetch(
    `${apiEndpoint}/api/v3/community?name=${encodeURIComponent(communityName)}`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    }
  )
  
  let communityId: number | undefined
  if (communityResponse.ok) {
    const communityData = await communityResponse.json()
    communityId = communityData.community_view?.community?.id
  }
  
  // 3. Создание поста
  const postPayload: any = {
    name: postTitle,
    language_id: 75,
    nsfw: false,
  }
  
  if (communityId) {
    postPayload.community_id = communityId
  } else {
    postPayload.community_name = communityName
  }
  
  if (postBody && postBody.trim()) {
    postPayload.body = postBody
  }
  
  const createPostResponse = await fetch(`${apiEndpoint}/api/v3/post`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postPayload),
  })
  
  if (!createPostResponse.ok) {
    const errorText = await createPostResponse.text()
    throw new Error(`Ошибка создания поста: ${errorText}`)
  }
  
  const postData = await createPostResponse.json()
  const postId = postData.post_view?.post?.id?.toString()
  const postUrl = postData.post_view?.post?.ap_id || 
    `${apiEndpoint}/post/${postId}`
  
  return { postId, postUrl }
}
```

## Рекомендации и best practices

### Безопасность

1. **Хранение credentials**
   - Храните credentials в зашифрованном виде
   - Используйте переменные окружения для секретных ключей
   - Никогда не логируйте пароли или JWT токены

2. **JWT токены**
   - Не храните JWT токены долго — получайте их при каждой публикации
   - Используйте HTTPS для всех запросов к API

### Производительность

1. **Загрузка изображений**
   - Загружайте изображения заранее, если возможно
   - Используйте кэширование URL загруженных изображений
   - Оптимизируйте размер изображений перед загрузкой

2. **Обработка ошибок**
   - Добавьте retry логику для временных ошибок
   - Используйте exponential backoff при rate limiting
   - Логируйте все ошибки для отладки

### SEO оптимизация

1. **Meta description**
   - Всегда добавляйте тег `<meta-description>` в начало body
   - Используйте только чистый текст (без HTML)
   - Оптимальная длина: 150-160 символов

2. **OG Image**
   - Используйте первое изображение поста как OG Image
   - Загружайте изображение на pictrs для получения постоянного URL
   - Добавляйте alt текст для доступности

### Обработка медиа-файлов

1. **Изображения**
   - Загружайте все локальные изображения на pictrs
   - Используйте загруженные URL в HTML-контенте
   - Первое изображение используется как OG Image

2. **Видео и документы**
   - Для видео и документов используйте ссылки на внешние ресурсы
   - Добавляйте превью или описания в HTML

## Специфика rabotaem.app

Для платформы rabotaem.app (и других платформ на базе Lemmy) важно соблюдать следующие особенности:

1. **Тег `<meta-description>`**
   - Обязательно должен быть первым элементом в body
   - Автоматически удаляется из видимого контента
   - Используется для генерации SEO meta-тегов

2. **Язык контента**
   - Используйте `language_id: 75` для русского языка
   - Это улучшает индексацию поисковыми системами

3. **NSFW контент**
   - По умолчанию используйте `nsfw: false`
   - Устанавливайте `nsfw: true` только для контента 18+

## Ссылки и ресурсы

- [Lemmy API Documentation](https://join-lemmy.org/api/classes/LemmyHttp.html)
- [Lemmy API v3 Endpoints](https://join-lemmy.org/api/interfaces/Post.html)
- [Pictrs Image Upload](https://pict-rs.github.io/pict-rs/)

## Известные ограничения

1. **Размер изображений**
   - Максимальный размер файла зависит от конфигурации сервера
   - Рекомендуется оптимизировать изображения перед загрузкой

2. **Длина контента**
   - Ограничения на длину `name` и `body` определяются сервером
   - Рекомендуется: `name` — до 200 символов, `body` — до 50,000 символов

3. **Rate limiting**
   - API может иметь ограничения на частоту запросов
   - При необходимости добавляйте задержки между запросами

