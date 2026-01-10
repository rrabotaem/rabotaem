<script lang="ts">
  import {
    Bookmark,
    Icon,
    Microphone,
    Pencil,
    Trash,
  } from 'svelte-hero-icons'
  import type { CommentNodeI } from './comments'
  import RelativeDate from '$lib/components/util/RelativeDate.svelte'
  import CommentForm from './CommentForm.svelte'
  import Markdown from '$lib/components/markdown/Markdown.svelte'
  import CommentActions from '$lib/components/lemmy/comment/CommentActions.svelte'
  import { getClient } from '$lib/lemmy.js'
  import { toast } from 'mono-svelte'
  import { profile } from '$lib/auth.js'
  import { Button, Modal } from 'mono-svelte'
  import { publishedToDate } from '$lib/components/util/date.js'
  import ShieldIcon from '../moderation/ShieldIcon.svelte'
  import Avatar from '$lib/components/ui/Avatar.svelte'
  import UserLink from '$lib/components/lemmy/user/UserLink.svelte'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import { t } from '$lib/translations'
  import { postLink } from '$lib/components/lemmy/post/helpers'

  export let node: CommentNodeI
  export let postId: number
  export let op: boolean = false

  export let actions: boolean = true
  export let meta: boolean = true
  export let showPostInfo: boolean = false

  export let open: boolean = true

  export let replying = false
  export let autoReply: boolean = false
  export let onMarkAsRead: (() => void) | undefined = undefined

  let editing = false
  let newComment = node.comment_view.comment.content

  let editingLoad = false

  const truncateTitle = (title: string, maxLength: number = 40): string => {
    if (title.length <= maxLength) return title
    return title.slice(0, maxLength) + '...'
  }

  $: post = node.comment_view.post || {
    nsfw: false,
    removed: false,
    deleted: false,
    featured_community: false,
    featured_local: false,
    locked: false,
    name: 'Deleted Post',
    id: 0
  }

  $: postUrl = post.id > 0 ? postLink({ id: post.id, name: post.name }) : '#'
  $: postTitleDesktop = truncateTitle(post.name, 40)
  $: postTitleMobile = truncateTitle(post.name, 60)

  async function save() {
    if (!$profile?.jwt || newComment.length <= 0) return

    editingLoad = true

    try {
      await getClient().editComment({
        comment_id: node.comment_view.comment.id,
        content: newComment,
      })

      node.comment_view.comment.content = newComment

      editing = false
    } catch (err) {
      toast({
        // @ts-ignore i hate this
        content: err,
        type: 'error',
      })
    }

    editingLoad = false
  }

  onMount(() => {
    if ('#' + node.comment_view.comment.id.toString() == $page.url.hash) {
      highlight = 'text-primary-900 dark:text-primary-100 font-medium'

      setTimeout(() => (highlight = 'duration-[3s] transition-all'), 500)
      setTimeout(() => (highlight = ''), 600)
    }

    // Автоматически открываем форму ответа, если autoReply = true
    if (autoReply) {
      setTimeout(() => {
        replying = true
        // Дополнительная задержка для фокуса на textarea
        setTimeout(() => {
          const textarea = document.querySelector(`#comment-${node.comment_view.comment.id} textarea`)
          if (textarea) {
            (textarea as HTMLTextAreaElement).focus()
          }
        }, 100)
      }, 200) // Небольшая задержка для корректного рендеринга
    }
  })

  let highlight = ''
</script>

{#if editing}
  <Modal bind:open={editing}>
    <span slot="title">{$t('form.edit')}</span>
    <form on:submit|preventDefault={save} class="contents">
      <CommentForm
        postId={node.comment_view.comment.id}
        bind:value={newComment}
        actions={false}
        preview={true}
        on:confirm={save}
      />
      <Button
        submit
        color="primary"
        size="lg"
        loading={editingLoad}
        disabled={editingLoad}
        class="w-full"
      >
        {$t('common.save')}
      </Button>
    </form>
  </Modal>
{/if}

<li
  class="relative {showPostInfo
    ? 'p-5 bg-white dark:bg-zinc-900 rounded-xl'
    : 'py-3'} {node.comment_view.comment.distinguished
    ? ' text-primary-900 dark:text-primary-100'
    : ''} {highlight} {$$props.class}"
  id={node.comment_view.comment.id.toString()}
