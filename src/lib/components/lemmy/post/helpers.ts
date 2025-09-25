import { client, getInstance } from '$lib/lemmy.js'
import type { View } from '$lib/settings'
import { isImage, isVideo } from '$lib/ui/image'
import { canParseUrl, findClosestNumber } from '$lib/util'
import type { CommentView, PersonView, Post, PostView } from 'lemmy-js-client'

export const isCommentMutable = (comment: CommentView, me: PersonView) =>
  me.person.id == comment.creator.id

export const bestImageURL = (
  post: Post,
  compact: boolean = true,
  width: number = 1024
) => {
  if (post.thumbnail_url) return optimizeImageURL(post.thumbnail_url, width)
  else if (post.url) return optimizeImageURL(post.url, width)

  return post.url ?? ''
}

export const optimizeImageURL = (
  urlStr: string,
  width: number = 1024
): string => {
  try {
    const cleanUrl = urlStr.replace(/^(https?:\/\/)+(https?\/\/)/, '$1')
    const url = new URL(cleanUrl)

    if (!url.searchParams.has('format')) url.searchParams.set('format', 'webp')

    if (width > 0 && !url.searchParams.has('thumbnail')) {
      url.searchParams.set(
        'thumbnail',
        findClosestNumber(
          [128, 196, 256, 512, 728, 1024, 1536],
          width
        ).toString()
      )
    }

    if (width == -1) {
      url.searchParams.delete('thumbnail')
    }

    return url.toString()
  } catch (e) {
    console.log(e)
    return urlStr
  }
}

const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/

export const isYoutubeLink = (url?: string): RegExpMatchArray | null => {
  if (!url) return null

  return url?.match?.(YOUTUBE_REGEX)
}

function formatTitle(title: string): string {
  // Сначала транслитерируем все русские буквы
  const transliterated = title.toLowerCase().replace(/[а-яё]/g, char => {
    const cyrillicToLatin: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
      'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
      'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
      'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
      'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
      'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    return cyrillicToLatin[char] || char
  })

  return transliterated
    .replace(/[^a-z0-9\s-]/g, '') // оставляем только латинские буквы, цифры, пробелы и дефисы
    .replace(/\s+/g, '-') // заменяем пробелы на дефисы
    .replace(/-+/g, '-') // убираем множественные дефисы
    .replace(/^-|-$/g, '') // убираем дефисы в начале и конце
    .slice(0, 100) // ограничиваем длину
}

interface PostLinkParams {
  id: number
  name: string
}

export const postLink = (post: PostLinkParams) => {
  const slug = formatTitle(post.name)
  return `/post/${post.id}-${encodeURIComponent(slug)}`
}

export type MediaType = 'video' | 'image' | 'iframe' | 'embed' | 'none'
export type IframeType = 'youtube' | 'video' | 'none'

export const mediaType = (url?: string, view: View = 'cozy'): MediaType => {
  if (url) {
    if (isImage(url)) return 'image'
    if (isVideo(url)) return 'iframe'
    if (isYoutubeLink(url)) return 'iframe'
    if (canParseUrl(url)) return 'embed'
    return 'none'
  }

  return 'none'
}
export const iframeType = (url: string): IframeType => {
  if (isVideo(url)) return 'video'
  if (isYoutubeLink(url)) return 'youtube'
  return 'none'
}

export async function hidePost(
  id: number,
  hide: boolean,
  jwt: string
): Promise<boolean> {
  const res = await client({ auth: jwt }).hidePost({
    hide: hide,
    post_ids: [id],
  })

  return hide
}
