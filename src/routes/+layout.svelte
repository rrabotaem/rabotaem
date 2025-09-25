<script lang="ts">
  import Navbar from '$lib/components/ui/navbar/Navbar.svelte'
  import '../style/app.css'
  import { navigating, page } from '$app/stores'
  import nProgress from 'nprogress'
  import 'nprogress/nprogress.css'
  import Moderation from '$lib/components/lemmy/moderation/Moderation.svelte'
  import Sidebar from '$lib/components/ui/sidebar/Sidebar.svelte'
  import {
    colorScheme,
    inDarkColorScheme,
    rgbToHex,
    theme,
    themeVars,
  } from '$lib/ui/colors.js'
  import { userSettings } from '$lib/settings.js'
  import {
    Button,
    ModalContainer,
    Spinner,
    toast,
    ToastContainer,
  } from 'mono-svelte'
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { Forward, Icon } from 'svelte-hero-icons'
  import { routes } from '$lib/util.js'
  import Shell from '$lib/components/ui/layout/Shell.svelte'
  import SiteCard from '$lib/components/lemmy/SiteCard.svelte'
  import { site } from '$lib/lemmy.js'
  import ExpandableImage from '$lib/components/ui/ExpandableImage.svelte'
  import { LINKED_INSTANCE_URL } from '$lib/instance'
  import { locale } from '$lib/translations'
  import { getDefaultColors } from '$lib/ui/presets'
  import YandexMetrika from '$lib/components/YandexMetrika.svelte'
  import GoogleAnalytics from '$lib/components/GoogleAnalytics.svelte'
  import PopularPosts from '$lib/components/ui/sidebar/PopularPosts.svelte'

  nProgress.configure({
    minimum: 0.4,
    trickleSpeed: 200,
    easing: 'ease-out',
    speed: 300,
    showSpinner: false,
  })

  let barTimeout: any = 0

  $: {
    if (browser) {
      if ($navigating) {
        document.body.classList.toggle('wait', true)
        barTimeout = setTimeout(() => nProgress.start(), 100)
      }
      if (!$navigating) {
        document.body.classList.toggle('wait', false)
        clearTimeout(barTimeout)
        nProgress.done()
      }
    }
  }

  // Исправляем условие проверки маршрута
  $: isPostFormRoute = $page.url.pathname.includes('/create/post') || $page.url.pathname.includes('/edit/post')

  // Получаем текущий URL для канонической ссылки
  $: canonicalUrl = (() => {
    const baseUrl = 'https://rabotaem.app' // Всегда используем HTTPS версию
    
    // Для главной страницы всегда возвращаем URL без trailing слеша
    if ($page.url.pathname === '/' || $page.url.pathname === '') {
      return baseUrl
    }

    // Для всех остальных страниц используем полный путь
    const path = $page.url.pathname
    const cleanPath = path.replace(/\/+$/, '') // Убираем trailing слэши
    return `${baseUrl}${cleanPath}`
  })()

  onMount(() => {
    if (browser) {
      if (window.location.hash == 'main') {
        history.replaceState(
          null,
          '',
          window.location.toString().replace('#main', '')
        )
      }
      document.body.querySelector('.loader')?.classList.add('hidden')
      themeVars.subscribe((vars) => {
        document.body.setAttribute('style', vars)
      })
      userSettings.subscribe((settings) => {
        console.log('Current font settings:', settings.font);
        console.log('Adding font class:', settings.font === 'roboto' ? 'font-roboto' : 'font-sans');
      })
    }
  })
</script>

<GoogleAnalytics />
<YandexMetrika />

