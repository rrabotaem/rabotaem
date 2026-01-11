<script lang="ts">
  import InboxItem from './InboxItem.svelte'
  import { ArrowPath, Check, Icon, Inbox } from 'svelte-hero-icons'
  import { getClient } from '$lib/lemmy.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import Pageination from '$lib/components/ui/Pageination.svelte'
  import { notifications, profile } from '$lib/auth.js'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import { fly } from 'svelte/transition'
  import { searchParam } from '$lib/util.js'
  import { Button } from 'mono-svelte'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { t } from '$lib/translations'
  import Tabs from '$lib/components/ui/layout/pages/Tabs.svelte'
  import { contentPadding } from '$lib/components/ui/layout/Shell.svelte'
  import { expoOut } from 'svelte/easing'

  export let data

  let markingAsRead = false

  let isUnreadOnly = false
  let hasUnreadItems = false
  
  $: {
    const unreadOnlyParam = $page.url.searchParams.get('unreadOnly')
    const isUnreadOnlyValue = unreadOnlyParam === 'true'
    const isEmptySearch = !$page.url.search && $page.url.pathname === '/inbox'
    
    isUnreadOnly = isEmptySearch || isUnreadOnlyValue
    hasUnreadItems = $notifications.inbox > 0 || (data.data?.some(item => !item.read) ?? false)
  }

  async function markAllAsRead() {
    if (!$profile?.user) {
      goto('/login')
      return
    }

    markingAsRead = true

    await getClient().markAllAsRead()

    $notifications.inbox = 0

    goto($page.url, {
      invalidateAll: true,
    }).then(() => {
      markingAsRead = false
    })
  }

  function replaceSearchParams(newParamString: string) {
    return new URLSearchParams(newParamString.startsWith('?') ? newParamString.slice(1) : newParamString)
  }

  function matchSearchParams(current: string, target: string): boolean {
    if (!current && !target) return true
    if (!current || !target) return false
    
    const cleanCurrent = current.startsWith('?') ? current.slice(1) : current
    const cleanTarget = target.startsWith('?') ? target.slice(1) : target
    
    const currentParams = new URLSearchParams(cleanCurrent)
    const targetParams = new URLSearchParams(cleanTarget)
    
    const relevantKeys = ['unreadOnly', 'type']
    
    for (const key of relevantKeys) {
      const targetValue = targetParams.get(key)
      const currentValue = currentParams.get(key)
      
      if (targetValue !== null) {
        if (currentValue !== targetValue) return false
      } else {
        if (currentValue !== null) return false
      }
    }
    
    return true
  }
</script>

<svelte:head>
  <title>{$t('routes.inbox.title')}</title>
</svelte:head>

<div class="gap-2">
  <div
    class="mt-4 mb-0 sticky z-30 mx-auto max-w-full flex gap-2 md:flex-row flex-col
items-center px-2 w-max"
    style="top: max(1.5rem, {$contentPadding.top}px);"
  >
    <Tabs
      routes={[
        {
          href: '?unreadOnly=true',
          name: 'Непрочитанные',
        },
        {
          href: '?unreadOnly=false',
          name: 'Все',
        },
        {
          href: '?type=mentions&unreadOnly=false',
          name: 'Упоминания',
        },
      ]}
      currentRoute={$page.url.search}
      isSelected={(url, current, route, def) => {
        const currentSearch = current || url.search
        return matchSearchParams(currentSearch, route) || (!currentSearch && route === def) || (!route && currentSearch === def)
      }}
      class="overflow-auto w-full"
      buildUrl={(route, href) =>
        '?' + replaceSearchParams(href).toString()
      }
      defaultRoute="?unreadOnly=true"
    />
  </div>
  <Header pageHeader class="sm:flex-row justify-between flex-col">
    <div class="flex items-center gap-2 mt-4">
      <Button
        on:click={() => goto($page.url, { invalidateAll: true })}
        size="square-lg"
        rounding="xl"
        title={$t('common.refresh')}
      >
        <Icon src={ArrowPath} size="16" mini slot="prefix" />
      </Button>
      {#if isUnreadOnly && hasUnreadItems}
        <Button
          on:click={markAllAsRead}
          loading={markingAsRead}
          disabled={markingAsRead || !$profile?.jwt}
          size="lg"
          class="h-10"
        >
          <Icon src={Check} width={16} mini slot="prefix" />
          Отметить все как прочитанные
        </Button>
      {/if}
    </div>
  </Header>
</div>

<div
  class="flex flex-col gap-4"
>
  {#if !data.data?.length}
    <Placeholder
      icon={Inbox}
      title={$t('routes.inbox.empty.title')}
      description={$t('routes.inbox.empty.description')}
    />
  {:else}
    {#each data.data as item, index (item.id)}
      <div
        in:fly|global={{
          duration: 1000,
          y: 16,
          opacity: 0,
          easing: expoOut,
          delay: index * 50,
        }}
      >
        <InboxItem bind:item />
      </div>
    {/each}
  {/if}
  {#if (data.page ?? 1) > 1 || (data.data?.length ?? 0) > 0}
    <div
      class="sticky z-30 mx-auto max-w-full self-end mt-auto"
      style="bottom: max(1.5rem, {$contentPadding.bottom}px);"
    >
      <Tabs routes={[]} class="mx-auto">
        <Pageination
          hasMore={(data.data?.length ?? 0) >= (data.limit ?? 20)}
          page={data.page ?? 1}
          on:change={(p) => searchParam($page.url, 'page', p.detail.toString())}
        />
      </Tabs>
    </div>
  {/if}
</div>
