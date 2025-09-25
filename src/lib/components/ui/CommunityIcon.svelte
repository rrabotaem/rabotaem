<script lang="ts">
  import { optimizeImageURL } from '$lib/components/lemmy/post/helpers'
  import Avatar from './Avatar.svelte'

  export let name: string;
  export let icon: string | null = null;
  export let width: number = 28;
  
  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
</script>

{#if icon}
  <Avatar
    url={optimizeImageURL(icon, width * 2)}
    {width}
    alt={name}
    circle={true}
  />
{:else}
  <div class="w-full h-full rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-zinc-200">
    {getInitials(name)}
  </div>
{/if} 