<script lang="ts">
  import StickyCard from '$lib/components/ui/StickyCard.svelte'

  // Проверяем, есть ли какой-либо контент для отображения
  export let site: any
  export let taglines: any[] = []
  export let admins: any[] = []
  export let version: string = ''

  $: hasContent = site && (
    Object.keys(site).length > 0 || 
    taglines.length > 0 || 
    admins.length > 0 || 
    version
  )
</script>

{#if hasContent}
  <StickyCard class="w-full {$$props.class} text-slate-600 dark:text-zinc-400">
    <slot />
  </StickyCard>
{/if}
