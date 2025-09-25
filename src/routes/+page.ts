import { getClient } from '$lib/lemmy.js'
import type { SortType, ListingType } from 'lemmy-js-client'
import { userSettings } from '$lib/settings.js'
import { get } from 'svelte/store'

export async function load({ url, fetch }) {
  const page = Number(url.searchParams.get('page')) || 1
  const sort = (url.searchParams.get('sort') as SortType) || get(userSettings).defaultSort.sort
  
  // Получаем тип ленты из URL параметров или используем настройки по умолчанию
  const type = (url.searchParams.get('type') as ListingType) || get(userSettings).defaultSort.feed

  console.log('+page.ts - URL type param:', url.searchParams.get('type'))
  console.log('+page.ts - User settings default feed:', get(userSettings).defaultSort.feed)
  console.log('+page.ts - Final type:', type)

  const posts = await getClient().getPosts({
    type_: type,
    sort: sort,
    page: page,
    limit: 5
  })

  return {
    posts,
    page,
    sort,
    type,
    cursor: {
      next: null
    }
  }
}
