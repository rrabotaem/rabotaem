<script lang="ts">
  import { profile } from '$lib/auth'
  import EntityHeader from '$lib/components/ui/EntityHeader.svelte'
  import { t } from '$lib/translations'
  import { fullCommunityName } from '$lib/util'
  import type {
    Community,
    CommunityAggregates,
    CommunityModeratorView,
    SubscribedType,
  } from 'lemmy-js-client'
  import { Button, toast, Menu, MenuButton, modal, action } from 'mono-svelte'
  import {
    Check,
    Cog6Tooth,
    Icon,
    EllipsisHorizontal,
    Plus,
    Newspaper,
    BuildingOffice2,
    Fire,
    NoSymbol,
  } from 'svelte-hero-icons'
  import Subscribe from '../../../../routes/communities/Subscribe.svelte'
  import Expandable from '$lib/components/ui/Expandable.svelte'
  import ShieldIcon from '../moderation/ShieldIcon.svelte'
  import ItemList from '../generic/ItemList.svelte'
  import { userLink } from '$lib/lemmy/generic'
  import { formatRelativeDate } from '$lib/components/util/RelativeDate.svelte'
  import { publishedToDate } from '$lib/components/util/date'
  import { isAdmin } from '../moderation/moderation'
  import { block, blockInstance, purgeCommunity } from './CommunityCard.svelte'

  export let community: Community
  export let subscribed: SubscribedType
  export let counts: CommunityAggregates | undefined = undefined
  export let moderators: CommunityModeratorView[] = []
  export let blocked: boolean = false

  // Создаем базовый объект для counts с обязательным полем subscribers_local
  const defaultCounts: CommunityAggregates = {
    community_id: community.id,
    subscribers: 0,
    subscribers_local: 0,
    posts: 0,
    comments: 0,
    published: "",
    users_active_day: 0,
    users_active_week: 0,
    users_active_month: 0,
    users_active_half_year: 0,
  }
</script>

{#if community?.name && community?.actor_id}
  <div class="w-full max-w-[640px] mx-auto">
    <EntityHeader
      banner={community.banner}
      avatar={community.icon}
      name={community.title}
      url="/c/{fullCommunityName(community.name, community.actor_id)}"
      stats={[]}
      bio={community.description}
      class="mb-4 {$$props.class}"
    >
      <div class="flex items-center gap-2 w-full">
        {#if $profile?.jwt}
          <Subscribe
            community={{
              community: community,
              banned_from_community: false,
              blocked: false,
              counts: counts || defaultCounts,
              subscribed: subscribed,
            }}
            let:subscribe
            let:subscribing
          >
            <Button
              disabled={subscribing}
              loading={subscribing}
              size="lg"
              color={subscribed == 'NotSubscribed' ? 'primary' : 'secondary'}
              on:click={async () => {
                subscribed =
                  (await subscribe())?.community_view.subscribed ?? 'NotSubscribed'
              }}
              class="flex-1 relative z-[inherit]"
            >
              <Icon
                src={subscribed != 'NotSubscribed' ? Check : Plus}
                micro
                size="16"
                slot="prefix"
              />
              {subscribed == 'Subscribed' || subscribed == 'Pending'
                ? $t('cards.community.subscribed')
                : $t('cards.community.subscribe')}
            </Button>
          </Subscribe>
        {/if}

        {#if $profile?.user && $profile.user.moderates
            .map((c) => c.community.id)
            .includes(community.id)}
          <Button
            size="square-lg"
            color="secondary"
            rounding="xl"
            href="/c/{fullCommunityName(
              community.name,
              community.actor_id
            )}/settings"
            style="height: 38px; width: 38px;"
          >
            <Icon src={Cog6Tooth} size="16" mini />
          </Button>
        {/if}
      </div>
    </EntityHeader>
  </div>
{:else}
  <div class="bg-red-100 dark:bg-red-900 p-4 rounded-lg max-w-[640px] mx-auto">
    <p class="text-red-700 dark:text-red-100">
      {$t('error.missingCommunityData')}
    </p>
  </div>
{/if}
