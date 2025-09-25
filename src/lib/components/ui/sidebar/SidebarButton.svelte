<script lang="ts">
  import { page } from '$app/stores'
  import { Icon, type IconSource } from 'svelte-hero-icons'
  import type { SvelteComponentTyped } from "svelte";

  export let href: string | undefined = undefined
  export let selected = false
  export let active = false
  export let isExpandable = false
  export let icon: IconSource | typeof SvelteComponentTyped | null = null
  
  $: {
    if (href != undefined) {
      const fullUrl = href.includes('?') ? href : href + $page.url.search
      selected = `${$page.url.pathname}${$page.url.search}` === fullUrl
    }
  }
</script>

<a
  class:active={active}
  class="flex items-center px-2 h-10 text-base font-normal rounded-lg group hover:bg-white dark:hover:bg-zinc-900 {isExpandable ? 'pl-4' : ''} {$$props.class} {selected ? 'rounded-2xl' : ''}"
  href={href}
  class:bg-white={selected}
  class:dark:bg-zinc-800={selected}
  on:click
  on:contextmenu
  {...$$restProps}
>
  <div class="flex items-center justify-center sidebar-item__icon">
    {#if icon}
      <Icon 
        src={icon} 
        size="24"
        class="group-hover:text-black dark:group-hover:text-white {selected || active ? '!text-blue-500 dark:!text-blue-400' : ''}"
        style="width:24px;height:24px;min-width:24px;min-height:24px;max-width:24px;max-height:24px;"
      />
    {:else}
      <slot name="icon" {selected} />
    {/if}
  </div>
  
  <div class="sidebar-item__text {active ? 'text-black dark:text-white' : ''}">
    <slot>
      <div class="flex items-center w-full">
        <slot name="label" />
      </div>
    </slot>
  </div>
</a>

<style>
  .sidebar-item {
    --height: 40px;
    --offset: 10px;
    display: flex;
    align-items: center;
    min-width: 0;
    height: var(--height);
    padding: 0 var(--offset);
    border-radius: 12px;
    cursor: pointer;
  }

  .sidebar-item:hover {
    background-color: var(--theme-color-button-transparent-hover, rgba(0,0,0,.04));
  }


  .sidebar-item__text {
    margin-left: 12px;
    font-size: 16px;
    font-weight: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    min-height: 24px;
  }

  .sidebar-item__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .active {
    background-color: white;
    color: rgb(71 85 105);
  }
  
  :global(.dark) .active {
    background-color: rgb(39 39 42);
    color: rgb(212 212 216);
  }
  
  .active :global(svg) {
    color: rgb(0 0 0); /* black */
  }
  
  :global(.dark) .active :global(svg) {
    color: rgb(255 255 255); /* white */
  }
</style>