<script lang="ts">
  import Comment from '$lib/components/lemmy/comment/Comment.svelte'
  import { userSettings } from '$lib/settings.js'
  import { t } from '$lib/translations'
  import type { CommentView } from 'lemmy-js-client'
  import { Button, Material } from 'mono-svelte'
  import { ArrowUturnUp, Icon } from 'svelte-hero-icons'

  export let comment: CommentView
  export let view = $userSettings.view
  export const community = false
  export let meta: boolean = true
  export let onMarkAsRead: (() => void) | undefined = undefined

  $: post = comment.post || {
    nsfw: false,
    removed: false,
    deleted: false,
    featured_community: false,
    featured_local: false,
    locked: false,
    name: 'Deleted Post',
    id: 0
  }

  $: commentPath = comment.comment?.path || ''
  $: commentId = comment.comment?.id || 0
</script>

<Material
  class="flex flex-col flex-1 w-full {view != 'card'
    ? '!bg-transparent !border-0 rounded-none'
    : 'p-5'} {view == 'list'
    ? 'py-3'
    : view == 'compact'
      ? 'py-4'
      : 'py-3'} {$$props.class}"
  color="distinct"
  padding="none"
>
  <div class="list-none w-full">
    <Comment
      postId={post.id}
      postTitle={post.name}
      node={{ children: [], comment_view: comment, depth: 1, ui: { open: true } }}
      replying={false}
      {meta}
      showPostInfo={true}
      {onMarkAsRead}
      {...$$restProps}
    />
  </div>
  <!--
  <div class="flex justify-end mt-2">
    <Button
      color="primary"
      href="/post/{post.id}?thread={commentPath}#{commentId}"
      class="self-start"
    >
      {$t('common.jump')}
      <Icon src={ArrowUturnUp} size="16" micro />
    </Button>
  </div>
  -->
</Material>
