<script lang="ts">
  export let imageSrc: string = '/img/planerka.webp'
  export let imageAlt: string = 'Banner'
  export let linkHref: string =
    'https://planerka.app/?utm_source=rabotaem&utm_medium=banner&utm_campaign=sidebar_right'
</script>

<a
  href={linkHref}
  target="_blank"
  rel="noopener noreferrer"
  class="block w-full rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-900/5 dark:bg-zinc-900/40 hover:bg-slate-900/10 dark:hover:bg-zinc-900/60 transition-colors"
  aria-label={imageAlt}
>
  <img
    src={imageSrc}
    alt={imageAlt}
    class="w-full h-auto object-cover"
    loading="lazy"
  />
</a>


