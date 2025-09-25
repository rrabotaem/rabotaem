<script lang="ts">
  import Post from '$lib/components/lemmy/post/Post.svelte'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import { userSettings } from '$lib/settings.js'
  import type {
    GetPostsResponse,
    ListingType,
    PostView,
    SortType,
    Community,
  } from 'lemmy-js-client'
  import { Badge, Button } from 'mono-svelte'
  import {
    ArchiveBox,
    ChevronDoubleUp,
    ExclamationTriangle,
    Icon,
    Minus,
    Plus,
  } from 'svelte-hero-icons'
  import { expoOut } from 'svelte/easing'
  import { fly, slide } from 'svelte/transition'
  import { browser } from '$app/environment'
  import { afterUpdate, onMount, tick, type SvelteComponent } from 'svelte'
  import { afterNavigate, beforeNavigate } from '$app/navigation'
  import { combineCrossposts } from './crosspost'
  import { client } from '$lib/lemmy'
  import {
    postFeeds,
    type PostFeed,
    type PostFeedID,
  } from '$lib/lemmy/postfeed'
  import { t } from '$lib/translations'
  import InfiniteScroll from 'svelte-infinite-scroll'
  import type { Readable } from 'svelte/motion'
  import EndPlaceholder from '$lib/components/ui/EndPlaceholder.svelte'
  import { isLimitedTopSort, getNextTopSort } from '$lib/util/sortProgression'

  export let posts: PostView[]
  export let community: boolean | Community = false
  export let feedId: PostFeedID
  export let feedData: PostFeed['data']
  let currentCursor = feedData.cursor.next
  let allPosts: PostView[] = []
  let debug = true // Переменная для включения/выключения отладки
  let consecutiveEmptyPages = 0 // Счетчик пустых страниц для автоматического переключения
  let maxEmptyPagesBeforeProgression = 1 // Максимальное количество пустых страниц перед переключением
  let postsLoadedWithCurrentSort = 0 // Количество постов загруженных с текущей сортировкой
  let maxPostsBeforeProgression = 5 // Максимальное количество постов перед автоматическим переключением
  let progressionSort: SortType | null = null // текущая сортировка для прогрессии
  let progressionCursor: string | undefined = undefined // курсор для прогрессии
  let progressionActive = false // идет ли прогрессия

  // Делаем переменные прогрессии реактивными
  $: if (progressionActive && progressionSort) {
    log('Progression state updated:', { progressionSort, progressionCursor, progressionActive })
  }

  function log(...args: any[]) {
    if (debug) {
      console.log(...args)
    }
  }

  // Инициализируем allPosts при первом рендере
  $: if (feedData.posts.posts && allPosts.length === 0) {
    allPosts = [...feedData.posts.posts]
    posts = allPosts
  }

  $: if (feedData.cursor.next) {
    currentCursor = feedData.cursor.next
  }

  // Отладочная информация о сортировке
  $: if (debug && feedData.sort) {
    log('Current sort in VirtualFeed:', feedData.sort)
    log('Is limited top sort:', isLimitedTopSort(feedData.sort))
  }



  let error: any = undefined
  let loading = false
  let hasMore = true

  async function loadMore() {
    if (loading) return
    loading = true

    let sortToUse = feedData.sort
    let cursorToUse = currentCursor

    // Если идет прогрессия, используем её параметры
    if (progressionActive && progressionSort) {
      sortToUse = progressionSort
      cursorToUse = progressionCursor
      log('Using progression params:', { progressionSort, progressionCursor, progressionActive })
    } else {
      log('Using normal params:', { sort: feedData.sort, currentCursor })
    }

    log('Starting loadMore with params:', { sortToUse, cursorToUse })

    try {
      // Используем community_name из feedData, если он есть
      const communityName = feedData.community_name || undefined
      
      // Получаем community_id только если community является объектом Community
      const communityId = typeof community === 'object' ? community.id : undefined

      log('Starting loadMore with params:', {
        cursor: currentCursor,
        community_id: communityId,
        community_name: communityName,
        type_: feedData.type_,
        isCommunity: community
      })
      loading = true

      const newPosts = await client()
        .getPosts({
          page_cursor: cursorToUse, // <-- исправлено!
          disliked_only: feedData.disliked_only,
          liked_only: feedData.liked_only,
          community_id: communityId,
          community_name: communityName,
          limit: feedData.limit,
          page: feedData.page,
          saved_only: feedData.saved_only,
          show_hidden: feedData.show_hidden,
          sort: sortToUse,
          type_: feedData.type_,
        })
        .catch((e) => {
          console.error('Error fetching posts:', e)
          throw new Error(e)
        })

      log('Received new posts details:', {
        postsCount: newPosts.posts.length,
        nextPage: newPosts.next_page,
        hasMore: !!newPosts.next_page,
        firstPostCommunity: newPosts.posts[0]?.community?.name,
        lastPostCommunity: newPosts.posts[newPosts.posts.length - 1]?.community?.name,
        communities: [...new Set(newPosts.posts.map(p => p.community.name))]
      })

      error = null
      // Обновляем hasMore - он должен быть true пока есть возможность загружать посты
      const existingIds = new Set(allPosts.map(p => p.post.id))
      let uniqueNewPosts = newPosts.posts.filter(p => !existingIds.has(p.post.id))

      log('Filtered posts:', {
        totalNew: newPosts.posts.length,
        uniqueNew: uniqueNewPosts.length,
        existingCount: allPosts.length
      })

      // Проверяем автоматическое переключение сортировки
      postsLoadedWithCurrentSort += uniqueNewPosts.length
      log('Checking sort progression - uniqueNewPosts:', uniqueNewPosts.length, 'sortToUse:', sortToUse, 'postsLoadedWithCurrentSort:', postsLoadedWithCurrentSort)
      
      // Цикл прогрессии - продолжаем переходить к следующему периоду, пока не дойдём до TopAll
      let shouldContinueProgression = isLimitedTopSort(sortToUse) && (postsLoadedWithCurrentSort >= maxPostsBeforeProgression || uniqueNewPosts.length === 0)
      
      while (shouldContinueProgression) {
        const nextSort = getNextTopSort(sortToUse)
        if (nextSort) {
          log('Auto-progressing sort from', sortToUse, 'to', nextSort)
          sortToUse = nextSort
          progressionSort = nextSort
          progressionCursor = undefined
          progressionActive = true
          postsLoadedWithCurrentSort = 0
          
          // Получаем новые посты для следующего периода
          try {
            const nextPosts = await client().getPosts({
              page_cursor: progressionCursor,
              disliked_only: feedData.disliked_only,
              liked_only: feedData.liked_only,
              community_id: communityId,
              community_name: communityName,
              limit: feedData.limit,
              page: feedData.page,
              saved_only: feedData.saved_only,
              show_hidden: feedData.show_hidden,
              sort: sortToUse,
              type_: feedData.type_,
            })
            
            // Обновляем existingIds с учетом всех уже добавленных постов
            const currentExistingIds = new Set(allPosts.map(p => p.post.id))
            const nextUnique = nextPosts.posts.filter(p => !currentExistingIds.has(p.post.id))
            
            if (nextUnique.length > 0) {
              allPosts = [...allPosts, ...nextUnique]
              postsLoadedWithCurrentSort += nextUnique.length
              progressionCursor = nextPosts.next_page
              uniqueNewPosts = nextUnique
              log('Progressed to', sortToUse, 'new posts:', nextUnique.length)
            } else {
              // Если нет новых постов в этом периоде, переходим к следующему
              progressionCursor = nextPosts.next_page
              log('No new posts in', sortToUse, 'period, continuing to next')
            }
            
            // Проверяем, нужно ли продолжать прогрессию
            shouldContinueProgression = isLimitedTopSort(sortToUse) && (postsLoadedWithCurrentSort >= maxPostsBeforeProgression || nextUnique.length === 0)
            
          } catch (e) {
            log('Error during progression to', sortToUse, ':', e)
            progressionActive = false
            progressionSort = null
            break
          }
        } else {
          // Достигли TopAll
          progressionActive = false
          progressionSort = null
          hasMore = !!newPosts.next_page
          log('Reached TopAll, progression complete')
          break
        }
      }
      
      // Если цикл прогрессии завершился, но мы не достигли TopAll, сбрасываем прогрессию
      if (!shouldContinueProgression && progressionActive && progressionSort && progressionSort !== 'TopAll') {
        // Сохраняем последний курсор для продолжения загрузки
        currentCursor = progressionCursor
        progressionActive = false
        progressionSort = null
        log('Progression cycle ended, resetting progression state, keeping cursor:', currentCursor)
      }
      
      // Обновляем hasMore - он должен быть true пока есть возможность загружать посты
      if (progressionActive && progressionSort) {
        // При прогрессии всегда можно продолжать, пока не достигнем TopAll
        hasMore = isLimitedTopSort(progressionSort)
        log('Progression active, hasMore set to:', hasMore, 'for sort:', progressionSort)
      } else {
        // После прогрессии или в обычном режиме используем next_page
        hasMore = !!newPosts.next_page
        log('Normal mode, hasMore set to:', hasMore, 'next_page:', newPosts.next_page)
      }

      // Обновляем курсоры
      if (progressionActive && progressionSort) {
        progressionCursor = newPosts.next_page
      } else {
        currentCursor = newPosts.next_page
      }

      // Добавляем посты из начального запроса, если они еще не были добавлены в цикле прогрессии
      const initialUniquePosts = newPosts.posts.filter(p => !existingIds.has(p.post.id))
      if (initialUniquePosts.length > 0) {
        allPosts = [...allPosts, ...initialUniquePosts]
        initialUniquePosts.forEach(p => existingIds.add(p.post.id))
      }
      posts = allPosts

      // Обновляем feedData при прогрессии
      if (progressionActive && progressionSort) {
        postFeeds.updateFeed(feedId, {
          data: {
            ...feedData,
            sort: progressionSort, // Обновляем сортировку в feedData
            cursor: {
              ...feedData.cursor,
              next: progressionCursor || currentCursor
            },
            posts: {
              ...feedData.posts,
              posts: allPosts
            }
          },
        })
      } else {
        postFeeds.updateFeed(feedId, {
          data: {
            ...feedData,
            cursor: {
              ...feedData.cursor,
              next: currentCursor
            },
            posts: {
              ...feedData.posts,
              posts: allPosts
            }
          },
        })
      }

      loading = false
      log('loadMore completed successfully:', {
        cursor: currentCursor,
        totalPosts: allPosts.length,
        newPosts: uniqueNewPosts.length
      })
    } catch (e) {
      console.error('Error in loadMore:', e)
      error = e
      loading = false
    }
  }

  const callback: IntersectionObserverCallback = (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return

      const element = entry.target as HTMLElement
      const id = element.getAttribute('data-index')

      if (!id) return

      postFeeds.updateFeed(feedId, {
        lastSeen: Number(id),
      })
      observer.unobserve(element)
    })
  }

  onMount(() => {
    const observer = new IntersectionObserver(callback, {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
    })

    const elements = document.querySelectorAll('.post-container')
    elements.forEach((el) => observer.observe(el))

    const postContainer = document.querySelector('#feed')
    if (postContainer) {
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (
                node instanceof HTMLElement &&
                node.classList.contains('post-container')
              ) {
                observer.observe(node)
              }
            })
            mutation.removedNodes.forEach((node) => {
              if (
                node instanceof HTMLElement &&
                node.classList.contains('post-container')
              ) {
                observer.unobserve(node)
              }
            })
          }
        })
      })

      mutationObserver.observe(postContainer, {
        childList: true,
        subtree: true,
      })
    }
  })
