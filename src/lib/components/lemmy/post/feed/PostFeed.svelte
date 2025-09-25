<script lang="ts">
  import { browser } from '$app/environment'
  import Post from '$lib/components/lemmy/post/Post.svelte'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import { userSettings } from '$lib/settings.js'
  import type { PostView } from 'lemmy-js-client'
  import { Badge, Button } from 'mono-svelte'
  import { ArchiveBox, Icon, Minus, Plus } from 'svelte-hero-icons'
  import { expoOut } from 'svelte/easing'
  import { fly, slide } from 'svelte/transition'
  import { combineCrossposts } from './crosspost'
  import { onMount } from 'svelte'

  export let posts: PostView[]
  export let community: boolean = false
  export const feedData = {}

  $: combinedPosts = combineCrossposts(posts)
  let viewPost: number = -1

  const postView = 'cozy'
</script>

<style lang="postcss">
  @keyframes popIn {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
    to {
      transform: translateY(0px);
      opacity: 1;
    }
  }

  /* Используем один :global() для всего блока стилей поста */
  :global(.post p) {
    margin: 1rem 0;
  }
  
  /* Стили для заголовков в превью постов */
  :global(.post h1) {
    font-weight: 500;
  }
  
  :global(.post h2) {
    font-weight: 500;
  }
  
  :global(.post h3) {
    font-weight: 500;
  }
  
  /* Стили для жирного текста в превью постов */
  :global(.post strong),
  :global(.post b) {
    font-weight: 500;
  }
  
  :global(.post a) {
    @apply text-blue-600 dark:text-blue-400 hover:underline;
  }
  
  :global(.post ul), :global(.post ol) {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  
  :global(.post li) {
    margin-bottom: 0.5rem;
  }
  
  :global(.post img) {
    @apply max-w-full rounded-lg my-4;
  }
  
  :global(.post figure) {
    @apply my-4;
  }
  
  :global(.post figcaption) {
    @apply text-sm text-slate-600 dark:text-zinc-400 mt-2;
  }

  /* Стили для кнопки Primary в превью постов */
  :global(.post .btn-primary) {
    background-color: var(--btn-primary-background);
    color: var(--btn-primary-color);
    border: 1px solid var(--btn-primary-border);
    border-radius: var(--btn-primary-border-radius);
    padding: var(--btn-primary-padding-y) var(--btn-primary-padding-x);
    font-size: var(--btn-primary-font-size);
    font-weight: var(--btn-primary-font-weight);
    line-height: var(--btn-primary-line-height);
    transition: var(--btn-primary-transition);
    box-shadow: var(--btn-primary-shadow);
    width: var(--btn-primary-width);
    display: var(--btn-primary-display);
    align-items: var(--btn-primary-align-items);
    justify-content: var(--btn-primary-justify-content);
  }

  :global(.post .btn-primary:hover) {
    background-color: var(--btn-primary-background-hover);
    color: var(--btn-primary-color);
    text-decoration: none;
    box-shadow: var(--btn-primary-shadow-hover);
  }
</style>
<ul
  class="flex flex-col list-none {postView == 'cozy'
    ? 'gap-3 md:gap-4'
    : 'divide-y'} divide-slate-800 dark:divide-zinc-800"
>
  {#if posts?.length == 0}
    <div class="h-full grid place-items-center">
      <Placeholder
        icon={ArchiveBox}
        title="No posts"
        description="There are no posts that match this filter."
      >
        <Button href="/communities">
          <Icon src={Plus} size="16" mini slot="prefix" />
          <span>Follow some communities</span>
        </Button>
      </Placeholder>
    </div>
  {:else}
    {#each combinedPosts as post, index}
      {#if !($userSettings.hidePosts.deleted && post.post.deleted) && !($userSettings.hidePosts.removed && post.post.removed)}
        <li class="relative post-container bg-white dark:bg-zinc-900 rounded-xl {browser ? 'p-4 sm:p-6' : 'px-4 sm:px-6'}">
          <Post
            hideCommunity={community}
            hideTitle={true}
            view={postView}
            {post}
            class="transition-all duration-250"
            on:hide={() => {
              posts = posts.toSpliced(index, 1)
            }}
          >
                      
            {#if post.post.body}
              <div class="text-base text-slate-800 dark:text-zinc-200 leading-[1.5] post mt-4">
                {@html post.post.body}
              </div>
            {/if}

            <svelte:fragment slot="badges">
              {#if post.withCrossposts}
                <button
                  on:click={() => {
                    if (viewPost == post.post.id) viewPost = -1
                    else viewPost = post.post.id
                  }}
                  class="transition-transform hover:scale-105"
                >
                  <Badge
                    class="z-10 backdrop-blur-xl cursor-pointer transition-colors"
                    color="gray-subtle"
                  >
                    <Icon 
                      mini 
                      src={viewPost == post.post.id ? Minus : Plus} 
                      size="14" 
                    />
                    {post.crossposts.length} crosspost{post.crossposts.length !== 1 ? 's' : ''}
                  </Badge>
                </button>
              {/if}
            </svelte:fragment>
            
          </Post>
          
          {#if post.withCrossposts && viewPost == post.post.id}
            <div
              transition:slide|global={{
                axis: 'y',
                duration: 500,
                easing: expoOut,
              }}
              class="space-y-4 mt-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4"
            >
              <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                <span>Crossposts</span>
                <div class="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />
                <span>{post.crossposts.length}</span>
              </div>
              
              {#each post.crossposts as crosspost}
                <Post post={crosspost} view={$userSettings.view} />
              {/each}
            </div>
          {/if}
        </li>
      {/if}
    {/each}
  {/if}
  <slot />
</ul>
