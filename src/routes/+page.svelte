<script lang="ts" context="module">
</script>

<script lang="ts">
  import { page } from '$app/stores'
  import { env } from '$env/dynamic/public'
  import Pageination from '$lib/components/ui/Pageination.svelte'
  import Sort from '$lib/components/lemmy/dropdowns/Sort.svelte'
  import Location from '$lib/components/lemmy/dropdowns/Location.svelte'
  import ViewSelect from '$lib/components/lemmy/dropdowns/ViewSelect.svelte'
  import { searchParam } from '$lib/util.js'
  import { ChartBar, Icon } from 'svelte-hero-icons'
  import { site } from '$lib/lemmy.js'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { t } from '$lib/translations.js'
  import { userSettings } from '$lib/settings.js'
  import { browser } from '$app/environment'
  import VirtualFeed from '$lib/components/lemmy/post/feed/VirtualFeed.svelte'
  import PostFeed from '$lib/components/lemmy/post/feed/PostFeed.svelte'

  export let data

  // Определяем канонический URL для главной страницы
  $: canonicalUrl = new URL('/', $page.url.origin).toString();

  // Преобразуем null в undefined для совместимости типов
  $: cursorNext = data.cursor.next === null ? undefined : data.cursor.next;
  
  // Создаем новый объект с правильным типом cursor.next
  $: feedDataFixed = {
    ...data,
    type_: data.type,
    sort: data.sort, // Явно добавляем sort
    cursor: { next: cursorNext }
  };
</script>
<div class="flex flex-col gap-2 max-w-full w-full min-w-0">
  <header class="flex flex-col gap-4 relative">
    <Header pageHeader>
      {$t('routes.frontpage.title')}
      <div class="flex items-baseline max-w-[640px] mx-auto gap-2" slot="extended">
        <Location selected={data.type} changeDefault hideOnHome={false} />
        <Sort changeDefault selected={data.sort} />
        <!-- Удаляем или комментируем эту строку -->
        <!-- <ViewSelect /> -->
      </div>
    </Header>
  </header>
  <svelte:component
    this={$userSettings.infiniteScroll &&
    browser &&
    !$userSettings.posts.noVirtualize
      ? VirtualFeed
      : PostFeed}
    posts={data.posts.posts}
    bind:feedData={feedDataFixed}
    feedId="main"
  />
  <svelte:element
    this={$userSettings.infiniteScroll && !$userSettings.posts.noVirtualize
      ? 'noscript'
      : 'div'}
    class="mt-auto"
  >
    <Pageination
      cursor={{ next: cursorNext }}
      on:change={(p) => searchParam($page.url, 'page', p.detail.toString())}
      on:cursor={(c) => {
        searchParam($page.url, 'cursor', c.detail)
      }}
    >
      <span class="flex flex-row items-center gap-1">
        <Icon src={ChartBar} size="16" mini />
        {$t('routes.frontpage.footer', {
          // @ts-ignore
          users: $site?.site_view?.counts?.users_active_day ?? '??',
        })}
      </span>
    </Pageination>
  </svelte:element>
</div>

<svelte:head>
  <title>{env.PUBLIC_SITE_TITLE}</title>
  <meta name="description" content={env.PUBLIC_SITE_DESCRIPTION} />
  
  <!-- Open Graph теги -->
  <meta property="og:title" content={env.PUBLIC_OG_TITLE} />
  <meta property="og:description" content={env.PUBLIC_OG_DESCRIPTION} />
  <meta property="og:image" content={env.PUBLIC_OG_IMAGE} />
  <meta property="og:url" content={env.PUBLIC_OG_URL} />
  <meta property="og:type" content="website" />
  
  <!-- Twitter теги -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={env.PUBLIC_TWITTER_TITLE} />
  <meta name="twitter:description" content={env.PUBLIC_TWITTER_DESCRIPTION} />
  
  <!-- Дополнительные мета-теги -->
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={canonicalUrl} />
</svelte:head>
