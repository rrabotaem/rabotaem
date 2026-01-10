<script lang="ts">
  import { goto } from '$app/navigation'
  import { profile } from '$lib/auth.js'
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte'
  import { ImageInput, Switch, toast } from 'mono-svelte'
  import { client, getClient } from '$lib/lemmy.js'
  import { addSubscription } from '$lib/lemmy/user.js'
  import { Button, Checkbox, TextInput } from 'mono-svelte'
  import { uploadImage } from '$lib/util.js'
  import { t } from '$lib/translations'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import ImagePreviewInput from '$lib/components/input/ImagePreviewInput.svelte'
  import Label from 'mono-svelte/forms/Label.svelte'
  import { DocumentPlus, Icon } from 'svelte-hero-icons'
  import ImageUploadModal from '../modal/ImageUploadModal.svelte'
  import Select from 'mono-svelte/forms/Select.svelte'

  /**
   * The community ID to edit.
   */
  export let edit: number | undefined = undefined

  const COMMUNITY_NAME_MAX_LENGTH = 20

  let communityNameError: string | undefined = undefined
  let communityNameInput: HTMLInputElement | undefined = undefined

  export let formData: {
    name: string
    displayName: string
    icon?: string
    banner?: string
    sidebar?: string
    nsfw: boolean
    postsLockedToModerators: boolean
    submitting: boolean
    visibility: 'Public' | 'LocalOnly'
  } = {
    name: '',
    displayName: '',
    sidebar: '',
    nsfw: false,
    postsLockedToModerators: false,
    submitting: false,
    visibility: 'Public',
  }

  // Функция транслитерации
  function transliterate(text: string): string {
    const ru2en: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
      'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
      'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
      'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
      'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
      'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
      'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
      'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
      'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
      'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
      'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
      'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    return text.split('').map(char => ru2en[char.toLowerCase()] || char).join('');
  }

  // Функция для обработки изменения отображаемого имени
  function handleDisplayNameChange() {
    if (!edit) { // Только если это не режим редактирования
      formData.name = transliterate(formData.displayName.toLowerCase())
        .replace(/[^a-z0-9\s-]/g, '-') // Заменяем все недопустимые символы на дефис, сохраняя пробелы
        .replace(/\s+/g, '_')          // Заменяем пробелы на подчеркивания
        .replace(/-+/g, '-')           // Убираем множественные дефисы
        .replace(/^-|-$/g, '')         // Убираем дефисы в начале и конце
        .replace(/^_|_$/g, '');        // Убираем подчеркивания в начале и конце
    }
  }

  function validateSidebar(text: string | undefined): boolean {
    if (!text?.trim()) return false;
    const words = text.trim().split(/\s+/);
    return words.length >= 3;
  }

  async function submit() {
    if (!$profile?.jwt) return

    if (!edit && formData.name.trim() === '') {
      communityNameError =
        $t('form.error.communityNameRequired') ||
        'Введите имя сообщества'
      communityNameInput?.setCustomValidity(
        communityNameError ??
          'Введите имя сообщества'
      )
      communityNameInput?.reportValidity()
      toast({
        content: communityNameError ?? 'Введите имя сообщества',
        type: 'error',
      })
      return
    }

    if (formData.displayName.trim() === '') {
      toast({
        content:
          $t('form.error.communityDisplayNameRequired') ||
          'Введите отображаемое имя сообщества',
        type: 'error',
      })
      return
    }
    if (formData.name.trim().length > COMMUNITY_NAME_MAX_LENGTH) {
      communityNameError =
        $t('form.error.communityNameTooLong') ||
        `Имя сообщества не может быть длиннее ${COMMUNITY_NAME_MAX_LENGTH} символов`
      communityNameInput?.setCustomValidity(
        communityNameError ??
          `Имя сообщества не может быть длиннее ${COMMUNITY_NAME_MAX_LENGTH} символов`
      )
      communityNameInput?.reportValidity()
      toast({
        content:
          communityNameError ??
          `Имя сообщества не может быть длиннее ${COMMUNITY_NAME_MAX_LENGTH} символов`,
        type: 'error',
      })
      return
    }

    communityNameError = undefined
    communityNameInput?.setCustomValidity('')
    
    // Добавляем валидацию sidebar
    if (!validateSidebar(formData.sidebar)) {
      toast({
        content: $t('form.error.sidebarTooShort') || 'Текст в боковой панели должен содержать минимум 3 слова',
        type: 'error',
      })
      return
    }

    console.log('Creating community with name:', formData.name, 'displayName:', formData.displayName)
    formData.submitting = true

    try {
      const res = edit
        ? await getClient().editCommunity({
            title: formData.displayName,
            description: formData.sidebar,
            nsfw: formData.nsfw,
            posting_restricted_to_mods: formData.postsLockedToModerators,
            icon: formData.icon,
            banner: formData.banner,
            community_id: edit,
            visibility: formData.visibility,
          })
        : await getClient().createCommunity({
            name: formData.name,
            title: formData.displayName,
            description: formData.sidebar,
            nsfw: formData.nsfw,
            posting_restricted_to_mods: formData.postsLockedToModerators,
            icon: formData.icon,
            banner: formData.banner,
            visibility: formData.visibility,
          })

      toast({
        content: $t('toast.updatedCommunity'),
        type: 'success',
      })

      if ($profile.user) {
        const c = $profile.user.moderates
          .map((m) => m.community.id)
          .indexOf(res.community_view.community.id)
        if (c != -1) {
          $profile.user.moderates[c] = {
            community: res.community_view.community,
            moderator: $profile.user.local_user_view.person,
          }
        } else {
          $profile.user = {
            ...$profile.user,
            moderates: [
              ...$profile.user.moderates,
              {
                community: res.community_view.community,
                moderator: $profile.user.local_user_view.person,
              },
            ],
          }
        }

        addSubscription(res.community_view.community, true)
      }

      if (!edit)
        goto(
          `/c/${res.community_view.community.name}@${
            new URL(res.community_view.community.actor_id).hostname
          }`
        )
    } catch (err) {
      console.error('Community creation error:', err)
      toast({
        content: err as any,
        type: 'error',
      })
    }

    formData.submitting = false
  }

  let uploading = {
    banner: false,
    icon: false,
  }
