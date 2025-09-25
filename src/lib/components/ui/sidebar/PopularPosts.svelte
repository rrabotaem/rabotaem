<script lang="ts">
  import { client } from '$lib/lemmy.js'
  import type { PostView } from 'lemmy-js-client'
  import { t } from '$lib/translations'
  import { onMount } from 'svelte'
  import { postLink } from '$lib/components/lemmy/post/helpers'
  import Avatar from '$lib/components/ui/Avatar.svelte'
  import { ChatBubbleOvalLeft, Heart, Icon } from 'svelte-hero-icons'

  let posts: PostView[] = []
  let loading = true
  let error: string | null = null

  // Функция для извлечения первого h1 из HTML
  function extractFirstH1(html: string | undefined): string {
    if (!html) return '';
    
    const match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    if (match && match[1]) {
      // Удаляем все HTML теги из найденного текста
      return match[1].replace(/<[^>]*>/g, '');
    }
    // Если h1 не найден, возвращаем название поста
    return '';
  }

  async function fetchPopularPosts() {
    try {
      const response = await client().getPosts({
        type_: "All",
        sort: "TopMonth",
        limit: 5,
        page: 1
      })
      posts = response.posts
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Неизвестная ошибка'
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchPopularPosts()
  })
</script>

<div class="flex flex-col gap-2 bg-white dark:bg-zinc-900 rounded-xl p-4">
  <span class="text-base font-normal text-slate-900 dark:text-zinc-200 mb-2">
    {$t('nav.recent_posts')}
  </span>

  {#if loading}
    <div class="animate-pulse space-y-3">
      {#each Array(5) as _}
        <div class="h-4 bg-slate-100 dark:bg-zinc-800 rounded"></div>
      {/each}
    </div>
  {:else if error}
    <div class="text-sm text-red-500">
      {error}
    </div>
  {:else}
    <div class="flex flex-col divide-y divide-slate-200 dark:divide-zinc-800">
      {#each posts as post}
        <a 
          href={postLink(post.post)} 
          class="block group py-3 first:pt-1 last:pb-1"
        >
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <Avatar
                url={post.creator.avatar}
                alt={post.creator.name}
                width={32}
                class_="w-8 h-8 rounded-full"
              />
              <span class="text-sm font-medium text-slate-900 dark:text-zinc-200">
                {post.creator.display_name || post.creator.name}
              </span>
            </div>
            <div class="text-sm font-normal text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-zinc-200 line-clamp-3">
              {extractFirstH1(post.post.body) || post.post.name}
            </div>
            <div class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
              <span class="flex items-center gap-1">
                <Icon src={Heart} solid size="14" class="text-red-500 dark:text-red-400" />
                {post.counts.score}
              </span>
              <span class="flex items-center gap-1">
                <Icon src={ChatBubbleOvalLeft} size="14" />
                {post.counts.comments}
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div> 