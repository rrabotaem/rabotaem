<script lang="ts">
  import UserPage from '../../u/[name]/+page.svelte'
  import EntityHeader from '$lib/components/ui/EntityHeader.svelte'
  import Expandable from '$lib/components/ui/Expandable.svelte'
  import ItemList from '$lib/components/lemmy/generic/ItemList.svelte'
  import ShieldIcon from '$lib/components/lemmy/moderation/ShieldIcon.svelte'
  import UserLink from '$lib/components/lemmy/user/UserLink.svelte'
  import { communityLink } from '$lib/lemmy/generic.js'
  import { publishedToDate } from '$lib/components/util/date.js'
  import { formatRelativeDate } from '$lib/components/util/RelativeDate.svelte'
  import { t } from '$lib/translations'
  import { userSettings } from '$lib/settings.js'

  export let data

  $: my_user = data.my_user?.local_user_view
</script>

<div class="flex flex-col gap-4">
  {#if my_user}
    <!-- EntityHeader из обзора -->
    <EntityHeader
      avatar={my_user.person.avatar}
      name={my_user.person.display_name || my_user.person.name}
      banner={my_user.person.banner}
      bio={my_user.person.bio}
      stats={[
        {
          name: $t('content.posts'),
          value: my_user.counts.post_count.toString(),
        },
        {
          name: $t('content.comments'),
          value: my_user.counts.comment_count.toString(),
        },
        {
          name: $t('stats.joined'),
          value: formatRelativeDate(publishedToDate(my_user.person.published), {
            style: 'short',
          }).toString(),
          format: false,
        },
      ]}
      class="max-w-[640px] mx-auto w-full"
    >
      <span class="text-sm flex gap-0 items-center w-max" slot="nameDetail">
        @
        <UserLink
          showInstance
          user={my_user.person}
          displayName={false}
          class="font-normal"
        />
      </span>
      {#if (data.moderates ?? []).length > 0}
        <Expandable
          class="border rounded-xl bg-white/50 dark:bg-zinc-900/50 w-full p-3 px-4
        dark:border-zinc-800 border-slate-300 border-opacity-50 text-slate-700 dark:text-zinc-200 transition-colors"
        >
          <span slot="title" class="flex items-center gap-1">
            <ShieldIcon width={14} filled />
            {$t('routes.profile.moderates')}
          </span>
          <ItemList
            items={data.moderates?.map((m) => ({
              id: m.community.id,
              name: m.community.title,
              url: communityLink(m.community),
              avatar: m.community.icon,
              instance: new URL(m.community.actor_id).hostname,
            })) ?? []}
          />
        </Expandable>
      {/if}
    </EntityHeader>

    {#if $userSettings.debugInfo}
      <pre class="max-w-[640px] mx-auto w-full">
        {JSON.stringify(my_user, undefined, 4)}
      </pre>
    {/if}
  {/if}

  {#if data.user && data.sort && data.type && data.page}
    <UserPage
      inline
      data={{
        items: data.user.submissions,
        page: data.page,
        person_view: data.user.person_view,
        moderates: data.user.moderates,
        sort: data.sort,
        type: data.type,
      }}
    />
  {:else if !my_user}
    User data is missing.
    <pre>
      {JSON.stringify(data)}
    </pre>
  {/if}
</div>
