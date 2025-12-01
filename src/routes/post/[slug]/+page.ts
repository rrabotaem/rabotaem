import { browser } from '$app/environment'
import { env } from '$env/dynamic/public'
import { profile } from '$lib/auth.js'
import CommunityCard from '$lib/components/lemmy/community/CommunityCard.svelte'
import { getClient } from '$lib/lemmy.js'
import { awaitIfServer } from '$lib/promise.js'
import { SSR_ENABLED, userSettings } from '$lib/settings.js'
import { error } from '@sveltejs/kit'
import type { GetComments } from 'lemmy-js-client'
import { get } from 'svelte/store'
import { postFeed } from '$lib/lemmy/postfeed'

export async function load({ params, url, fetch }) {
  const postId = Number(params.slug.split('-')[0])
  
  if (!Number.isInteger(postId)) {
    throw error(404, 'Invalid post ID')
  }

  const thread = url.searchParams.get('thread')
  const reply = url.searchParams.get('reply')
  let parentId: number | undefined
  let showContext: string | undefined = undefined

  let max_depth = 3

  if (thread) {
    const split = thread.split('.')
    if (split.length >= 9) {
      const sliced = split.slice(0, split.length - 4)
      showContext = sliced[sliced.length - 1]
      parentId = Number(split[split.length - 5])
    } else {
      parentId = Number(split[1])
    }

    if (!Number.isInteger(parentId)) {
      parentId = undefined
    }
  }


  if (parentId) {
    max_depth = 10
  }

  const sort = get(userSettings)?.defaultSort?.comments ?? 'Hot'

  const commentParams: GetComments = {
    post_id: postId,
    type_: 'All',
    limit: 50,
    page: 1,
    max_depth: max_depth,
    saved_only: false,
    sort: sort,
    parent_id: parentId,
  }

  const comments = getClient(env.PUBLIC_INSTANCE_URL).getComments(commentParams)
  const post = await getClient(env.PUBLIC_INSTANCE_URL).getPost({
    id: postId,
  })

  // Получаем лучшие посты из текущего сообщества
  const communityPosts = await getClient().getPosts({
    type_: "Local",
    sort: "TopAll", 
    limit: 20,
    community_id: post.community_view.community.id
  })

  // Получаем лучшие посты из всех сообществ
  const globalPosts = await postFeed({
    id: 'recommendations',
    request: {
      type_: "Local",
      sort: "TopAll",
      limit: 50,
      page: 1
    },
    url: url,
    fetch: fetch
  })

  // Рекламные посты из ENV (PUBLIC_AD_POST_IDS=123,456,789)
  const adPostIds = (env.PUBLIC_AD_POST_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)

  const adPosts = adPostIds.length
    ? await Promise.all(
        adPostIds.map(async (id) => {
          try {
            const res = await getClient(env.PUBLIC_INSTANCE_URL).getPost({ id })
            return res.post_view
          } catch {
            return null
          }
        })
      ).then((views) => views.filter((v) => v !== null))
    : []

  return {
    thread: {
      showContext: showContext,
      singleThread: parentId != undefined,
      focus: thread?.split('.').at(-1),
    },
    reply: reply === 'true',
    post: post,
    commentSort: sort,
    comments: (await awaitIfServer(comments)).data,
    slots: {
      sidebar: {
        component: CommunityCard,
        props: {
          community_view: post.community_view,
        },
      },
    },
    recommendations: {
      communityPosts,
      globalPosts,
      adPosts
    }
  }
}
