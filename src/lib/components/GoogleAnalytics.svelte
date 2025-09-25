<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser, dev } from '$app/environment';
  import { env } from '$env/dynamic/public';
  
  // Идентификатор GA из переменных окружения
  
  
  // Флаг для отслеживания инициализации
  let initialized = false;
  const PUBLIC_GA_MEASUREMENT_ID = env.PUBLIC_GA_MEASUREMENT_ID;

  // Функция для инициализации GA
  function initGA() {
    if (initialized || dev) return;
    
    // Создаем и добавляем основной скрипт GA
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${PUBLIC_GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Инициализируем dataLayer и настраиваем GA
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: any[]) {
      window.dataLayer.push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', PUBLIC_GA_MEASUREMENT_ID, {
      send_page_view: false // Отключаем автоматическую отправку, будем отправлять вручную
    });
    
    initialized = true;
  }

  // Функция для отправки события просмотра страницы
  function sendPageView(path: string) {
    if (!initialized || dev) return;
    
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title
    });
  }

  onMount(() => {
    if (!browser) return;
    
    // Инициализируем GA
    initGA();
    
    // Отправляем первоначальный просмотр страницы
    sendPageView($page.url.pathname + $page.url.search);
  });

  // Отслеживаем изменения URL и отправляем события просмотра страницы
  $: if (browser && initialized && $page) {
    sendPageView($page.url.pathname + $page.url.search);
  }

  console.log('GA_MEASUREMENT_ID:', PUBLIC_GA_MEASUREMENT_ID);
</script> 