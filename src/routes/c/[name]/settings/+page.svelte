<script lang="ts">
  import CommunityForm from '$lib/components/lemmy/community/CommunityForm.svelte'
  import CommunityTitle from '$lib/components/lemmy/community/CommunityTitle.svelte'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { Button, Modal, toast } from 'mono-svelte'
  import { getClient } from '$lib/lemmy.js'
  import { goto } from '$app/navigation'
  import { profile } from '$lib/auth.js'
  import { Trash, Icon } from 'svelte-hero-icons'

  export let data

  let deleteModalOpen = false
  let deleting = false
  let confirmName = ''

  const community = data.community.community_view.community

  async function deleteCommunity() {
    if (!$profile?.jwt) return
    deleting = true
    try {
      await getClient().deleteCommunity({
        community_id: community.id,
        deleted: true,
      })
      toast({ content: 'Сообщество удалено', type: 'success' })
      goto('/')
    } catch (err) {
      toast({ content: err as any, type: 'error' })
    }
    deleting = false
  }
</script>

<div class="flex flex-col gap-4">
  <Header pageHeader>
    <CommunityTitle
      slot="extended"
      community={data.community.community_view.community}
    />
  </Header>
  <CommunityForm
    edit={data.community.community_view.community.id}
    formData={{
      name: data.community.community_view.community.name,
      displayName: data.community.community_view.community.title,
      nsfw: data.community.community_view.community.nsfw,
      postsLockedToModerators:
        data.community.community_view.community.posting_restricted_to_mods,
      sidebar: data.community.community_view.community.description ?? '',
      icon: data.community.community_view.community.icon,
      banner: data.community.community_view.community.banner,
      visibility: data.community.community_view.community.visibility,
      submitting: false,
    }}
  >
    <svelte:fragment slot="formtitle">{''}</svelte:fragment>
  </CommunityForm>

  <!-- Опасная зона -->
  <div class="border border-red-200 dark:border-red-900 rounded-xl p-4 flex flex-col gap-3">
    <p class="text-sm font-medium text-red-700 dark:text-red-400">Опасная зона</p>
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm font-medium">Удалить сообщество</p>
        <p class="text-xs text-slate-500 dark:text-zinc-400">Сообщество будет удалено безвозвратно вместе со всем контентом.</p>
      </div>
      <Button color="danger" size="md" on:click={() => (deleteModalOpen = true)}>
        <Icon src={Trash} mini size="16" slot="prefix" />
        Удалить
      </Button>
    </div>
  </div>
</div>

<!-- Модалка подтверждения -->
<Modal bind:open={deleteModalOpen} title="Удалить сообщество">
  <form on:submit|preventDefault={deleteCommunity} class="flex flex-col gap-4">
    <p class="text-sm">
      Это действие <strong>необратимо</strong>. Сообщество и весь его контент будут удалены навсегда.
    </p>
    <p class="text-sm">
      Введите название сообщества <span class="font-mono font-medium">{community.name}</span>, чтобы подтвердить:
    </p>
    <input
      type="text"
      bind:value={confirmName}
      placeholder={community.name}
      class="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
    />
    <Button
      color="danger"
      size="lg"
      submit
      loading={deleting}
      disabled={deleting || confirmName !== community.name}
    >
      <Icon src={Trash} mini size="16" slot="prefix" />
      Удалить сообщество навсегда
    </Button>
  </form>
</Modal>
