<script lang="ts">
  import { backOut, expoOut } from 'svelte/easing'
  import { slide } from 'svelte/transition'

  export let open: boolean = false
</script>

<div {...$$restProps} class="w-full {$$props.class || ''}">
  <button on:click={() => (open = !open)} class="w-full">
    <slot name="summary" {open} />
  </button>
  <slot name="extended" />
  {#if open}
    <div transition:slide={{ axis: 'y', easing: expoOut, duration: 300 }} class="w-full">
      <slot {open} />
    </div>
  {/if}
</div>
