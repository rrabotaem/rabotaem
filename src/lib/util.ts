import { goto } from '$app/navigation'
import { toast } from 'mono-svelte'
import { userSettings } from '$lib/settings.js'
import { get } from 'svelte/store'
import type { SubscribedType } from 'lemmy-js-client'
import { page } from '$app/stores'
import { feature } from '$lib/version.js'
import { client } from '$lib/lemmy.js'
import { site } from './lemmy'

// Despite the name, this will round up
// Example: findClosestNumber([8, 16, 32, 64, 128], 76) will return 128
export const findClosestNumber = (numbers: number[], target: number): number =>
  numbers.reduce((prev, curr) =>
    curr >= target && (prev < target || curr < prev) ? curr : prev
  )

export const searchParam = (
  url: URL,
  key: string,
  value: string,
  ...deleteKeys: string[]
) => {
  url.searchParams.set(key, value)
  deleteKeys.forEach((k) => url.searchParams.delete(k))
  goto(url, {
    invalidateAll: true,
  })
}

export const fullCommunityName = (name: string, actorId: string) =>
  `${name}@${new URL(actorId).hostname}`

export const placeholders = {
  url: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  post: [
    'Люди часто спрашивают меня…'
  ],
  comment: [
    'Напишите ваш комментарий...',
    'Поделитесь своими мыслями',
    'Что думаете по этому поводу?',
    'Ваше мнение очень важно',
    'Добавьте комментарий',
    'Выскажитесь по теме',
    'Покажи всем свою мудрость',
    'Время показать, что ты умнее всех',
    'Пора продемонстрировать свою эрудицию',
    'Сейчас ты точно всех удивишь',
    'Время для очередного "а вот я думаю..."',
    'Покажи всем, как надо правильно думать',
    'Готов поразить мир своей логикой?',
    'Покажи всем, что ты читал Википедию',
    'Очередной эксперт по всему готов к комментарию',
  ],
  get: (type: 'url' | 'post' | 'comment') => {
    return get(userSettings)?.randomPlaceholders
      ? placeholders[type][
          Math.floor(Math.random() * placeholders[type].length)
        ]
      : ''
  },
}

export function moveItem<T>(
  array: T[],
  currentIndex: number,
  newIndex: number
): T[] {
  if (
    currentIndex < 0 ||
    currentIndex >= array.length ||
    newIndex < 0 ||
    newIndex >= array.length
  ) {
    throw new Error('Invalid index')
  }

  const newArray = [...array]

  // Remove the item from the current index
  const [item] = newArray.splice(currentIndex, 1)

  // Insert the item at the new index
  newArray.splice(newIndex, 0, item)

  return newArray
}

type Maybe<T> = T | undefined | void | null
export const trycatch = <T>(func: () => T): Maybe<T> => {
  try {
    return func()
  } catch (err) {
    toast({
      content: err as any,
      type: 'error',
    })
  }
}

export const removeItem = <T>(array: T[], predicate: (item: T) => boolean) => {
  array.splice(array.findIndex(predicate), 1)
}

