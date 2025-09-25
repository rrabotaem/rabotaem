<script lang="ts">
  import type { CommentResponse } from 'lemmy-js-client'
  import { getClient } from '$lib/lemmy.js'
  import { createEventDispatcher } from 'svelte'
  import { profile } from '$lib/auth.js'
  import { toast } from 'mono-svelte'
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte'
  import { placeholders } from '$lib/util.js'
  import { Button } from 'mono-svelte'
  import { t } from '$lib/translations'
  import { errorMessage } from '$lib/lemmy/error'
  import { Icon, XMark } from 'svelte-hero-icons'
  import LoginModal from '$lib/components/auth/LoginModal.svelte'

  export let postId: number
  export let parentId: number | undefined = undefined
  export let locked: boolean = false
  export let banned: boolean = false
  export let rows: number = 7
  export let placeholder: string | undefined = undefined
  export let postTitle: string | undefined = undefined
  export let value = ''
  export let actions = true
  export let autoFocus: boolean = false
  export let id: string | undefined = undefined

  const dispatch = createEventDispatcher<{
    comment: CommentResponse
    submit: void
    cancel: boolean
  }>()

  let loading = false
  let showLoginModal = false

  async function submit() {
    dispatch('submit')
    if (!$profile?.jwt) {
      showLoginModal = true
      return
    }
    
    if (loading || !value.trim()) {
      if (!value.trim()) {
        toast({
          content: $t('error.emptyComment'),
          type: 'error',
        })
      }
      return
    }
    
    loading = true
    try {
      const response = await getClient().createComment({
        content: value,
        post_id: postId,
        parent_id: parentId,
      })
      dispatch('comment', response)
      value = ''
      
      setTimeout(() => {
        const commentElement = document.getElementById(response.comment_view.comment.id.toString())
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      
    } catch (err) {
      console.error(err)
      toast({
        content: errorMessage(err as any),
        type: 'error',
      })
    }
    loading = false
  }
</script>

<LoginModal bind:open={showLoginModal} />

<div class="flex flex-col gap-2 relative" {id}>
  {#if postTitle}
    <div class="mb-2">
      <a href="/post/{postId}" class="text-lg font-medium hover:underline text-gray-700 dark:text-gray-300">
        {postTitle}
      </a>
    </div>
  {/if}

  <MarkdownEditor
    {...$$restProps}
    {rows}
    {autoFocus}
    placeholder={locked ? $t('comment.locked') : banned ? $t('comment.banned') : (placeholder ?? placeholders.get('comment'))}
    bind:value
    disabled={locked || loading || banned}
    on:focus
    previewButton={false}
    tools={true}
  >
    <div slot="actions" class="p-2 flex flex-row items-center w-full bg-white dark:bg-zinc-950 gap-1">
      <div class="flex-1"></div>
      {#if actions}
        <Button
          on:click={submit}
          color="primary"
          {loading}
          disabled={locked || loading || banned || !value.trim()}
          class="px-4 py-2"
          rounding="xl"
        >
          {$t('form.submit')}
        </Button>
      {/if}
    </div>
  </MarkdownEditor>
</div>
