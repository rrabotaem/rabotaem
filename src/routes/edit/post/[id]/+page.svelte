<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { profile } from '$lib/auth.js'
  import { getClient } from '$lib/lemmy.js'
  import { onMount } from 'svelte'
  import { toast } from 'mono-svelte'
  import { t } from '$lib/translations'
  import PostForm from '$lib/components/lemmy/post/form/PostForm.svelte'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'

  let post: any = null
  let loading = true
  let error: Error | null = null

  onMount(async () => {
    try {
      const response = await getClient().getPost({
        id: parseInt($page.params.id)
      })
      
      if (!$profile?.user || 
          (response.post_view.creator.id !== $profile.user.local_user_view.person.id && 
           !$profile.user.local_user_view.local_user.admin)) {
        throw new Error('Unauthorized')
      }
      
      post = response.post_view
      console.log('Post data:', post)
      
      if (post.post.deleted) {
        throw new Error('Post is deleted')
      }
      
      loading = false
    } catch (e) {
      error = e as Error
      loading = false
    }
  })
</script>

<Header>
  <h1 class="text-2xl font-bold">{$t('post.actions.more.edit')}</h1>
</Header>

<div class="w-full max-w-5xl mx-auto h-full">
  {#if loading}
    <div class="flex justify-center">
      <span class="loading loading-spinner" />
    </div>
  {:else if error}
    <div class="alert alert-error">
      {error.message}
    </div>
  {:else}
    <PostForm
      edit
      editingPost={{
        id: post.post.id,
        name: post.post.name,
        url: post.post.url || "",
        body: post.post.body || "",
        nsfw: post.post.nsfw || false,
        community_id: post.community.id,
        language_id: post.post.language_id || 0,
        honeypot: "",
        removed: post.post.removed || false,
        deleted: post.post.deleted || false,
        creator_id: post.post.creator_id,
        alt_text: post.post.alt_text
      }}
      data={{
        community: post.community,
        title: post.post.name,
        body: post.post.body || "",
        image: null,
        nsfw: post.post.nsfw,
        loading: false,
        url: post.post.url || "",
        language_id: post.post.language_id
      }}
      community={post.community}
      on:submit={(e) => {
        toast({
          content: $t('toast.postEdited'),
          type: 'success'
        })
        goto(`/post/${post.post.id}`)
      }}
    >
      <svelte:fragment slot="formtitle">
        <!-- Пустой заголовок -->
        {''}
      </svelte:fragment>
    </PostForm>
  {/if}
</div> 