>
  {#if meta}
    {#if showPostInfo}
      <!-- Расширенный формат для профиля пользователя -->
      <div class="flex flex-row items-start gap-2 w-full" style="--avatar-size: 40px;">
        <slot name="meta-suffix" />
        <a
          href="/u/{node.comment_view.creator.name}"
          data-sveltekit-preload-data="tap"
          class="flex-shrink-0"
        >
          <Avatar
            url={node.comment_view.creator.avatar}
            alt={node.comment_view.creator.display_name || node.comment_view.creator.name}
            width={40}
          />
        </a>
        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex flex-row items-center gap-1.5 flex-wrap">
            <a
              href="/u/{node.comment_view.creator.name}"
              class="font-medium text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"
              data-sveltekit-preload-data="tap"
            >
              {node.comment_view.creator.display_name || node.comment_view.creator.name}
              {#if node.comment_view.creator_is_moderator}
                <ShieldIcon filled width={14} class="text-green-500" />
              {/if}
              {#if node.comment_view.creator_is_admin}
                <ShieldIcon filled width={14} class="text-red-500" />
              {/if}
              {#if op}
                <Icon mini size="16" src={Microphone} class="text-sky-600" />
              {/if}
            </a>
            <span class="text-slate-600 dark:text-zinc-400 text-[13px]">в посте</span>
            <span class="text-slate-600 dark:text-zinc-400 flex flex-row gap-2 ml-auto">
              {#if node.comment_view.comment.updated}
                <Icon src={Pencil} solid size="12" title="Edited" />
              {/if}
              {#if node.comment_view.comment.deleted || node.comment_view.comment.removed}
                <Icon
                  src={Trash}
                  solid
                  size="12"
                  title={$t('post.badges.deleted')}
                  class="text-red-600 dark:text-red-500"
                />
              {/if}
              {#if node.comment_view.saved}
                <Icon
                  src={Bookmark}
                  solid
                  size="12"
                  title={$t('post.badges.saved')}
                  class="text-yellow-600 dark:text-yellow-500"
                />
              {/if}
            </span>
          </div>
          <div class="flex flex-row items-center gap-2 w-full flex-wrap">
            <a
              href={postUrl}
              class="font-medium text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"
              data-sveltekit-preload-data="tap"
              title={post.name}
            >
              <span class="max-sm:hidden">{postTitleDesktop}</span>
              <span class="hidden max-sm:inline">{postTitleMobile}</span>
            </a>
            <a
              href="{postUrl}#{node.comment_view.comment.id}"
              class="text-slate-600 dark:text-zinc-400 flex-shrink-0 max-sm:hidden"
              data-sveltekit-preload-data="tap"
            >
              <RelativeDate
                class="text-slate-600 dark:text-zinc-400"
                date={publishedToDate(node.comment_view.comment.published)}
              />
            </a>
          </div>
        </div>
      </div>
    {:else}
      <!-- Простой формат для постов - только имя пользователя и время -->
      <div class="flex flex-row items-center gap-2 flex-wrap text-[13px]">
        <slot name="meta-suffix" />
        <span class:font-bold={op} class="flex flex-row gap-1 items-center">
          <UserLink
            inComment
            avatarSize={40}
            avatar
            user={node.comment_view.creator}
          >
            <svelte:fragment slot="badges">
              {#if node.comment_view.creator_is_moderator}
                <ShieldIcon filled width={14} class="text-green-500" />
              {/if}
              {#if node.comment_view.creator_is_admin}
                <ShieldIcon filled width={14} class="text-red-500" />
              {/if}
            </svelte:fragment>
          </UserLink>
          {#if op}
            <Icon mini size="16" src={Microphone} class="text-sky-600" />
          {/if}
        </span>
        <RelativeDate
          class="text-slate-600 dark:text-zinc-400 max-sm:hidden"
          date={publishedToDate(node.comment_view.comment.published)}
        />
        <span class="text-slate-600 dark:text-zinc-400 flex flex-row gap-2 ml-auto">
          {#if node.comment_view.comment.updated}
            <Icon src={Pencil} solid size="12" title="Edited" />
          {/if}
          {#if node.comment_view.comment.deleted || node.comment_view.comment.removed}
            <Icon
              src={Trash}
              solid
              size="12"
              title={$t('post.badges.deleted')}
              class="text-red-600 dark:text-red-500"
            />
          {/if}
          {#if node.comment_view.saved}
            <Icon
              src={Bookmark}
              solid
              size="12"
              title={$t('post.badges.saved')}
              class="text-yellow-600 dark:text-yellow-500"
            />
          {/if}
        </span>
      </div>
    {/if}
  {/if}
  <div class="relative {$$props.contentClass}">
    <div
      class="flex flex-col whitespace-pre-wrap
      max-w-full gap-3 mt-3 relative"
    >
        {#if node.comment_view.comment.distinguished}
          <div
            class="-z-10 bg-slate-100 dark:bg-zinc-900 absolute -top-9 -bottom-1.5
          -inset-x-6 -right-6"
          />
        {/if}
        <div
          class="max-w-full mt-0.5 break-words text-[15px] text-slate-800 dark:text-zinc-100"
        >
          <Markdown source={node.comment_view.comment.content} />
        </div>
        {#if actions}
          <CommentActions
            bind:comment={node.comment_view}
            bind:replying
            on:edit={() => (editing = true)}
            disabled={node.comment_view.banned_from_community ||
              node.comment_view.post.locked}
            {onMarkAsRead}
          />
        {/if}
      </div>
      {#if replying}
        <div class="max-w-full my-2 border-l border-slate-200 dark:border-zinc-800 pl-4">
          <div>
            <CommentForm
              id={`comment-${node.comment_view.comment.id}`}
              label={$t('comment.reply')}
              {postId}
              parentId={node.comment_view.comment.id}
              on:comment={(e) => {
                node.children = [
                  {
                    children: [],
                    comment_view: e.detail.comment_view,
                    depth: node.depth + 1,
                    ui: {
                      open: true,
                    },
                  },
                  ...node.children,
                ]
                replying = false
              }}
              on:cancel={() => (replying = false)}
            />
          </div>
        </div>
      {/if}
      <div class="bg-transparent dark:bg-transparent">
        <slot />
      </div>
    </div>
</li>
