<script lang="ts">
  export let data
</script>

<svelte:head>
  <title>{data.community?.community_view?.community?.title || 'Сообщество'}</title>

  <meta
    name="og:title"
    content={data.community.community_view.community.title}
  />
  {#if data.community.community_view.community.description}
    <meta
      name="og:description"
      content={data.community.community_view.community.description}
    />
  {/if}
</svelte:head>

<div class="w-full max-w-5xl mx-auto">
  <slot />
</div>
