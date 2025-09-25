<script lang="ts">
  import { profile } from '$lib/auth.js'
  import { isAdmin } from '$lib/components/lemmy/moderation/moderation.js'
  import Markdown from '$lib/components/markdown/Markdown.svelte'
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import EditableList from '$lib/components/ui/list/EditableList.svelte'
  import { toast } from 'mono-svelte'
  import { getClient } from '$lib/lemmy.js'
  import { site as siteStore } from '$lib/lemmy.js'
  import type { Tagline } from 'lemmy-js-client'
  import { Button } from 'mono-svelte'
  import { Icon, Plus, QuestionMarkCircle, Trash } from 'svelte-hero-icons'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { t } from '$lib/translations.js'

  export let data

  // Константы для валидации
  const MAX_TAGLINE_LENGTH = 500
  const MAX_TAGLINES_COUNT = 20

  let taglines = [...(data.site?.taglines.map((t: Tagline) => t.content) ?? [])]
  let newTagline = ''
  let saving = false

  // Проверяем права администратора
  $: isUserAdmin = $profile?.user && isAdmin($profile.user)

  // Функция валидации слогана
  function validateTagline(tagline: string): { valid: boolean; error?: string } {
    const trimmed = tagline.trim()
    
    if (!trimmed) {
      return { valid: false, error: 'Слоган не может быть пустым' }
    }
    
    if (trimmed.length > MAX_TAGLINE_LENGTH) {
      return { valid: false, error: `Слоган не должен превышать ${MAX_TAGLINE_LENGTH} символов` }
    }
    
    // Проверяем на потенциально опасные паттерны
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return { valid: false, error: 'Слоган содержит потенциально опасный контент' }
      }
    }
    
    return { valid: true }
  }

  async function save() {
    if (!$profile?.jwt) {
      toast({
        content: 'Нет токена авторизации',
        type: 'error',
      })
      return;
    }

    if (!isUserAdmin) {
      toast({
        content: 'Недостаточно прав для редактирования слоганов',
        type: 'error',
      })
      return;
    }

    // Валидируем все слоганы перед сохранением
    for (const tagline of taglines) {
      const validation = validateTagline(tagline)
      if (!validation.valid) {
        toast({
          content: `Ошибка валидации: ${validation.error}`,
          type: 'error',
        })
        return;
      }
    }

    saving = true

    try {
      
      const saveResult = await getClient().editSite({
        taglines: taglines,
      })
      
      // Обновляем данные сайта в store, чтобы навбар подхватил изменения
      const updatedSite = await getClient().getSite()
      
      siteStore.set(updatedSite)
      
      // Принудительно обновляем данные для текущей страницы
      data.site = updatedSite
      
      toast({
        content: $t('toast.updatedSite'),
        type: 'success',
      })
    } catch (err) {
      toast({
        content: `Ошибка сохранения: ${err.message || 'Неизвестная ошибка'}`,
        type: 'error',
      })
    }

    saving = false
  }

  // Функция для добавления слогана с автоматическим сохранением
  async function addTagline() {
    if (!data.site || !isUserAdmin) {
      toast({
        content: 'Недостаточно прав для добавления слоганов',
        type: 'error',
      })
      return;
    }

    const trimmedTagline = newTagline.trim()
    
    if (!trimmedTagline) {
      toast({
        content: 'Слоган не может быть пустым',
        type: 'error',
      })
      return;
    }

    // Проверяем лимит количества слоганов
    if (taglines.length >= MAX_TAGLINES_COUNT) {
      toast({
        content: `Максимальное количество слоганов: ${MAX_TAGLINES_COUNT}`,
        type: 'error',
      })
      return;
    }

    // Валидируем новый слоган
    const validation = validateTagline(trimmedTagline)
    if (!validation.valid) {
      toast({
        content: `Ошибка валидации: ${validation.error}`,
        type: 'error',
      })
      return;
    }

    // Проверяем на дубликаты
    if (taglines.includes(trimmedTagline)) {
      toast({
        content: 'Такой слоган уже существует',
        type: 'error',
      })
      return;
    }

    const updatedTaglines = [...taglines, trimmedTagline]
    taglines = updatedTaglines
    newTagline = ''

    // Автоматически сохраняем после добавления
    await save()
  }
</script>

{#if !isUserAdmin}
  <div class="my-auto text-center">
    <Placeholder
      icon={QuestionMarkCircle}
      title="Доступ запрещен"
      description="У вас нет прав администратора для управления слоганами"
    />
  </div>
{:else if taglines.length > 0}
  <Header pageHeader>
    {$t('routes.admin.taglines.title')}
  </Header>

  <EditableList
    let:action
    on:action={async (e) => {
      // Проверяем права администратора
      if (!isUserAdmin) {
        toast({
          content: 'Недостаточно прав для удаления слоганов',
          type: 'error',
        })
        return;
      }

      taglines.splice(
        taglines.findIndex((i) => i == e.detail),
        1
      )

      // hack for reactivity
      taglines = taglines

      // Автоматически сохраняем после удаления
      await save()
    }}
  >
    {#each taglines as tagline}
      <div class="flex py-3">
        <Markdown source={tagline} inline />

        <div class="flex gap-2 ml-auto">
          <Button on:click={() => action(tagline)} size="square-md">
            <Icon src={Trash} mini size="16" />
          </Button>
        </div>
      </div>
    {/each}
  </EditableList>
  <form
    class="flex flex-col mt-auto gap-2 w-full"
    on:submit|preventDefault={addTagline}
  >
    <MarkdownEditor bind:value={newTagline} images={false} />

    <Button size="lg" submit loading={saving} disabled={saving}>
      <Icon src={Plus} size="16" mini slot="prefix" />
      {$t('common.add')}
    </Button>
  </form>
{:else}
  <div class="my-auto">
    <Placeholder
      icon={Plus}
      title={$t('routes.admin.taglines.empty.title')}
      description={$t('routes.admin.taglines.empty.description')}
    >
      <div class="mt-4 max-w-xl w-full flex flex-col gap-2">
        <form
          class="flex flex-col gap-2 w-full"
          on:submit|preventDefault={addTagline}
        >
          <MarkdownEditor
            bind:value={newTagline}
            placeholder={$t('routes.admin.taglines.add')}
            images={false}
          />

          <Button size="lg" submit loading={saving} disabled={saving}>
            <Icon src={Plus} size="16" mini slot="prefix" />
            {$t('common.add')}
          </Button>
        </form>
      </div>
    </Placeholder>
  </div>
{/if}
