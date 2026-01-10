<script lang="ts">
  import { profile, profileData, setUserID } from '$lib/auth.js'
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte'
  import { ImageInput, Material, removeToast, toast } from 'mono-svelte'
  import { getClient } from '$lib/lemmy.js'
  import type { SaveUserSettings } from 'lemmy-js-client'
  import { Button, Switch, TextInput } from 'mono-svelte'
  import { uploadImage } from '$lib/util.js'
  import { t } from '$lib/translations.js'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { errorMessage } from '$lib/lemmy/error'

  export let inline: boolean = false
  export let data

  const DISPLAY_NAME_MAX_LENGTH = 100;
  const DISPLAY_NAME_MAX_BYTES = 300;
  const DISPLAY_NAME_REGEX = /^[а-яёА-ЯЁa-zA-Z0-9\s\-_]+$/;

  function getByteLength(str: string) {
    return new TextEncoder().encode(str).length;
  }

  let formData: Omit<SaveUserSettings, 'auth'> | undefined = {
    ...data.my_user?.local_user_view?.local_user,
    ...data.my_user?.local_user_view?.person,
  }

  let profileImage: FileList | undefined
  let bannerImage: FileList | undefined

  async function save() {
    if (!formData || !$profile?.jwt) return

    loading = true

    try {
      if (formData.display_name) {
        if (formData.display_name.length > DISPLAY_NAME_MAX_LENGTH) {
          throw new Error(`Отображаемое имя не должно превышать ${DISPLAY_NAME_MAX_LENGTH} символов`);
        }
        const byteLength = getByteLength(formData.display_name);
        if (byteLength > DISPLAY_NAME_MAX_BYTES) {
          throw new Error(`Имя слишком длинное. Используйте более короткое имя`);
        }
        if (!DISPLAY_NAME_REGEX.test(formData.display_name)) {
          throw new Error('Отображаемое имя может содержать только буквы, цифры, пробелы, дефис и подчеркивание');
        }
      }

      let pfp = profileImage
        ? await uploadImage(profileImage[0], $profile.instance, $profile.jwt)
        : undefined

      let banner = bannerImage
        ? await uploadImage(bannerImage[0], $profile.instance, $profile.jwt)
        : undefined

      const res = await getClient().saveUserSettings({
        ...formData,
        avatar: pfp,
        banner: banner,
      })

      toast({
        content: $t('toast.saveSettings'),
        type: 'success',
      })
    } catch (err) {
      toast({
        content: errorMessage(err),
        type: 'error',
      })
    }
    loading = false
  }

  let loading = false
</script>

<form class="flex flex-col gap-4 h-full" on:submit|preventDefault={save}>
  {#if !inline}
    <Header pageHeader>{$t('routes.profile.settings')}</Header>
  {/if}
  <slot />
  {#if data.my_user?.local_user_view?.local_user && formData}
    <TextInput label={$t('form.profile.email')} bind:value={formData.email} />
    <TextInput
      label={$t('form.profile.displayName')}
      bind:value={formData.display_name}
      placeholder="Optional"
      maxlength={DISPLAY_NAME_MAX_LENGTH}
      pattern={DISPLAY_NAME_REGEX.source}
      title="Используйте только буквы, цифры, пробелы, дефис и подчеркивание"
    />
    <MarkdownEditor
      images={false}
      bind:value={formData.bio}
      label={$t('form.profile.bio')}
      previewButton
    />
    <div class="flex gap-2 items-center *:flex-1">
      <ImageInput label={$t('form.profile.avatar')} bind:files={profileImage} />
      <ImageInput label={$t('form.profile.banner')} bind:files={bannerImage} />
    </div>
    
    <!-- Рекомендации по формату обложки профиля -->
    <div class="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-4">
      <h3 class="text-sm font-medium text-slate-900 dark:text-zinc-100 mb-2">
        Рекомендации для обложки профиля:
      </h3>
      <ul class="text-xs text-slate-600 dark:text-zinc-400 space-y-1">
        <li>• Точное соотношение сторон: <strong>3:1</strong> (обязательно для правильного отображения)</li>
        <li>• Рекомендуемые размеры: 1200×400px, 1500×500px, 1800×600px</li>
        <li>• Обложка отображается с фиксированными пропорциями на всех устройствах — высота автоматически рассчитывается</li>
        <li>• Важные элементы размещайте по центру — края могут немного обрезаться при адаптации</li>
        <li>• Формат: любой (JPG, PNG, WebP), будет автоматически конвертирован в WebP</li>
      </ul>
    </div>
    
    <Switch bind:checked={formData.show_nsfw}>
      {$t('form.profile.showNSFW')}
    </Switch>
    <Switch bind:checked={formData.show_scores}>
      {$t('form.profile.scores')}
    </Switch>
    <Switch bind:checked={formData.bot_account}>
      {$t('form.profile.bot')}
    </Switch>
    <Switch bind:checked={formData.show_bot_accounts}>
      {$t('form.profile.showBots')}
    </Switch>
    <Switch bind:checked={formData.show_read_posts}>
      {$t('form.profile.showRead')}
    </Switch>

    <Button
      submit
      size="lg"
      color="primary"
      class="mt-auto"
      {loading}
      disabled={loading}
    >
      {$t('common.save')}
    </Button>
  {/if}
</form>
