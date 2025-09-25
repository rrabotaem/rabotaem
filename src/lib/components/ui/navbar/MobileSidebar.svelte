<script lang="ts">
  import type { IconSource } from 'svelte-hero-icons'
  import {
    ArrowLeftOnRectangle,
    Bookmark,
    Identification,
    Inbox,
    UserCircle,
    UserGroup,
    GlobeAlt,
    Home,
    Fire,
    Clock,
    Trophy,
    Newspaper,
    Briefcase,
    Megaphone,
    DocumentText,
    InformationCircle,
    ChevronDown,
    PencilSquare,
    ClipboardDocumentList,
  } from 'svelte-hero-icons'
  import { notifications, profile, profileData } from '$lib/auth.js'
  import { userSettings } from '$lib/settings.js'
  import SidebarButton from '$lib/components/ui/sidebar/SidebarButton.svelte'
  import CommunityList from '$lib/components/ui/sidebar/CommunityList.svelte'
  import ProfileButton from '$lib/components/ui/sidebar/ProfileButton.svelte'
  import { flip } from 'svelte/animate'
  import { expoOut } from 'svelte/easing'
  import { Badge } from 'mono-svelte'
  import Expandable from '$lib/components/ui/Expandable.svelte'
  import EndPlaceholder from '../EndPlaceholder.svelte'
  import { t } from '$lib/translations'
  import { iconOfLink } from './link'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import { getTopCommunities, getFederatedCommunities } from '$lib/api/communities'
  import CommunityIcon from '$lib/components/ui/CommunityIcon.svelte'
  import { Icon } from 'svelte-hero-icons'
  import LoginModal from '$lib/components/auth/LoginModal.svelte'
  import { env } from '$env/dynamic/public'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  const PUBLIC_PROJECT_ABOUT = env.PUBLIC_PROJECT_ABOUT;
  const PUBLIC_PROJECT_ADVRTISEMENT = env.PUBLIC_PROJECT_ADVRTISEMENT;
  const PUBLIC_PROJECT_AUTHORS = env.PUBLIC_PROJECT_AUTHORS;
  const PUBLIC_PROJECT_RULES = env.PUBLIC_PROJECT_RULES;

  let topCommunities: Array<{
    name: string;
    icon: string | null;
    url: string;
    subscribers: number;
  }> = [];
  
  let displayedCommunitiesCount = 20;
  let hasMoreCommunities = false;
  let allLocalCommunities: Array<{
    name: string;
    icon: string | null;
    url: string;
    subscribers: number;
  }> = [];
  
  let federatedCommunities: Array<{
    name: string;
    icon: string | null;
    url: string;
    subscribers: number;
  }> = [];
  
  let showFederated = false;
  let loginModalOpen = false;

  function handleAuthRequired(e: MouseEvent) {
    if (!$profile?.jwt) {
      e.preventDefault();
      loginModalOpen = true;
    }
  }

  function handleNavigation() {
    dispatch('close');
  }
  
  function loadMoreCommunities() {
    if (!showFederated) {
      if (displayedCommunitiesCount < allLocalCommunities.length) {
        topCommunities = allLocalCommunities;
        displayedCommunitiesCount = allLocalCommunities.length;
        hasMoreCommunities = true;
      } else {
        showFederated = true;
        loadFederatedCommunities();
      }
    } else {
      const currentFederatedCount = displayedCommunitiesCount - allLocalCommunities.length;
      const newFederatedCount = currentFederatedCount + 10;
      
      const federatedToShow = federatedCommunities.slice(0, newFederatedCount);
      topCommunities = [...allLocalCommunities, ...federatedToShow];
      displayedCommunitiesCount = allLocalCommunities.length + newFederatedCount;
      
      hasMoreCommunities = newFederatedCount < federatedCommunities.length;
    }
  }
  
  async function loadFederatedCommunities() {
    federatedCommunities = await getFederatedCommunities();
    
    const federatedToShow = federatedCommunities.slice(0, 10);
    topCommunities = [...allLocalCommunities, ...federatedToShow];
    displayedCommunitiesCount = allLocalCommunities.length + 10;
    hasMoreCommunities = 10 < federatedCommunities.length;
  }

  onMount(async () => {
    allLocalCommunities = await getTopCommunities();
    topCommunities = allLocalCommunities.slice(0, displayedCommunitiesCount);
    hasMoreCommunities = allLocalCommunities.length > displayedCommunitiesCount || allLocalCommunities.length > 0;
  });

  $: searchParams = new URLSearchParams($page.url.search);
  $: isPostFormRoute = $page.url.pathname.includes('/create/post') || 
                       $page.url.pathname.includes('/edit/post')
</script>

<div style="background: #ffe; color: #b00; font-weight: bold; padding: 8px; text-align: center;">SIDEBAR TEST</div>