<svelte:head>

  {#if $site?.site_view}
    <title>{$site?.site_view.site.name}</title>
    <meta
      name="theme-color"
      content={rgbToHex(
        $colorScheme && inDarkColorScheme()
          ? $theme.colors.zinc?.[925] ?? getDefaultColors().zinc[925]
          : $theme.colors.slate?.[25] ?? getDefaultColors().slate[25]
      )}
    />
    
    <!-- {#if LINKED_INSTANCE_URL}
      <link rel="icon" href={$site?.site_view?.site.icon} />
      <meta name="description" content={$site?.site_view?.site.description} />
    {:else}
      <meta name="description" content="A sleek client for Lemmy" />
    {/if} -->

  {/if}
  <link rel="canonical" href={canonicalUrl} />
  
  <!-- Добавляем мета-тег noindex для страниц inbox -->
  {#if $page.url.pathname.startsWith('/inbox')}
    <meta name="robots" content="noindex, nofollow" />
  {/if}
  
  <!-- Добавляем специальные мета-теги для HTTP версии -->
  {#if !$page.url.protocol.includes('https')}
    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
  {/if}
  
  <!-- Добавляем alternate для языковых версий, если они есть -->
  <link rel="alternate" hreflang="ru" href={canonicalUrl} />
  <link rel="alternate" hreflang="x-default" href={canonicalUrl} />
</svelte:head>

<Button
  class="fixed -top-16 focus:top-0 left-0 m-4 z-[300] transition-all"
  href="#main"
>
  <Icon src={Forward} mini size="16" slot="prefix" />
  Skip Navigation
</Button>
<Shell
  dir={$locale == 'he' && $userSettings.useRtl ? 'rtl' : 'ltr'}
  class="min-h-screen "
  route={$page.route}
>
  <Moderation />
  <ToastContainer />
  <ExpandableImage />
  <ModalContainer />

  <Sidebar
    route={$page.route.id ?? ''}
    slot="sidebar"
    let:style={s}
    let:class={c}
    class="xl:pt-0 pt-20 {c}"
    style={s}
  />
  <main
    slot="main"
    let:style={s}
    let:class={c}
    class="p-4 sm:p-6 min-w-0 w-full flex flex-col h-full relative {c} xl:pt-0 pt-20"
    style={s}
    id="main"
  >
    <slot />
  </main>
  <Navbar slot="navbar" let:style={s} let:class={c} class={c} style={s} />
  
  <div 
    slot="suffix" 
    let:class={c} 
    let:style={s} 
    class="{c} {isPostFormRoute ? 'hidden' : ''}"
    style={s}
  >
    <!-- Контейнер с прокруткой для всего содержимого -->
    <div class="flex flex-col gap-4 h-[calc(100vh-4rem)] overflow-auto sticky top-16 p-4 hover:scrollbar scrollbar-hidden">
      <!-- CommunityCard или SiteCard -->
      {#if $page.route.id?.startsWith('/c/') || $page.route.id?.startsWith('/post/')}
        <div class="flex-shrink-0">
          {#if $page.data.slots?.sidebar?.component}
            <svelte:component
              this={$page.data.slots.sidebar.component}
              {...$page.data.slots.sidebar.props}
            />
          {/if}
        </div>
      {/if}
      
      <!-- PopularPosts -->
      <div class="flex-1 min-h-0">
        <PopularPosts />
      </div>
    </div>
  </div>
</Shell>

<style>
  /* Базовые стили для скрытия полосы прокрутки */
  .scrollbar-hidden::-webkit-scrollbar {
    width: 0.25rem;
    background: transparent;
  }
  
  .scrollbar-hidden::-webkit-scrollbar-thumb {
    background: transparent;
  }

  /* Показываем полосу прокрутки при наведении */
  .hover\:scrollbar:hover::-webkit-scrollbar-thumb {
    background: rgb(203 213 225 / 0.3); /* slate-200 с прозрачностью */
    border-radius: 0.25rem;
  }

  .dark .hover\:scrollbar:hover::-webkit-scrollbar-thumb {
    background: rgb(39 39 42 / 0.3); /* zinc-800 с прозрачностью */
  }

  .hover\:scrollbar:hover::-webkit-scrollbar-thumb:hover {
    background: rgb(203 213 225 / 0.5);
  }

  .dark .hover\:scrollbar:hover::-webkit-scrollbar-thumb:hover {
    background: rgb(39 39 42 / 0.5);
  }
</style>
