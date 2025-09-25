import { getClient } from '$lib/lemmy.js'
import type { SortType } from 'lemmy-js-client'
import { fullCommunityName } from '$lib/util.js'

export async function load({ params, fetch, url }) {
  try {
    // Получаем данные сообщества
    const communityResponse = await getClient({
      func: fetch
    }).getCommunity({
      name: params.name,
    })

    // Формируем полное имя сообщества с доменом
    const community = communityResponse.community_view.community
    const fullName = fullCommunityName(community.name, community.actor_id)

    // Получаем посты сообщества
    const postsResponse = await getClient().getPosts({
      community_name: fullName, // Используем полное имя с доменом
      limit: 5,
      page: Number(url.searchParams.get('page')) || 1,
      sort: (url.searchParams.get('sort') as SortType) || 'Hot',
      type_: "Local"
    })

    return {
      community: {
        community_view: {
          community: communityResponse.community_view.community,
          subscribed: communityResponse.community_view.subscribed,
          blocked: communityResponse.community_view.blocked,
          counts: communityResponse.community_view.counts
        }
      },
      moderators: communityResponse.moderators || [],
      posts: postsResponse,
      page: Number(url.searchParams.get('page')) || 1,
      sort: (url.searchParams.get('sort') as SortType) || 'Hot',
      cursor: {
        next: postsResponse.next_page // Используем next_page из ответа API
      },
      community_name: fullName, // Добавляем полное имя сообщества в данные
      limit: 5 // Добавляем лимит в данные
    }
  } catch (error) {
    console.error('Error loading community:', error)
    return {
      community: null,
      moderators: [],
      posts: null,
      page: 1,
      sort: 'Hot',
      cursor: { next: null },
      community_name: params.name,
      limit: 5
    }
  }
}
