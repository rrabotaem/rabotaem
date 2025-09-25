<script lang="ts">
  import { navigating, page } from '$app/stores'
  import CommunityCard from '$lib/components/lemmy/community/CommunityCard.svelte'
  import Sort from '$lib/components/lemmy/dropdowns/Sort.svelte'
  import { fullCommunityName, searchParam } from '$lib/util.js'
  import { onDestroy, onMount } from 'svelte'
  import { setSessionStorage } from '$lib/session.js'
  import VirtualFeed from '$lib/components/lemmy/post/feed/VirtualFeed.svelte'
  import { Button, Modal } from 'mono-svelte'
  import { browser } from '$app/environment'
  import { ArrowRight, ChartBar, Icon, XMark } from 'svelte-hero-icons'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import { t } from '$lib/translations.js'
  import { userSettings } from '$lib/settings.js'
  import { site } from '$lib/lemmy.js'
  import { resumables } from '$lib/lemmy/item'
  import CommunityHeader from '$lib/components/lemmy/community/CommunityHeader.svelte'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import type { SortType } from 'lemmy-js-client'

  export let data

  $: communityData = data?.community?.community_view || null
  $: moderators = data?.moderators || []
  $: communityName = $page.params.name
  
  let sidebar: boolean = false

  onMount(() => {
    if (browser && communityData) {
      setSessionStorage('lastSeenCommunity', communityData.community)
      resumables.add({
        name: communityData.community.title,
        type: 'community',
        url: $page.url.toString(),
        avatar: communityData.community.icon,
      })
    }
  })

  onDestroy(() => {
    if (browser && $navigating?.to?.route?.id !== '/create/post') {
      setSessionStorage('lastSeenCommunity', undefined)
    }
  })
</script>

{#if !communityData}
  <div class="flex justify-center items-center h-32">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
  </div>
{:else}
  <CommunityHeader
    community={communityData.community}
    subscribed={communityData.subscribed}
    counts={communityData.counts}
    moderators={moderators}
    blocked={communityData.blocked}
  />

  <div class="flex flex-col gap-4 max-w-[640px] mx-auto w-full">
    <Header pageHeader>
      <Sort selected={data.sort} slot="extended" />
    </Header>
    
    {#if communityData.blocked}
      <Placeholder
        icon={XMark}
        title="Blocked"
        description="You've blocked this community."
      >
        <Button href="/profile/blocks">
          <Icon src={ArrowRight} size="16" mini slot="suffix" />
          Blocked Communities
        </Button>
      </Placeholder>
    {:else}
      <VirtualFeed
        posts={data.posts?.posts || []}
        community={true}
        loading={$navigating}
        feedId="community"
        feedData={{
          posts: data.posts || { posts: [] },
          cursor: { next: data.cursor?.next || undefined },
          community_name: data.community_name,
          limit: data.limit || 20,
          sort: data.sort || "Hot"
        }}
      />
    {/if}
  </div>
{/if}

<style>
</style>
