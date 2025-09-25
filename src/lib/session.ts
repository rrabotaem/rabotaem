import { browser } from '$app/environment'
import type { Community } from 'lemmy-js-client'
import { writable } from 'svelte/store'

interface SessionStorage {
  lastSeenCommunity: Community | undefined
  postDraft:
    | {
        community: Community | null
        title: string
        body: string
        image: FileList | null
        url: string | undefined
        nsfw: boolean
        loading: boolean
      }
    | undefined
}

export const setSessionStorage = (
  key: keyof SessionStorage,
  value: SessionStorage[typeof key]
) => {
  if (!browser) return
  if (value == undefined) {
    sessionStorage.removeItem(key)
  } else {
    sessionStorage.setItem(key, JSON.stringify(value))
  }
}

export const getSessionStorage = (
  key: keyof SessionStorage
): SessionStorage[typeof key] => {
  if (!browser) return
  return JSON.parse(sessionStorage.getItem(key)!)
}

// Интерфейс для данных черновика поста
interface PostDraftData {
  title: string
  body: string
  community: Community | null
  url?: string
  nsfw: boolean
  language_id?: number
  alt_text?: string
  thumbnail?: string
  savedAt: number // timestamp
}

// Функции для работы с черновиками постов в localStorage
export const saveDraft = (postId: string | number | null, data: Partial<PostDraftData>) => {
  if (!browser) {
    console.log('🚫 saveDraft: не в браузере, пропускаем сохранение')
    return
  }
  
  const key = postId ? `draft_post_${postId}` : 'draft_new_post'
  const draftData: PostDraftData = {
    title: data.title || '',
    body: data.body || '',
    community: data.community || null,
    url: data.url,
    nsfw: data.nsfw || false,
    language_id: data.language_id,
    alt_text: data.alt_text,
    thumbnail: data.thumbnail,
    savedAt: Date.now()
  }
  
  console.log('💾 saveDraft: Сохраняем черновик', {
    postId,
    key,
    dataSize: JSON.stringify(draftData).length,
    title: draftData.title,
    bodyLength: draftData.body?.length || 0,
    community: draftData.community?.name || 'нет',
    savedAt: new Date(draftData.savedAt).toLocaleString('ru-RU'),
    originalData: data
  })
  
  try {
    localStorage.setItem(key, JSON.stringify(draftData))
    console.log('✅ saveDraft: Черновик успешно сохранён в localStorage')
  } catch (error) {
    console.error('❌ saveDraft: Ошибка сохранения в localStorage:', error)
  }
}

export const getDraft = (postId: string | number | null): PostDraftData | null => {
  if (!browser) {
    console.log('🚫 getDraft: не в браузере, возвращаем null')
    return null
  }
  
  const key = postId ? `draft_post_${postId}` : 'draft_new_post'
  console.log('🔍 getDraft: Ищем черновик с ключом:', key)
  
  const saved = localStorage.getItem(key)
  
  if (!saved) {
    console.log('📭 getDraft: Черновик не найден в localStorage')
    return null
  }
  
  console.log('📄 getDraft: Найден черновик, размер:', saved.length, 'символов')
  
  try {
    const parsed = JSON.parse(saved)
    console.log('✅ getDraft: Черновик успешно загружен', {
      title: parsed.title,
      bodyLength: parsed.body?.length || 0,
      community: parsed.community?.name || 'нет',
      savedAt: new Date(parsed.savedAt).toLocaleString('ru-RU'),
      fullData: parsed
    })
    return parsed
  } catch (error) {
    console.error('❌ getDraft: Ошибка парсинга черновика:', error, 'Данные:', saved)
    return null
  }
}

export const removeDraft = (postId: string | number | null) => {
  if (!browser) {
    console.log('🚫 removeDraft: не в браузере, пропускаем удаление')
    return
  }
  
  const key = postId ? `draft_post_${postId}` : 'draft_new_post'
  console.log('🗑️ removeDraft: Удаляем черновик с ключом:', key)
  
  const existed = localStorage.getItem(key) !== null
  localStorage.removeItem(key)
  
  if (existed) {
    console.log('✅ removeDraft: Черновик успешно удалён')
  } else {
    console.log('⚠️ removeDraft: Черновик не существовал')
  }
}

export const getDraftLastSaved = (postId: string | number | null): Date | null => {
  const draft = getDraft(postId)
  return draft ? new Date(draft.savedAt) : null
}

// Функция для форматирования даты последнего сохранения
export const formatLastSaved = (date: Date | null): string => {
  if (!date) return ''
  
  const now = Date.now()
  const diff = now - date.getTime()
  
  if (diff < 60000) { // меньше минуты
    return 'только что'
  } else if (diff < 3600000) { // меньше часа
    const minutes = Math.floor(diff / 60000)
    return `${minutes} мин. назад`
  } else if (diff < 86400000) { // меньше дня
    const hours = Math.floor(diff / 3600000)
    return `${hours} ч. назад`
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// Функция для отладки - показывает все черновики в localStorage
export const debugDrafts = () => {
  if (!browser) {
    console.log('🚫 debugDrafts: не в браузере')
    return
  }
  
  console.log('🔍 debugDrafts: Поиск всех черновиков в localStorage')
  
  const drafts: { [key: string]: any } = {}
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('draft_post_') || key === 'draft_new_post')) {
      try {
        const value = localStorage.getItem(key)
        const parsed = value ? JSON.parse(value) : null
        drafts[key] = {
          raw: value,
          parsed,
          size: value?.length || 0,
          savedAt: parsed?.savedAt ? new Date(parsed.savedAt).toLocaleString('ru-RU') : 'нет'
        }
      } catch (error) {
        drafts[key] = { error: 'Ошибка парсинга', raw: localStorage.getItem(key) }
      }
    }
  }
  
  console.log('📋 debugDrafts: Найденные черновики:', drafts)
  
  if (Object.keys(drafts).length === 0) {
    console.log('📭 debugDrafts: Черновики не найдены')
  }
  
  return drafts
}

interface Route {
  title: string
}

export const route = writable<Route | undefined>(undefined)