</script>

<!-- <svelte:window on:keydown={handleKeydown} /> -->

<div class="mx-auto w-full {$userSettings.newWidth ? 'max-w-screen-sm' : ''} px-3 sm:px-4">
  <ul
    class={`flex flex-col list-none ${
      $userSettings.view == 'card' ? 'gap-3 md:gap-4' : ''
    }`}
  >
    {#if posts?.length == 0}
      <div class="h-full grid place-items-center">
        <Placeholder
          icon={ArchiveBox}
          title="No posts"
          description="There are no posts that match this filter."
        >
          <Button href="/communities">
            <Icon src={Plus} size="16" mini slot="prefix" />
            <span>Follow some communities</span>
          </Button>
        </Placeholder>
      </div>
    {:else}
      <div id="feed">
        {#each posts as post, index (post.post.id)}
          <li
            data-index={index}
            style={index < 7 ? `--anim-delay: ${index * 100}ms` : ''}
            class="relative post-container {index < 7
              ? 'pop-in opacity-0'
              : ''} -mx-4 px-4 sm:px-6 mb-8 bg-white dark:bg-zinc-900 rounded-xl"
          >
            <Post
              hideCommunity={typeof community === 'boolean' ? community : false}
              view="cozy"
              {post}
              class="transition-all duration-250"
              on:hide={() => {
                posts = posts.toSpliced(index, 1)
              }}
            ></Post>
          </li>
        {/each}
      </div>
    {/if}

    {#if $userSettings.infiniteScroll && browser}
      {#if error}
        <div
          class="flex flex-col justify-center items-center
          rounded-xl gap-2 py-8 mt-6
          border !border-b !border-red-500 bg-red-500/5 px-4"
        >
          <div class="bg-red-500/30 rounded-full p-3 text-red-500">
            <Icon src={ExclamationTriangle} size="24" solid></Icon>
          </div>
          <pre class="py-0.5">{error}</pre>
          <Button
            color="primary"
            {loading}
            disabled={loading}
            on:click={() => loadMore()}
          >
            {$t('message.retry')}
          </Button>
        </div>
      {:else if hasMore}
        <!-- Скрытый div для отладки прогрессии -->
        {#if allPosts}
          <div
            data-feed-sort={(progressionActive && progressionSort) ? progressionSort : feedData.sort}
            data-feed-posts-count={allPosts.length}
            style="display:none"
          ></div>
        {/if}
        <div class="w-full skeleton animate-pulse pt-6">
          <!-- Скелетон поста с той же структурой что и Post.svelte -->
          <div class="post post-preview relative max-w-full min-w-0 w-full list-type flex flex-col gap-2">
            <!-- Meta область -->
            <div class="flex items-center gap-2" style="grid-area: meta;">
              <div class="w-8 h-8 rounded-full"></div>
              <div class="flex flex-col gap-1 flex-1">
                <div class="w-32 h-4"></div>
                <div class="w-24 h-3"></div>
              </div>
              <div class="w-16 h-6 rounded-full"></div>
            </div>
            
            <!-- Title область -->
            <div class="text-2xl font-medium" style="grid-area: title;">
              <div class="w-96 max-w-full h-8"></div>
            </div>
            
            <!-- Body область -->
            <div class="relative text-slate-600 dark:text-zinc-400" style="grid-area: body;">
              <div class="w-full h-4 mb-2"></div>
              <div class="w-3/4 h-4 mb-2"></div>
              <div class="w-1/2 h-4"></div>
            </div>
            
            <!-- Embed область -->
            <div style="grid-area: embed;">
              <div class="w-full h-48 rounded-xl"></div>
            </div>
            
            <!-- Read more область -->
            <div class="text-sm text-accent-500 mt-2" style="grid-area: read-more;">
              <div class="w-24 h-4"></div>
            </div>
            
            <!-- Actions область -->
            <div class="flex justify-between items-center" style="grid-area: actions;">
              <div class="flex gap-2">
                <div class="w-16 h-8 rounded-full"></div>
                <div class="w-16 h-8 rounded-full"></div>
              </div>
              <div class="w-20 h-8 rounded-full"></div>
            </div>
          </div>
        </div>
      {:else}
        <!-- Скрыто сообщение о конце ленты -->
        <!--
        <div style="border-top-width: 0">
          <EndPlaceholder>
            {$t('routes.frontpage.endFeed', {
              // @ts-ignore
              community_name: feedData.community_name ?? 'undefined',
            })}
            <Button slot="action" color="tertiary">
              <Icon src={ChevronDoubleUp} size="16" micro slot="prefix" />
              {$t('routes.post.scrollToTop')}
            </Button>
          </EndPlaceholder>
        </div>
        -->
      {/if}
      <InfiniteScroll window threshold={1000} on:loadMore={loadMore} />
    {/if}
    <slot />
  </ul>
</div>

<style lang="postcss">
  .skeleton * {
    @apply bg-slate-300 dark:bg-zinc-600 rounded-md;
    position: relative;
    overflow: hidden;
  }
  .skeleton *::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
    animation: skeleton-shimmer 0.8s infinite;
    z-index: 1;
    pointer-events: none;
  }
  @keyframes skeleton-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes popIn {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
    to {
      transform: translateY(0px);
      opacity: 1;
    }
  }

  .pop-in {
    animation: popIn 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards
      var(--anim-delay);
  }
</style>
