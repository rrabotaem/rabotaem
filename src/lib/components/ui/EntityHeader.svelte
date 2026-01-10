<script lang="ts">
  import { Material } from 'mono-svelte'
  import Avatar from './Avatar.svelte'
  import PostBody from '../lemmy/post/PostBody.svelte'
  import LabelStat from './LabelStat.svelte'
  import { optimizeImageURL } from '../lemmy/post/helpers'
  import FormattedNumber from '../util/FormattedNumber.svelte'
  import Markdown from '../markdown/Markdown.svelte'

  export let avatar: string | undefined = undefined
  export let name: string
  export let bio: string | undefined = undefined
  export let banner: string | undefined = undefined
  export let url: string | undefined = undefined
</script>

<Material
  color="transparent"
  padding="none"
  rounding="xl"
  {...$$restProps}
  class="z-10 relative !border-0 {$$props.class}"
>
  <!-- Обертка для правильного позиционирования -->
  <div class="relative">
    <div class="w-full aspect-[3/1] overflow-hidden rounded-t-xl">
      {#if banner}
        <!-- Картинки разного разрешения для разных экранов -->
        <picture>
          <source srcset={optimizeImageURL(banner, 512)} media="(max-width: 640px)" />
          <source srcset={optimizeImageURL(banner, 728)} media="(max-width: 1024px)" />
          <img
            src={optimizeImageURL(banner, 1024)}
            class="w-full h-full object-cover"
            alt="Community banner"
          />
        </picture>
      {:else}
        <div 
          class="w-full h-full" 
          style="background-image: url('/img/communityBackground1.webp'); background-size: cover; background-position: center;"
        />
      {/if}
    </div>
    
    <div class="absolute -bottom-12 left-8 z-20">
      <Avatar
        width={96}
        url={avatar}
        alt={name}
        class_="ring-8 ring-slate-50 dark:ring-zinc-950 bg-slate-50 dark:bg-zinc-950"
      />
    </div>
  </div>

  <div class="p-4 pt-16 sm:pt-4 flex flex-col gap-2">
    <div class="flex-1 flex flex-row items-center text-left gap-0 sm:gap-8">
      <div class="hidden sm:block w-24 flex-shrink-0"></div>
      <div class="flex flex-col min-w-0 flex-1">
        <svelte:element
          this={url ? 'a' : 'span'}
          href={url}
          class="text-2xl font-semibold break-words max-w-full {url
            ? 'hover:underline hover:text-primary-900 hover:dark:text-primary-100'
            : ''}"
        >
          {name}
        </svelte:element>
        <span
          class="flex items-center gap-0 text-sm text-slate-600 dark:text-zinc-400 max-w-full w-max"
        >
          <slot name="nameDetail" />
        </span>
      </div>
    </div>

    <!-- Описание сообщества -->
    <div class="flex-1 flex flex-row items-center text-left gap-0 sm:gap-8">
      <div class="hidden sm:block w-24 flex-shrink-0"></div>
      <div class="flex flex-col">
        {#if bio}
          <div class="relative max-w-full w-full">
            <div class="text-sm text-black dark:text-white">
                <Markdown source={bio} />
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Material>

<style>
  :global(.banner-gradient) {
    background: linear-gradient(180deg, #2e1065 0%, #4c1d95 100%);
  }
</style>
