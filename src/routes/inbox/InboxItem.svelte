<script lang="ts">
  import { getClient } from '$lib/lemmy.js'
  import { notifications, profile } from '$lib/auth.js'
  import RelativeDate from '$lib/components/util/RelativeDate.svelte'
  import { publishedToDate } from '$lib/components/util/date.js'
  import type { InboxItem } from '$lib/lemmy/inbox.js'
  import PrivateMessage from '$lib/components/lemmy/inbox/PrivateMessage.svelte'
  import PrivateMessageModal from '$lib/components/lemmy/modal/PrivateMessageModal.svelte'
  import { t } from '$lib/translations'
  import Expandable from '$lib/components/ui/Expandable.svelte'
  import CommentItem from '$lib/components/lemmy/comment/CommentItem.svelte'
  import Avatar from '$lib/components/ui/Avatar.svelte'

  export let item: InboxItem

  let replying = false
  let reply = ''
  let loading = false

  async function markAsRead(isRead: boolean) {
    if (!$profile?.jwt) return

    loading = true

    switch (item.type) {
      case 'person_mention': {
        await getClient().markPersonMentionAsRead({
          person_mention_id: item.id,
          read: isRead,
        })
        break
      }
      case 'comment_reply': {
        await getClient().markCommentReplyAsRead({
          comment_reply_id: item.id,
          read: isRead,
        })
        break
      }
      case 'private_message': {
        await getClient().markPrivateMessageAsRead({
          private_message_id: item.id,
          read: isRead,
        })
      }
    }

    item.read = isRead
    if ($profile.user) $notifications.inbox += isRead ? -1 : 1

    loading = false
  }
</script>

{#if replying && item.type == 'private_message'}
  <PrivateMessageModal bind:open={replying} user={item.item.creator} />
{/if}

{#if item.type == 'comment_reply' || item.type == 'person_mention'}
  <CommentItem
    comment={item.item}
    community={false}
    meta={true}
    onMarkAsRead={() => !item.read && markAsRead(true)}
  />
{:else if item.type == 'private_message'}
  <Expandable open icon={false}>
    <div class="flex flex-row gap-2 items-center w-full" slot="title">
      <Avatar
        url={item.creator.avatar}
        circle={false}
        width={28}
        alt={item.creator.name}
      />
      <div class="flex flex-col">
        <div class="text-sm font-normal">
          {@html $t('routes.inbox.item.message', {
            // @ts-ignore
            user: `<span class="font-medium">${item.item.creator.display_name || item.item.creator.name}</span>`,
            recipient: `<span class="font-medium">${item.item.recipient.display_name || item.item.recipient.name}</span>`,
          })}
        </div>
        <div class="text-xs text-slate-600 dark:text-zinc-400">
          <RelativeDate date={publishedToDate(item.published)} />
        </div>
      </div>
      <div class="flex-1" />
      <div class="flex gap-2 max-md:hidden flex-shrink-0">
        
      </div>
    </div>
    <div slot="extended" class="flex gap-2 w-full md:hidden mt-1">

    </div>
    <svelte:fragment slot="content">
      <PrivateMessage message={item.item} meta={false} />
    </svelte:fragment>
  </Expandable>
{/if}
