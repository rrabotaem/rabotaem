<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
  import { client, site } from '$lib/lemmy.js'
  import { goto } from '$app/navigation'
  import type { Community, Post, PostView } from 'lemmy-js-client'
  import { Select, Spinner, Switch, toast, Modal } from 'mono-svelte'
  import {
    Icon,
    Photo,
    ArrowPath,
    Sparkles,
    ChatBubbleBottomCenterText,
    Plus,
    Language,
    Link,
    XMark,
  } from 'svelte-hero-icons'
  import { profile } from '$lib/auth.js'
  import EditorJS from '$lib/components/editor/EditorJS.svelte'
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte'
  import { placeholders, uploadImage, deserializeEditorModel } from '$lib/util.js'
  import { Checkbox, TextInput } from 'mono-svelte'
  import { getSessionStorage, setSessionStorage, saveDraft, getDraft, removeDraft, formatLastSaved, getDraftLastSaved, debugDrafts } from '$lib/session.js'
  import ObjectAutocomplete from '$lib/components/lemmy/ObjectAutocomplete.svelte'
  import { Button } from 'mono-svelte'
  import Avatar from '$lib/components/ui/Avatar.svelte'
  import { t } from '$lib/translations'
  import { slide } from 'svelte/transition'
  import { feature } from '$lib/version'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import ErrorContainer, {
    clearErrorScope,
    pushError,
  } from '$lib/components/error/ErrorContainer.svelte'
  import { errorMessage } from '$lib/lemmy/error'
  import FreeTextInput from '$lib/components/input/FreeTextInput.svelte'
  import { isAdmin } from '$lib/components/lemmy/moderation/moderation.js'

  export let edit = false

  /**
   * The post to edit
   */
  export let editingPost: Post | undefined = undefined

  export let passedCommunity: Community | undefined = undefined

  export let data: {
    community: Community | null
    title: string
    body: string
    image: FileList | null
    thumbnail?: string
    url?: string
    nsfw: boolean
    loading: boolean
    alt_text?: string
    language_id?: number
  } = {
    community: null,
    title: '',
    body: '',
    image: null,
    thumbnail: undefined,
    url: undefined,
    nsfw: false,
    loading: false,
    alt_text: undefined,
    language_id: undefined,
  }
  // weird select menu language handling
  // @ts-ignore
  $: if (data.language_id === '') data.language_id = undefined

  let saveDraftToSession = edit ? false : true
  let communitySearch = passedCommunity?.name ?? ''

  let communities: Community[] = []

  const dispatcher = createEventDispatcher<{ submit: PostView }>()

  let isJsonContent = true
  let showDraftModal = false
  let draftData: any = null
  let draftLastSaved: Date | null = null
  let draftDecisionMade = false // Блокировка автосохранения до принятия решения по черновику
  
  // Получаем ID поста для черновиков
  const postId = editingPost?.id || null

  // Реактивно обновляем тип контента при изменении body
  $: if (data.body !== undefined) {
    isJsonContent = detectContentType(data.body)
  }

  function detectContentType(content: string): boolean {
    // Пропускаем пустые строки
    if (!content || content.trim() === '') {
      return true; // По умолчанию EditorJS для новых постов
    }

    // Если контент начинается с < и заканчивается на >, это HTML
    if (content.trim().startsWith('<') && content.trim().endsWith('>')) {
      return false; // TipTap для HTML
    }

    try {
      // Сначала пробуем парсить как обычный JSON
      const parsed = JSON.parse(content);
      return parsed && typeof parsed === 'object' && 'blocks' in parsed;
    } catch {
      try {
        // Проверяем, похоже ли это на base64
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(content);
        
        if (!isBase64) {
          return false; // Не base64, значит HTML -> TipTap
        }
        
        // Если похоже на base64, пробуем десериализовать
        const decoded = deserializeEditorModel(content);
        return decoded && typeof decoded === 'object' && 'blocks' in decoded;
      } catch {
        // Если оба варианта не работают, это HTML
        return false; // TipTap для HTML
      }
    }
  }

  onMount(async () => {
    console.log('🚀 PostForm onMount: начало монтирования', { 
      postId, 
      edit, 
      editingPostId: editingPost?.id 
    })
    
    // Проверяем наличие черновика
    draftData = getDraft(postId)
    draftLastSaved = getDraftLastSaved(postId)
    
    console.log('📊 PostForm onMount: результат проверки черновика', {
      hasDraftData: !!draftData,
      draftLastSaved: draftLastSaved?.toLocaleString('ru-RU') || 'нет',
      draftTitle: draftData?.title || 'нет',
      draftBodyLength: draftData?.body?.length || 0
    })
    
    // Показываем все черновики для отладки
    debugDrafts()
    
    if (editingPost) {
      data.url = editingPost.url ?? ''
      data.body = editingPost.body ?? ''
      // Определяем тип контента после установки body
      isJsonContent = detectContentType(data.body)
      data.title = editingPost.name
      data.nsfw = editingPost.nsfw
      data.alt_text = editingPost.alt_text
      data.thumbnail = editingPost.thumbnail_url
      // @ts-ignore
      data.language_id = editingPost.language_id.toString()
      
              // Если есть черновик и он новее текущего контента, предлагаем восстановить
        if (draftData && draftData.body && draftData.body !== data.body) {
          console.log('📝 PostForm onMount: найден черновик для редактирования', {
            currentBodyLength: data.body?.length || 0,
            draftBodyLength: draftData.body?.length || 0,
            bodiesEqual: draftData.body === data.body
          })
          showDraftModal = true
        } else {
          // Для режима редактирования без черновика разрешаем автосохранение
          console.log('📭 PostForm onMount: черновик не найден для редактирования')
          draftDecisionMade = true
        }
      } else {
        // Для нового поста проверяем черновик
        if (draftData) {
          console.log('📝 PostForm onMount: найден черновик для нового поста', {
            draftTitle: draftData.title,
            draftBodyLength: draftData.body?.length || 0,
            draftCommunity: draftData.community?.name || 'нет'
          })
          showDraftModal = true
        } else {
          console.log('📭 PostForm onMount: черновик не найден для нового поста')
          draftDecisionMade = true // Разрешаем автосохранение если черновика нет
        }
      }

    if (passedCommunity) {
      data.community = passedCommunity
      communitySearch = passedCommunity.name
      console.log(communitySearch)
    } else {
      const list = await client().listCommunities({
        type_: 'All',
        sort: 'Active',
        limit: 40,
      })

      communities = list.communities.map((c) => c.community)
    }
  })

  let autosaveTimeout: NodeJS.Timeout | null = null

  // Функция автосохранения черновика с debounce
  const autosaveDraft = () => {
    console.log('🔄 PostForm autosaveDraft: начало функции', {
      edit,
      draftDecisionMade,
      hasTitle: !!data.title,
      hasBody: !!data.body,
      titleLength: data.title?.length || 0,
      bodyLength: data.body?.length || 0,
      community: data.community?.name || 'нет',
      hasTimeout: !!autosaveTimeout
    })
    
    // Блокируем автосохранение если пользователь еще не принял решение по черновику
    if (!draftDecisionMade) {
      console.log('🚫 PostForm autosaveDraft: блокировано - ожидаем решения по черновику')
      return
    }
    
    if (!edit && (data.title || data.body)) { // Автосохранение только для новых постов
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout)
        console.log('⏰ PostForm autosaveDraft: очистили предыдущий таймер')
      }
      
      autosaveTimeout = setTimeout(() => {
        // Проверяем, что есть значимые данные для сохранения
        const hasTitle = data.title && data.title.trim().length > 0
        const hasBody = data.body && data.body.trim().length > 0
        const hasCommunity = data.community !== null
        
        if (!hasTitle && !hasBody && !hasCommunity) {
          console.log('⏭️ PostForm autosaveDraft: пропускаем сохранение - нет значимых данных')
          return
        }
        
        console.log('🚀 PostForm autosaveDraft: выполняем отложенное сохранение', {
          postId,
          dataToSave: {
            title: data.title,
            bodyLength: data.body?.length || 0,
            community: data.community?.name || 'нет',
            url: data.url,
            nsfw: data.nsfw
          },
          checks: { hasTitle, hasBody, hasCommunity }
        })
        
        saveDraft(postId, {
          title: data.title,
          body: data.body,
          community: data.community,
          url: data.url,
          nsfw: data.nsfw,
          language_id: data.language_id,
          alt_text: data.alt_text,
          thumbnail: data.thumbnail
        })
        draftLastSaved = new Date()
        console.log('💾 PostForm: Черновик автоматически сохранён:', draftLastSaved.toLocaleString('ru-RU'))
      }, 1000) // Сохраняем через 1 секунду после изменения
    } else {
      console.log('⏭️ PostForm autosaveDraft: пропускаем сохранение', {
        reason: edit ? 'режим редактирования' : 'нет данных для сохранения'
      })
    }
  }

  onDestroy(() => {
    // @ts-ignore
    if (saveDraftToSession) setSessionStorage('postDraft', data)
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout)
    }
  })

  async function submit() {
    if (!$profile?.jwt || (!edit && !data.community)) return

    data.loading = true
    
    try {
      // Валидация заголовка
      if (!data.title || data.title.trim().length === 0) {
        throw new Error('Заголовок поста не может быть пустым')
      }
      
      // Проверяем длину заголовка (Lemmy обычно ограничивает до 200 символов)
      if (data.title.length > 200) {
        throw new Error('Заголовок поста не должен превышать 200 символов')
      }
      
      // Проверяем байтовую длину для UTF-8 символов
      const byteLength = new TextEncoder().encode(data.title).length
      if (byteLength > 300) {
        throw new Error('Заголовок слишком длинный. Используйте более короткий заголовок')
      }

      // Проверяем права на редактирование
      if (edit && editingPost && 
          $profile?.user && !isAdmin($profile.user) && 
          editingPost.creator_id !== $profile.user?.local_user_view.person.id) {
        throw new Error('Недостаточно прав для редактирования')
      }

      const post = await (edit
        ? client().editPost({
            post_id: editingPost!.id,
            name: data.title,
            url: data.url,
            body: data.body,
            nsfw: data.nsfw,
            language_id: Number(data.language_id),
          })
        : client().createPost({
            community_id: data.community!.id,
            name: data.title,
            body: data.body,
            url: data.url || undefined,
            nsfw: data.nsfw,
            custom_thumbnail: data.thumbnail,
            alt_text: data.alt_text,
            language_id: data.language_id ? Number(data.language_id) : undefined,
          }))

      // Удаляем черновик после успешного сохранения
      console.log('✅ PostForm submit: Пост успешно сохранён, удаляем черновик', {
        postId,
        newPostId: post.post_view.post.id,
        edit
      })
      removeDraft(postId)
      
      dispatcher('submit', post.post_view)
      if (!edit) goto(`/post/${post.post_view.post.id}`)
    } catch (err) {
      toast({
        content: errorMessage(err),
        type: 'error',
      })
    }

    data.loading = false
  }

  let uploadingImage = false

  const generateTitle = async (url: string | undefined) => {
    if (!url) return
    generation.loading = true
    try {
      const res = await client().getSiteMetadata({
        url: url,
      })

      // for backup
      const oldData = { ...data }

      if (res.metadata.title) data.title = res.metadata.title
      if (res.metadata.description)
        data.body = res.metadata.description
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n')

      toast({
        content: $t('toast.generatedTitle'),
        type: 'info',
        action: () => (data = oldData),
        duration: 15 * 1000,
      })
    } catch (e) {
      pushError({
        message: $t('toast.failGenerateTitle'),
        scope: 'post-form',
      })
    }
    generation.loading = false
  }

  const canGenerateTitle = (url: string | undefined) => {
    if (!url) return false
    try {
      new URL(url)
    } catch (e) {
      return false
    }
    return true
  }

  let generation = {
    loading: false,
    generatable: false,
    title: '',
  }

  let addAltText = false

  $: generation.generatable = canGenerateTitle(data.url)
