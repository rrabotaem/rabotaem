<script lang="ts">
  import { onMount } from 'svelte';
  import { getTopCommunities } from '$lib/api/communities';
  import { t } from '$lib/translations';
  import CommunityIcon from '$lib/components/ui/CommunityIcon.svelte';

  let topCommunities: Array<{
    name: string;
    icon: string | null;
    url: string;
    subscribers: number;
  }> = [];

  onMount(async () => {
    topCommunities = await getTopCommunities();
  });
</script>

<style>
  .sidebar-item {
    --height: 46px;
    --offset: 10px;
    display: flex;
    align-items: center;
    min-width: 0;
    height: var(--height);
    padding: 0 var(--offset);
    border-radius: 12px;
    cursor: pointer;
    letter-spacing: -0.3px;
  }

  .sidebar-item:hover {
    background-color: var(--theme-color-button-transparent-hover, rgba(255, 255, 255, 0.04));
  }

  .sidebar-item__text {
    margin-left: 12px;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: inherit;
  }
</style>
<div class="flex flex-col gap-2 bg-white dark:bg-zinc-900 rounded-xl py-4">
  <span class="text-base font-normal text-slate-900 dark:text-zinc-200 mb-2">Лучшее в этом месяце</span>
  <span class="px-2 py-1 text-sm font-normal">
    {$t('nav.popular_communities')}
  </span>
  
  {#each topCommunities as community}
    <a href={community.url} class="sidebar-item">
      <div class="w-7 h-7 flex-shrink-0">
        <CommunityIcon name={community.name} icon={community.icon} />
      </div>
      <div class="sidebar-item__text">
        {community.name}
      </div>
    </a>
  {/each}

  <a 
    href="/communities" 
    class="py-1 text-xs font-medium hover:underline px-2"
  >
    {$t('nav.show_all')}
  </a>
</div>
