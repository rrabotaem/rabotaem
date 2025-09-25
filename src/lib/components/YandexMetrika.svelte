<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { onMount } from 'svelte';
  
  const PUBLIC_YM_MEASUREMENT_ID = env.PUBLIC_YM_MEASUREMENT_ID;
  console.log('YM_MEASUREMENT_ID:', PUBLIC_YM_MEASUREMENT_ID);

  onMount(() => {
  
    type MetrikaWindow = Window & {
      [key: string]: any;
    };

    (function(
      m: MetrikaWindow,
      e: Document,
      t: string,
      r: string,
      i: string,
      k?: HTMLScriptElement,
      a?: HTMLScriptElement
    ) {
      m[i] = m[i] || function(...args: any[]) {
        (m[i].a = m[i].a || []).push(args);
      };
      m[i].l = Number(new Date());
      
      for (let j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) { return; }
      }
      
      k = e.createElement(t) as HTMLScriptElement;
      a = e.getElementsByTagName(t)[0] as HTMLScriptElement;
      
      if (k && a && a.parentNode) {
        k.async = true;
        k.src = r;
        a.parentNode.insertBefore(k, a);
      }
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(Number(PUBLIC_YM_MEASUREMENT_ID), "init", {
      webvisor:true,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true
    });
  });
</script>

<noscript>
  <div>
    <img src={`https://mc.yandex.ru/watch/${PUBLIC_YM_MEASUREMENT_ID}`} style="position:absolute; left:-9999px;" alt="" />
  </div>
</noscript> 