export const DOMAIN_REGEX =
  /^(http(s)?:\/\/)?((?!-)[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}(:[0-9]{0,5})?$/g
export const DOMAIN_REGEX_FORMS =
  '(http(s)?://)?((?!-)[A-Za-z0-9]{1,63}.)+[A-Za-z]{2,63}(:[0-9]{0,5})?'

export const isSubscribed = (subscribed: SubscribedType) =>
  subscribed == 'Pending' || subscribed == 'Subscribed'

export const routes = {
  '/': 'Frontpage',
  get '/post/[instance]/[id=integer]'() {
    return get(page)?.data?.post?.post_view?.post?.name
  },
  '/settings': 'Settings',
  '/communities': 'Communities',
  '/search': 'Search',
  '/moderation': 'Moderation',
  '/create/post': 'Create post',
  '/create/community': 'Create community',
  get '/c/[name]'() {
    return get(page)?.data?.community?.community_view?.community?.title
  },
  '/accounts': 'Accounts',
  '/admin/config': 'Administration',
  '/inbox': 'Inbox',
  '/saved': 'Saved',
  '/about': 'About',
  '/profile/user': 'Profile',
  '/profile/settings': 'Profile Settings',
  '/profile/blocks': 'Blocks',
}

export async function uploadImage(
  image: File | null | undefined,
  instance: string,
  jwt: string
): Promise<string | undefined> {
  if (!image) return

  console.log('Uploading image:', {
    size: image.size,
    type: image.type,
    instance,
    hasJwt: !!jwt
  })

  const formData = new FormData()
  formData.append('images[]', image)

  if (feature('unproxiedImageUpload', get(site)?.version)) {
    console.log('Using unproxied upload')
    const res = await client({ auth: jwt, instanceURL: instance }).uploadImage({
      image: image,
    })

    if (res.url) return res.url
    else throw new Error(`Failed to upload image. ${res.msg}`)
  } else {
    console.log('Using proxied upload with URL:', `${
      window.location.origin
    }/cors/${instance}/pictrs/image?${new URLSearchParams({
      auth: jwt,
    })}`)
    
    const response = await fetch(
      `${
        window.location.origin
      }/cors/${instance}/pictrs/image?${new URLSearchParams({
        auth: jwt,
      })}`,
      {
        method: 'POST',
        body: formData,
      }
    )

    console.log('Upload response:', {
      status: response.status,
      statusText: response.statusText
    })

    const json = await response.json()
    console.log('Response JSON:', json)

    if (json.msg == 'ok') {
      return `https://${instance}/pictrs/image/${json.files?.[0]?.file}`
    }
    throw new Error(
      `${
        (await response.text().catch((_) => undefined)) ??
        'Failed to upload image'
      }: ${response.status}: ${response.statusText}`
    )
  }
}

export const instanceToURL = (input: string) =>
  input.startsWith('http://') || input.startsWith('https://')
    ? input
    : `https://${input}`

export function canParseUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

export function instanceId(actorId: string) {
  return new URL(actorId).hostname
}

export function getRandomDefaultAvatar(): string {
  // Список доступных аватаров
  const avatars = [
    '/img/avatars/newUser/22.png',
    '/img/avatars/newUser/23.png', 
    '/img/avatars/newUser/24.png',
    '/img/avatars/newUser/25.png',
    '/img/avatars/newUser/26.png'
  ];

  // Выбираем случайный аватар из списка
  const randomIndex = Math.floor(Math.random() * avatars.length);
  
  // Формируем полный URL
  const baseUrl = 'https://rabotaem.app'; // или window.location.origin в браузере
  return `${baseUrl}${avatars[randomIndex]}`;
}

/**
 * Сериализует модель EditorJS в base64
 */
export function serializeEditorModel(data: any): string {
  try {
    const jsonString = JSON.stringify(data)
    // Используем btoa для преобразования в base64
    return btoa(unescape(encodeURIComponent(jsonString)))
  } catch (error) {
    console.error('Ошибка при сериализации модели:', error)
    throw new Error('Не удалось сериализовать модель редактора')
  }
}

/**
 * Десериализует модель EditorJS из base64
 */
export function deserializeEditorModel(base64Data: string): any {
  try {
    if (!base64Data || base64Data.trim() === '') {
      return { blocks: [] }
    }
    
    // Проверяем, является ли это уже JSON (для обратной совместимости)
    if (base64Data.startsWith('{') && base64Data.endsWith('}')) {
      return JSON.parse(base64Data)
    }
    
    // Декодируем из base64
    const jsonString = decodeURIComponent(escape(atob(base64Data)))
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Ошибка при десериализации модели:', error)
    // Возвращаем пустую модель в случае ошибки
    return { blocks: [] }
  }
}