<nav class="flex flex-col p-4 overflow-auto gap-2 h-auto min-h-0">
  {#if $userSettings.dock.pins?.length ?? 0 > 0}
    <div class="flex items-center flex-wrap gap-2 pl-1.5">
      {#each $userSettings.dock.pins as pin}
        <SidebarButton
          icon={iconOfLink(pin.url)}
          on:click={() => {
            goto(pin.url);
            handleNavigation();
          }}
          alignment="center"
          selected={`${$page.url.pathname}${$page.url.search}` == pin.url}
          on:contextmenu={(e) => {
            e.preventDefault()
            $userSettings.dock.pins = $userSettings.dock.pins.toSpliced(
              $userSettings.dock.pins.findLastIndex((p) => pin.url == p.url),
              1
            )
            return false
          }}
          size="square-md"
        ></SidebarButton>
      {/each}
    </div>
    <hr class="border-slate-200 dark:border-zinc-900 my-1" />
  {/if}

  {#if $profile?.jwt}
    <div class="flex flex-col gap-1">
      <SidebarButton 
        icon={Home} 
        href="/?type=Subscribed"
        on:click={(e) => {
          handleAuthRequired(e);
          if ($profile?.jwt) handleNavigation();
        }}
      >
        <span slot="label">{$t('nav.feed')}</span>
      </SidebarButton>
      <SidebarButton 
        icon={Trophy}
        href="/?sort=TopAll&type=All"
        active={$page.url.pathname === '/' && $page.url.searchParams.get('sort') === 'TopAll'}
        on:click={handleNavigation}
      >
        <span slot="label">{$t('nav.best')}</span>
      </SidebarButton>
      <SidebarButton 
        icon={Fire} 
        href="/?sort=Hot"
        on:click={handleNavigation}
      >
        <span slot="label">{$t('filter.sort.hot')}</span>
      </SidebarButton>
      <SidebarButton 
        icon={Clock} 
        href="/?sort=New"
        on:click={handleNavigation}
      >
        <span slot="label">{$t('filter.sort.new')}</span>
      </SidebarButton>
      <SidebarButton 
        icon={Inbox} 
        href="/inbox"
        on:click={(e) => {
          handleAuthRequired(e);
          if ($profile?.jwt) handleNavigation();
        }}
      >
        <span slot="label" class="flex items-center gap-2">
          {$t('profile.inbox')}
          {#if $notifications.inbox}
            <Badge
              class="w-5 h-5 !p-0 grid place-items-center ml-auto"
              color="red-subtle"
            >
              {$notifications.inbox}
            </Badge>
          {/if}
        </span>
      </SidebarButton>
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    {#if $profile?.jwt}
      <span 
        class="px-2 py-1 text-sm font-normal text-slate-500 dark:text-zinc-200"
      >
        {$t('nav.popular_communities')}
      </span>
    {/if}
    
    {#each topCommunities as community}
      <SidebarButton 
        href={community.url}
        on:click={handleNavigation}
      >
        <div slot="icon" class="w-7 h-7">
          <CommunityIcon name={community.name} icon={community.icon} />
        </div>
        <span slot="label">
          {community.name}
        </span>
      </SidebarButton>
    {/each}
    
    {#if hasMoreCommunities}
      <SidebarButton 
        on:click={loadMoreCommunities} 
        icon={ChevronDown}
        href="javascript:void(0)"
      >
        <span slot="label">Показать все</span>
      </SidebarButton>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    <span
      class="px-2 py-1 text-sm font-normal text-slate-500 dark:text-zinc-200"
    >
      Ресурсы
    </span>
    {#if env.PUBLIC_TELEGRAM_URL || env.PUBLIC_GITHUB_URL}
      <div class="flex items-center pl-2 gap-2">
        {#if env.PUBLIC_TELEGRAM_URL}
          <a href={env.PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" class="telegram-btn group">
            <img src="/img/logos/telegram_logo.svg" alt="Telegram" class="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] transition-transform group-hover:scale-110 group-hover:drop-shadow-lg" />
          </a>
        {/if}
        {#if env.PUBLIC_GITHUB_URL}
          <a href={env.PUBLIC_GITHUB_URL} target="_blank" rel="noopener noreferrer" class="github-btn group">
            <img src="/img/logos/github-mark.svg" alt="GitHub" class="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] opacity-80 transition-transform group-hover:scale-110 group-hover:drop-shadow-lg dark:invert" />
          </a>
        {/if}
      </div>
    {/if}
    <div class="flex flex-col gap-1">
      <SidebarButton 
        href={PUBLIC_PROJECT_ABOUT} 
        icon={InformationCircle}
        on:click={handleNavigation}
      >
        <span slot="label">О Проекте</span>
      </SidebarButton>
      <SidebarButton 
        href={PUBLIC_PROJECT_ADVRTISEMENT} 
        icon={Megaphone}
        on:click={handleNavigation}
      >
        <span slot="label">Реклама</span>
      </SidebarButton>
      <SidebarButton 
        href={PUBLIC_PROJECT_AUTHORS} 
        icon={PencilSquare}
        on:click={handleNavigation}
      >
        <span slot="label">Авторам</span>
      </SidebarButton>
      <SidebarButton 
        href={PUBLIC_PROJECT_RULES} 
        icon={ClipboardDocumentList}
        on:click={handleNavigation}
      >
        <span slot="label">Правила</span>
      </SidebarButton>
    </div>
  </div>

  <LoginModal bind:open={loginModalOpen} />
</nav>

<style>
  :global(.sidebar-title) {
    font-size: 16px !important;
    font-weight: 400 !important;
  }
  .telegram-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: background 0.2s;
    padding: 2px;
  }

  .github-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: background 0.2s;
    padding: 2px;
  }
</style> 