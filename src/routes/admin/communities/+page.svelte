<script lang="ts">
  import { navigating, page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { profile } from '$lib/auth.js'
  import { getClient } from '$lib/lemmy.js'
  import { fullCommunityName, searchParam } from '$lib/util.js'
  import { t } from '$lib/translations.js'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import Pageination from '$lib/components/ui/Pageination.svelte'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import { Button, Modal, TextInput, toast } from 'mono-svelte'
  import {
    Fire,
    Icon,
    MagnifyingGlass,
    PencilSquare,
    Trash,
  } from 'svelte-hero-icons'
  import type { CommunityView } from 'lemmy-js-client'
  import type { PageData } from './$types.js'

  export let data: PageData

  let search = data.query || ''
  let removeOpen = false
  let purgeOpen = false
  let removeTarget: CommunityView | null = null
  let purgeTarget: CommunityView | null = null
  let removeReason = ''
  let purgeReason = ''
  let removing = false
  let purging = false
  let purgeEnabled = false

  const communityLink = (community: CommunityView) =>
    `/c/${fullCommunityName(
      community.community.name,
      community.community.actor_id
    )}`

  const handleOpenRemove = (community: CommunityView) => {
    removeTarget = community
    removeReason = ''
    removeOpen = true
  }

  const handleOpenPurge = (community: CommunityView) => {
    purgeTarget = community
    purgeReason = ''
    purgeEnabled = false
    purgeOpen = true
    setTimeout(() => {
      purgeEnabled = true
    }, 3000)
  }

  const handleRemove = async () => {
    if (!removeTarget || !$profile?.jwt) return
    if (!removeReason.trim()) {
      toast({
        content: $t('routes.admin.communities.reason.required'),
        type: 'error',
      })
      return
    }

    removing = true
    try {
      await getClient().removeCommunity({
        community_id: removeTarget.community.id,
        removed: !removeTarget.community.removed,
        reason: removeReason.trim(),
      })
      toast({
        content: removeTarget.community.removed
          ? $t('toast.restoredCommunity')
          : $t('toast.removedCommunity'),
        type: 'success',
      })
      removeOpen = false
      removeTarget = null
      removeReason = ''
      goto($page.url, { invalidateAll: true })
    } catch (err) {
      toast({
        content: err as any,
        type: 'error',
      })
    }
    removing = false
  }

  const handlePurge = async () => {
    if (!purgeTarget || !$profile?.jwt) return
    if (!purgeReason.trim()) {
      toast({
        content: $t('routes.admin.communities.reason.required'),
        type: 'error',
      })
      return
    }

    purging = true
    try {
      await getClient().purgeCommunity({
        community_id: purgeTarget.community.id,
        reason: purgeReason.trim(),
      })
      toast({
        content: $t('toast.purgedCommunity'),
        type: 'success',
      })
      purgeOpen = false
      purgeTarget = null
      purgeReason = ''
      goto($page.url, { invalidateAll: true })
    } catch (err) {
      toast({
        content: err as any,
        type: 'error',
      })
    }
    purging = false
  }
</script>

<svelte:head>
  <title>{$t('routes.admin.communities.title')}</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <Header pageHeader>{$t('routes.admin.communities.title')}</Header>
  <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
    <div class="text-sm font-semibold">
      {$t('routes.admin.communities.warning.title')}
    </div>
    <p class="text-xs mt-1">
      {$t('routes.admin.communities.warning.description')}
    </p>
  </div>
  <form
    on:submit|preventDefault={() =>
      searchParam($page.url, 'q', search, 'page')}
    class="flex flex-wrap items-center gap-2"
  >
    <TextInput
      bind:value={search}
      aria-label={$t('routes.search.query')}
      size="lg"
      class="flex-1 min-w-[220px]"
      placeholder={$t('routes.admin.communities.search.placeholder')}
    />
    <Button
      submit
      color="primary"
      size="md"
      class="h-full"
      title={$t('routes.search.title')}
      loading={$navigating != null}
    >
      <Icon src={MagnifyingGlass} size="16" micro slot="prefix" />
      {$t('routes.search.title')}
    </Button>
  </form>
  {#if data.communities.length === 0}
    <Placeholder
      icon={MagnifyingGlass}
      title={$t('routes.search.noResults.title')}
      description={$t('routes.search.noResults.description')}
      class="!font-normal"
    />
  {:else}
    <div class="flex flex-col gap-3">
      {#each data.communities as community (community.community.id)}
        <div
          class="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex flex-col gap-1">
              <div class="text-sm text-slate-500 dark:text-zinc-400">
                /c/{community.community.name}
              </div>
              <div class="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                {community.community.title || community.community.name}
              </div>
              <div class="text-xs text-slate-500 dark:text-zinc-400">
                {$t('cards.community.members')}: {community.counts?.subscribers ?? 0}
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              {#if community.community.removed}
                <span class="rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-2 py-1 text-xs">
                  {$t('post.badges.removed')}
                </span>
              {/if}
              <Button
                href={communityLink(community)}
                size="sm"
                color="secondary"
                aria-label={$t('routes.admin.communities.view')}
              >
                {$t('routes.admin.communities.view')}
              </Button>
              <Button
                href={`/admin/communities/${community.community.name}`}
                size="sm"
                color="secondary"
                aria-label={$t('form.edit')}
              >
                <Icon src={PencilSquare} size="16" mini slot="prefix" />
                {$t('form.edit')}
              </Button>
              <Button
                size="sm"
                color="danger-subtle"
                on:click={() => handleOpenRemove(community)}
                aria-label={$t('moderation.remove')}
              >
                <Icon src={Trash} size="16" mini slot="prefix" />
                {community.community.removed
                  ? $t('moderation.restore')
                  : $t('moderation.remove')}
              </Button>
              <Button
                size="sm"
                color="danger"
                on:click={() => handleOpenPurge(community)}
                aria-label={$t('admin.purge')}
              >
                <Icon src={Fire} size="16" mini slot="prefix" />
                {$t('admin.purge')}
              </Button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {#if data.communities.length > 0}
    <Pageination
      page={data.page}
      on:change={(p) => searchParam($page.url, 'page', p.detail.toString())}
    />
  {/if}
</div>

{#if removeOpen && removeTarget}
  <Modal bind:open={removeOpen}>
    <svelte:fragment slot="title">
      {removeTarget.community.removed
        ? $t('routes.admin.communities.restore.title')
        : $t('routes.admin.communities.remove.title')}
    </svelte:fragment>
    <p class="text-sm text-slate-600 dark:text-zinc-400">
      {removeTarget.community.removed
        ? $t('routes.admin.communities.restore.description')
        : $t('routes.admin.communities.remove.description')}
    </p>
    <TextInput
      bind:value={removeReason}
      label={$t('routes.moderation.reason')}
      placeholder={$t('routes.admin.communities.reason.placeholder')}
      class="mt-3"
    />
    <div class="flex flex-row gap-2 mt-4">
      <Button size="lg" on:click={() => (removeOpen = false)} class="flex-1">
        {$t('common.cancel')}
      </Button>
      <Button
        size="lg"
        color="danger"
        on:click={handleRemove}
        loading={removing}
        disabled={removing}
        class="flex-1"
      >
        {removeTarget.community.removed
          ? $t('moderation.restore')
          : $t('moderation.remove')}
      </Button>
    </div>
  </Modal>
{/if}

{#if purgeOpen && purgeTarget}
  <Modal bind:open={purgeOpen}>
    <svelte:fragment slot="title">
      {$t('admin.purgeCommunity.title')}
    </svelte:fragment>
    <p class="text-sm text-slate-600 dark:text-zinc-400">
      {$t('admin.purgeCommunity.warning')}
    </p>
    <TextInput
      bind:value={purgeReason}
      label={$t('routes.moderation.reason')}
      placeholder={$t('routes.admin.communities.reason.placeholder')}
      class="mt-3"
    />
    <div class="flex flex-row gap-2 mt-4">
      <Button size="lg" on:click={() => (purgeOpen = false)} class="flex-1">
        {$t('common.cancel')}
      </Button>
      <Button
        size="lg"
        color="danger"
        on:click={handlePurge}
        disabled={!purgeEnabled || purging}
        loading={purging}
        class="flex-1"
      >
        {$t('admin.purge')}
      </Button>
    </div>
  </Modal>
{/if}
