<script lang="ts">
  import { optimizeImageURL } from '$lib/components/lemmy/post/helpers'
  import { findClosestNumber } from '$lib/util.js'
  import { createAvatar } from '@dicebear/core'
  import * as initials from '@dicebear/initials'

  const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512]

  export let url: string | undefined = undefined
  export let alt: string = ''
  export let title: string = ''
  export let circle: boolean = true
  export let width: number = 28
  export let res: number | undefined = undefined
  export let class_: string = ''

  // Базовые классы для всех аватаров
  const baseClasses = "aspect-square object-cover overflow-hidden flex-shrink-0 border border-slate-300 dark:border-zinc-700"

  const optimizeUrl = (
    url: string | undefined,
    res: number
  ): string | undefined => {
    if (url === undefined) return

    try {
      const urlObj = new URL(url)
      urlObj.searchParams.append('format', 'webp')
      if (res > -1) {
        urlObj.searchParams.append(
          'thumbnail',
          findClosestNumber(sizes, res).toString()
        )
      }

      return urlObj.toString()
    } catch (e) {
      return undefined
    }
  }

  $: optimizedURLs = [2, 3, 6, -1].map((n) =>
    optimizeUrl(url, (res || width) * n)
  )

  function generateSrcSet(url: string, baseWidth: number) {
    const sizes = [
      { width: baseWidth, multiplier: '1x' },
      { width: baseWidth * 1.5, multiplier: '2x' },
      { width: baseWidth * 4, multiplier: '4x' },
      { width: baseWidth * 6, multiplier: '6x' }
    ]
    
    return sizes
      .map(size => `${optimizeImageURL(url, size.width)} ${size.multiplier}`)
      .join(', ')
  }
</script>

{#if url}
  <img
    loading="lazy"
    srcset={generateSrcSet(url, width)}
    src={optimizeImageURL(url, width)}
    {alt}
    {width}
    title=""
    class="{baseClasses} {circle ? 'rounded-full' : 'rounded-lg'} {class_}"
    style="width: {width}px; height: {width}px"
  />
{:else}
  <div
    class="{baseClasses} {circle ? 'rounded-full' : 'rounded-lg'}"
    style="width: {width}px; height: {width}px"
  >
    {@html createAvatar(initials, {
      seed: alt,
    }).toString()}
  </div>
{/if}
