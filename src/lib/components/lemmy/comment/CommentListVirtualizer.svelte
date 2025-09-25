<script lang="ts">
  import type { Post } from 'lemmy-js-client'
  import type { CommentNodeI } from './comments'
  import { createWindowVirtualizer } from '@tanstack/svelte-virtual'
  import Comments from './Comments.svelte'
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'

  export let nodes: CommentNodeI[]
  export let post: Post
  export let scrollTo: string | undefined
  export let autoReply: boolean = false

  let virtualListEl: HTMLElement | undefined = undefined

  $: virtualizer = createWindowVirtualizer({
    count: nodes.length,
    estimateSize: () => 30,
    scrollMargin: virtualListEl?.offsetTop,
    initialRect: {
      height: 1500,
      width: 99999,
    },
    overscan: 5,
  })

  let virtualItemEls: HTMLElement[] = []

  $: items = $virtualizer.getVirtualItems()

  // Определяем ID комментария для автоответа из hash URL
  $: replyToCommentId = autoReply && $page.url.hash 
    ? Number($page.url.hash.substring(1)) 
    : undefined

  $: {
    if (virtualItemEls.length)
      virtualItemEls.forEach((el) => $virtualizer.measureElement(el))
  }

  onMount(() => {
    if (scrollTo) {
      const element = document?.getElementById(scrollTo)
      setTimeout(() => {
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
    
    // Если есть автоответ, скроллим к комментарию и позиционируем его вверху
    if (autoReply && replyToCommentId) {
      setTimeout(() => {
        const element = document?.getElementById(replyToCommentId.toString())
        if (element) {
          // Позиционируем комментарий вверху экрана
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300) // Увеличиваем задержку для корректного рендеринга
    }
  })
</script>

<div
  style="position:relative; height: {browser
    ? `${$virtualizer.getTotalSize()}px`
    : '100%'}; width: 100%;"
  bind:this={virtualListEl}
>
  <div
    style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY({items?.[0]
      ? items?.[0]?.start - $virtualizer.options.scrollMargin
      : 0}px);"
    class=""
    id="feed"
  >
    {#each items as row, index (row.index)}
      <div
        bind:this={virtualItemEls[index]}
        data-index={row.index}
        class="-mx-4 sm:-mx-6 px-4 sm:px-6"
      >
        <Comments isParent={true} nodes={[nodes[row.index]]} {post} autoReplyTo={replyToCommentId} />
      </div>
    {/each}
  </div>
</div>