</script>

<form
  on:submit|preventDefault={submit}
  class="flex flex-col gap-4 h-full w-full"
>
  <slot name="formtitle">
    <Header>{$t('routes.createCommunity')}</Header>
  </slot>
  <TextInput
    required
    label={$t('form.profile.communityDisplayName')}
    bind:value={formData.displayName}
    bind:element={communityNameInput}
    on:input={() => {
      communityNameError = undefined
      communityNameInput?.setCustomValidity('')
      handleDisplayNameChange()
    }}
    class="w-full"
    placeholder="Хорошее имя сообщества - уместите в пару слов, не используйте спецсимволы и цифры"
  />
  <p class="text-xs text-slate-500 dark:text-zinc-400">
    Длина имени сообщества не может быть длиннее {COMMUNITY_NAME_MAX_LENGTH} латинских символов. Сейчас: {formData.name.length}/
    {COMMUNITY_NAME_MAX_LENGTH}.
  </p>
  {#if formData.name.trim().length > COMMUNITY_NAME_MAX_LENGTH}
    <p class="text-xs text-red-500">
      Имя слишком длинное — укоротите его, чтобы создать сообщество.
    </p>
  {/if}
  <div class="flex flex-row gap-4 flex-wrap *:flex-1">
    <div class="flex flex-col gap-1">
      <Label>{$t('routes.admin.config.icon')}</Label>
      <button
        type="button"
        on:click={() => (uploading.icon = !uploading.icon)}
        class="flex flex-col gap-4 bg-white dark:bg-black border border-slate-300 dark:border-zinc-800 p-4 w-full h-32 rounded-xl"
      >
        {#if formData.icon}
          <img src={formData.icon} alt="" class="rounded-md mx-auto h-full" />
        {:else}
          <Icon
            src={DocumentPlus}
            size="48"
            class="text-slate-500 dark:text-zinc-500 mx-auto my-auto"
          />
        {/if}
      </button>
      {#if uploading.icon}
        <ImageUploadModal
          bind:open={uploading.icon}
          multiple={false}
          on:upload={(uploaded) => {
            uploading.icon = false
            formData.icon = uploaded.detail[0]
          }}
        />
      {/if}
    </div>
    <div class="flex flex-col gap-1">
      <Label>{$t('routes.admin.config.banner')}</Label>
      <button
        type="button"
        on:click={() => (uploading.banner = !uploading.banner)}
        class="flex flex-col gap-4 bg-white dark:bg-black border border-slate-300 dark:border-zinc-800 p-4 w-full h-32 rounded-xl"
      >
        {#if formData.banner}
          <img src={formData.banner} alt="" class="rounded-md mx-auto h-full" />
        {:else}
          <Icon
            src={DocumentPlus}
            size="48"
            class="text-slate-500 dark:text-zinc-500 mx-auto my-auto"
          />
        {/if}
      </button>
      {#if uploading.banner}
        <ImageUploadModal
          bind:open={uploading.banner}
          multiple={false}
          on:upload={(uploaded) => {
            uploading.banner = false
            formData.banner = uploaded.detail[0]
          }}
        />
      {/if}
    </div>
  </div>
  
    <!-- Рекомендации по дизайну обложки -->
    <div class="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-4">
      <h3 class="text-sm font-medium text-slate-900 dark:text-zinc-100 mb-2">
        Рекомендации для дизайна обложки сообщества:
      </h3>
      <ul class="text-xs text-slate-600 dark:text-zinc-400 space-y-1">
        <li>• Точное соотношение сторон: <strong>3:1</strong> (обязательно для правильного отображения)</li>
        <li>• Рекомендуемые размеры: 1200×400px, 1500×500px, 1800×600px</li>
        <li>• Обложка отображается с фиксированными пропорциями на всех устройствах — высота автоматически рассчитывается</li>
        <li>• Важные элементы размещайте по центру — края могут немного обрезаться при адаптации</li>
        <li>• Формат: любой (JPG, PNG, WebP), будет автоматически конвертирован в WebP</li>
      </ul>
    </div>
  <MarkdownEditor
    previewButton
    showFooter={false}
    label={$t('routes.admin.config.sidebar')}
    bind:value={formData.sidebar}
    required={true}
    class="relative"
    helperText="Кратко опишите, о чём это сообщество, чем оно полезно и какие темы здесь обсуждают. Этот текст будет виден на странице сообщества. Минимум 3 слова."
    error={formData.sidebar && !validateSidebar(formData.sidebar) 
      ? 'Текст должен содержать минимум 3 слова' 
      : undefined}
  />

  <Switch bind:checked={formData.nsfw}>{$t('post.badges.nsfw')}</Switch>
  <Switch bind:checked={formData.postsLockedToModerators}>
    {$t('form.onlyModeratorsCanPost')}
  </Switch>
  <Button
    submit
    color="primary"
    size="lg"
    class="mt-auto"
    loading={formData.submitting}
    disabled={formData.submitting}
  >
    {edit ? $t('common.save') : $t('form.submit')}
  </Button>
</form>
