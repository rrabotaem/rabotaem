<script lang="ts">
  import { userSettings } from '$lib/settings'
  import { contentPadding } from '../Shell.svelte'
  import { t } from '$lib/translations'

  export let pageHeader = false
</script>

<div
  class="
  {pageHeader
    ? `w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)]
  bg-slate-50 dark:bg-zinc-950 -m-4 sm:-m-6 mb-0 sm:mb-0 sm:p-6 p-4`
    : ''}
  
  "
  style="{pageHeader
    ? `margin-top: min(-4.5rem, calc(-1 * calc(${$contentPadding.top}px))); padding-top: max(4.5rem, calc(${$contentPadding.top}px));`
    : ''} {$$props.style};
"
>
  {#if $$slots.default}
    <div class="w-full {$$props.class || ''}">
      <slot />
    </div>
  {/if}

  {#if $$slots.extended}
    <div>
      <slot name="extended" />
    </div>
  {/if}
</div>