</script>

{#if uploadingImage}
  {#await import('$lib/components/lemmy/modal/ImageUploadModal.svelte') then { default: UploadModal }}
    <UploadModal
      bind:open={uploadingImage}
      multiple={false}
      on:upload={(e) => {
        if (e.detail) data.url = e.detail[0]
        uploadingImage = false
      }}
    />
  {/await}
{/if}

<!-- Модальное окно для восстановления черновика -->
{#if showDraftModal && draftData}
  <Modal bind:open={showDraftModal}>
    <div class="flex flex-col gap-4 p-6 max-w-md">
      <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">
        Найден сохранённый черновик
      </h3>
      <p class="text-sm text-slate-600 dark:text-slate-400">
        Обнаружен черновик ({formatLastSaved(draftLastSaved)}). 
        Хотите восстановить его или продолжить с текущим содержимым?
      </p>
      <div class="flex gap-2">
        <Button
          on:click={async () => {
            console.log('🔄 PostForm: Восстанавливаем черновик', {
              beforeRestore: {
                title: data.title,
                bodyLength: data.body?.length || 0,
                community: data.community?.name || 'нет'
              },
              draftToRestore: {
                title: draftData.title,
                bodyLength: draftData.body?.length || 0,
                community: draftData.community?.name || 'нет',
                url: draftData.url,
                nsfw: draftData.nsfw
              }
            })
            
            // Восстанавливаем черновик
            console.log('🔧 Начинаем восстановление полей:', {
              titleBefore: data.title,
              titleFromDraft: draftData.title,
              bodyBefore: data.body?.length || 0,
              bodyFromDraft: draftData.body?.length || 0,
              communityBefore: data.community?.name || 'нет',
              communityFromDraft: draftData.community?.name || 'нет'
            })
            
            if (draftData.title) {
              data.title = draftData.title
              console.log('📝 Заголовок восстановлен:', data.title)
              
              // Принудительно обновляем поле заголовка
              const titleInput = document.querySelector('input[type="text"]')
              if (titleInput && titleInput instanceof HTMLInputElement) {
                titleInput.value = data.title
                console.log('🔄 Поле заголовка принудительно обновлено:', titleInput.value)
              }
            }
            if (draftData.body) {
              data.body = draftData.body
              console.log('📄 Тело поста восстановлено, длина:', data.body?.length || 0)
            }
            if (draftData.community) {
              data.community = draftData.community
              communitySearch = draftData.community.name // Обновляем также поле поиска
              console.log('🏠 Сообщество восстановлено:', draftData.community.name)
            }
            if (draftData.url) {
              data.url = draftData.url
              console.log('🔗 URL восстановлен:', data.url)
            }
            if (draftData.nsfw !== undefined) {
              data.nsfw = draftData.nsfw
              console.log('🔞 NSFW восстановлен:', data.nsfw)
            }
            if (draftData.language_id) {
              data.language_id = draftData.language_id
              console.log('🌐 Язык восстановлен:', data.language_id)
            }
            if (draftData.alt_text) {
              data.alt_text = draftData.alt_text
              console.log('🖼️ Alt-текст восстановлен:', data.alt_text)
            }
            if (draftData.thumbnail) {
              data.thumbnail = draftData.thumbnail
              console.log('🖼️ Миниатюра восстановлена:', data.thumbnail)
            }
            
            // Определяем тип контента для правильного выбора редактора
            const oldJsonContent = isJsonContent
            isJsonContent = detectContentType(data.body)
            console.log('🔄 Тип контента определен:', {
              oldJsonContent,
              newJsonContent: isJsonContent,
              bodyPreview: data.body?.substring(0, 100) || 'пусто'
            })
            
            console.log('✅ PostForm: Черновик восстановлен', {
              afterRestore: {
                title: data.title,
                bodyLength: data.body?.length || 0,
                community: data.community?.name || 'нет',
                isJsonContent
              }
            })
            
            // Принудительно обновляем DOM
            await tick()
            
            console.log('🔄 PostForm: DOM обновлен после восстановления', {
              finalState: {
                title: data.title,
                bodyLength: data.body?.length || 0,
                community: data.community?.name || 'нет'
              }
            })
            
            showDraftModal = false
            toast({ content: 'Черновик восстановлен', type: 'success' })
            
            // Задержка перед включением автосохранения чтобы дать время полям обновиться
            setTimeout(() => {
              draftDecisionMade = true // Разрешаем автосохранение после восстановления
              console.log('🔓 PostForm: Автосохранение разблокировано после восстановления')
            }, 500)
          }}
          color="primary"
          class="flex-1"
        >
          Восстановить
        </Button>
        <Button
          on:click={() => {
            console.log('🗑️ PostForm: Удаляем черновик по запросу пользователя', { postId })
            
            // Удаляем черновик и продолжаем с текущим содержимым
            removeDraft(postId)
            showDraftModal = false
            draftDecisionMade = true // Разрешаем автосохранение после удаления черновика
            toast({ content: 'Черновик удалён', type: 'info' })
            
            console.log('✅ PostForm: Черновик удалён, модальное окно закрыто')
          }}
          color="ghost"
          class="flex-1"
        >
          Удалить черновик
        </Button>
      </div>
    </div>
  </Modal>
{/if}

<form on:submit|preventDefault={submit} class="flex flex-col gap-4 h-full">
  <slot name="formtitle">
    <Header class="font-bold text-xl">
      {edit ? $t('form.post.edit') : $t('form.post.create')}
    </Header>
  </slot>
  <ErrorContainer scope="post-form" />
  {#if !edit && data}
    {#if !data.community}
      <ObjectAutocomplete
        bind:q={communitySearch}
        bind:items={communities}
        jwt={$profile?.jwt}
        listing_type="All"
        label={$t('form.post.community')}
        placeholder="Выберите сообщество"
        required
        on:select={(e) => {
          const c = e.detail
          if (!c) {
            data.community = null
            return
          }

          communitySearch = ''

          data.community = c
        }}
      />
    {:else}
      <div class="flex flex-col gap-1">
        <span class="font-medium text-sm">{$t('form.post.community')}</span>
        <Button
          class="w-full !bg-white dark:!bg-black h-[38px]"
          on:click={() => (data.community = null)}
          alignment="left"
          size="sm"
        >
          <Avatar
            url={data.community.icon}
            alt={data.community.name}
            width={24}
            slot="prefix"
          />
          <div class="flex flex-col gap-0">
            <span class="text-xs">{data.community.name}</span>
            <span class="text-[10px] leading-3">
              {new URL(data.community.actor_id).hostname}
            </span>
          </div>
        </Button>
      </div>
    {/if}
  {/if}
  <FreeTextInput
    type="text"
    required
    bind:value={data.title}
    on:input={autosaveDraft}
    placeholder="Отображается H1 заголовком в посте"
    label={$t('form.post.title')}
    maxlength={200}
    title="Заголовок не должен превышать 200 символов"
    class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-sm overflow-hidden resize-none"
  />
  <!-- Блок-подсказка по редактору сразу под заголовком -->
  <div class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-zinc-900/60 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 sm:px-4 sm:py-3 flex flex-col gap-1.5">
    <span class="font-medium text-slate-800 dark:text-slate-100">
      Как пользоваться редактором
    </span>
    <p class="leading-snug">
      У нас мощный визуальный редактор: поддерживает заголовки, кнопки, галереи, видео и многое другое.
      Посмотрите короткую инструкцию, чтобы быстро разобратьcя с возможностями и оформить текст как в лучших медиа.
    </p>
    <a
      href="https://rabotaem.app/post/746-kak-pravilno-verstat-stati-v-redaktore-instruktsiya"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline underline-offset-2 decoration-orange-400/70"
    >
      Открыть инструкцию по редактору в новой вкладке
      <span aria-hidden="true">↗</span>
    </a>
  </div>
  {#if isJsonContent}
    <EditorJS
      label={$t('form.post.body')}
      bind:value={data.body}
      placeholder={placeholders.get('post')}
      {postId}
      enableAutosave={draftDecisionMade}
      onContentChange={autosaveDraft}
    />
  {:else}
    <TipTapEditor
      label={$t('form.post.body')}
      bind:value={data.body}
      placeholder={placeholders.get('post')}
    />
  {/if}
  <!--
  {#if data.url !== undefined}
    <div class="flex flex-col gap-2">
      <TextInput
        label={$t('form.post.url')}
        bind:value={data.url}
        placeholder={placeholders.get('url')}
        class="w-full"
      />
      <div class="flex items-center gap-2 max-w-[640px] actions">
        <div
          class="border border-slate-100 rounded-xl h-6 w-6 grid place-items-center"
        >
          <Icon src={Plus} size="16" micro slot="prefix" />
        </div>
        {#if data.url}
          <Button
            on:click={() => (addAltText = !addAltText)}
            rounding="pill"
            size="sm"
            color="ghost"
            class="text-xs"
          >
            <Icon
              src={ChatBubbleBottomCenterText}
              size="15"
              micro
              slot="prefix"
            />{$t('form.post.altText')}
          </Button>
        {/if}
        <Button
          on:click={() => (uploadingImage = !uploadingImage)}
          rounding="pill"
          size="sm"
          color="ghost"
          class="text-xs"
        >
          <Icon src={Photo} size="15" micro slot="prefix" />
          {$t('form.post.uploadImage')}
        </Button>
        {#if generation.generatable}
          <Button
            on:click={() => generateTitle(data.url)}
            loading={generation.loading}
            rounding="pill"
            size="sm"
            color="ghost"
            class="text-xs"
          >
            <Icon src={Sparkles} size="15" micro slot="prefix" />
            {$t('form.post.generateTitle')}
          </Button>
        {/if}
      </div>
    </div>
  {/if}
  
  <div class="flex flex-row gap-2 flex-wrap">
    {#if data.url === undefined}
      <Button
        on:click={async () => {
          data.url = ''
          try {
            const url = new URL(await navigator.clipboard.readText())

            data.url = url.toString()
          } catch (e) {}
        }}
        size="sm"
        rounding="pill"
      >
        <Icon src={Link} size="16" micro />
        {$t('form.post.addUrl')}
      </Button>
      <Button
        on:click={() => {
          data.url = ''
          uploadingImage = true
        }}
        size="sm"
        rounding="pill"
      >
        <Icon src={Photo} size="16" micro />
        {$t('form.post.uploadImage')}
      </Button>
    {/if}
    {#if data.language_id === undefined}
      <Button size="sm" rounding="pill" on:click={() => (data.language_id = 0)}>
        <Icon src={Language} size="16" micro />
        {$t('form.post.setLanguage')}
      </Button>
    {/if}
  </div>
  
  {#if addAltText}
    <div transition:slide={{ axis: 'y', duration: 150 }} class="w-full">
      <TextInput label={$t('form.post.altText')} bind:value={data.alt_text} />
    </div>
  {/if}
  <Switch bind:checked={data.nsfw}>{$t('form.post.nsfw')}</Switch>-->
  <!--{#if data.language_id !== undefined}
    {#if $site}
      <Select
        class="w-max"
        label={$t('settings.app.lang.title')}
        bind:value={data.language_id}
      >
        <option value={undefined}>
          <Icon src={XMark} size="16" micro />
          {$t('form.post.unset')}
        </option>
        {#each $site?.all_languages as language}
          <option value={language.id.toString()}>{language.name}</option>
        {/each}
      </Select>
    {:else}
      <div style="height: 58px;">
        <Spinner width={24} />
      </div>
    {/if}
  {/if}-->
  <div class="mt-auto" />
  <div class="flex flex-row items-center gap-2 w-full">
    <div class="flex flex-col flex-1 gap-1">
      <Button
        submit
        color="primary"
        loading={data.loading}
        size="lg"
        disabled={data.loading}
        class="w-full"
      >
        Опубликовать
        <!-- {$t('form.submit')} -->
      </Button>
    </div>

    {#if !edit && false}
      <Button
        on:click={() => {
          toast({ content: $t('toast.restoredFromDraft') })
          const draft = getSessionStorage('postDraft')
          if (draft && !edit) {
            // @ts-ignore
            draft.loading = false
            // @ts-ignore
            data = draft
            // Определяем тип контента для правильного выбора редактора
            isJsonContent = detectContentType(data.body)
          }
        }}
        rounding="xl"
        size="custom"
        disabled={!getSessionStorage('postDraft')}
        title="Restore From Draft"
        class=" aspect-square h-full"
      >
        <Icon src={ArrowPath} size="16" mini />
      </Button>
    {/if}
  </div>
</form>
