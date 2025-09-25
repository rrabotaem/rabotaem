<script lang="ts">
  import { notifications, profile } from '$lib/auth'
  import { goto } from '$app/navigation'

  import {
    Badge,
    Button,
    Menu,
    MenuButton,
    MenuDivider,
    Modal,
    Select,
    Spinner,
    toast,
  } from 'mono-svelte'
  import Avatar from '../Avatar.svelte'
  import {
    Bars3,
    Bookmark,
    BugAnt,
    CodeBracketSquare,
    Cog6Tooth,
    ComputerDesktop,
    Heart,
    Icon,
    Inbox,
    InformationCircle,
    Moon,
    ServerStack,
    Sun,
    Swatch,
    UserCircle,
    UserGroup,
    ArrowLeftOnRectangle,
  } from 'svelte-hero-icons'
  import { colorScheme } from '$lib/ui/colors'
  import { userSettings } from '$lib/settings'
  import { site } from '$lib/lemmy'
  import SiteCard from '$lib/components/lemmy/SiteCard.svelte'
  import { t } from '$lib/translations'
  import UserLink from '$lib/components/lemmy/user/UserLink.svelte'

  let showInstance = false
</script>

{#if showInstance}
  <Modal bind:open={showInstance} title="Instance">
    {#if $site}
      <SiteCard
        site={$site.site_view}
        admins={$site.admins}
        taglines={$site.taglines}
        version={$site.version}
      />
    {:else}
      <Spinner />
    {/if}
  </Modal>
{/if}

<Menu {...$$restProps}>
  <button
    class="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-zinc-700
    transition-all bg-slate-50 dark:bg-zinc-900 relative
    hover:border-primary-900 hover:dark:border-primary-100 active:scale-95 {$$props.buttonClass}"
    title={$t('profile.profile')}
    slot="target"
  >
    {#if $profile?.user}
      <div
        class="w-full h-full aspect-square object-cover rounded-full grid place-items-center"
      >
        <Avatar
          url={$profile.user.local_user_view.person.avatar}
          width={36}
          alt={$profile.user.local_user_view.person.name}
        />
      </div>
      {#if $notifications.inbox > 0}
        <div
          class="rounded-full w-2 h-2 bg-red-500 absolute top-0 left-0 z-10"
        />
      {/if}
    {:else}
      <div class="w-full h-full grid place-items-center">
        <Icon src={Bars3} micro size="18" />
      </div>
    {/if}
  </button>
  {#if $profile?.user}
    <UserLink
      user={$profile?.user.local_user_view.person}
      showInstance={false}
      avatar
      avatarSize={24}
      displayName={true}
      class="font-medium px-3 py-2 pointer-events-none mb-1"
    />
  {/if}
  {#if $profile?.jwt}
    <MenuButton link href="/profile" class="py-2.5">
      <Icon src={UserCircle} micro width={16} slot="prefix" />
      {$t('profile.profile')}
    </MenuButton>
    <MenuButton link href="/inbox" class="py-2.5">
      <Icon src={Inbox} micro width={16} slot="prefix" />
      {$t('profile.inbox')}
      {#if $notifications.inbox > 0}
        <Badge color="red-subtle" class="text-xs ml-auto font-bold !py-0.5">
          {$notifications.inbox}
        </Badge>
      {/if}
    </MenuButton>
    <MenuButton link href="/saved" class="py-2.5">
      <Icon src={Bookmark} micro width={16} slot="prefix" />
      {$t('profile.saved')}
    </MenuButton>
    <MenuButton 
      on:click={async () => {
        $profile.jwt = undefined;
        goto('/', { invalidateAll: true });
      }}
      class="text-red-600 dark:text-red-400 py-2.5"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="1.5"
        stroke-linecap="round" 
        stroke-linejoin="round"
        slot="prefix" 
        class="text-red-600 dark:text-red-400"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {$t('account.logout')}
    </MenuButton>
  {/if}
</Menu>
