<script lang="ts">
  import { getClient } from '$lib/lemmy.js'
  import { Button, TextInput } from 'mono-svelte'
  import { DOMAIN_REGEX_FORMS } from '$lib/util.js'
  import { t } from '$lib/translations'
  import { errorMessage } from '$lib/lemmy/error'
  import ErrorContainer, { clearErrorScope, pushError } from '$lib/components/error/ErrorContainer.svelte'
  import { page } from '$app/stores'
  import { DEFAULT_INSTANCE_URL, LINKED_INSTANCE_URL } from '$lib/instance.js'
  import { toast } from 'mono-svelte'

  export let onBack: () => void

  let resetData = {
    instance: DEFAULT_INSTANCE_URL,
    email: '',
    loading: false,
  }

  async function handleReset() {
    resetData.loading = true
    clearErrorScope($page.route.id)

    try {
      resetData.instance = resetData.instance.trim()

      await getClient(resetData.instance).passwordReset({
        email: resetData.email.trim(),
      })

      toast({ content: $t('toast.resetLink'), type: 'success' })
      onBack()
    } catch (error) {
      pushError({
        message: errorMessage(error),
        scope: $page.route.id!,
      })
    }
    resetData.loading = false
  }
</script>

<form on:submit|preventDefault={handleReset} class="flex flex-col gap-5">
  <ErrorContainer class="pt-2" scope={$page.route.id} />

  <div class="flex flex-row w-full items-center gap-2">
    <TextInput
      id="email"
      type="email"
      bind:value={resetData.email}
      label={$t('form.email')}
      class="flex-1"
      required
    />
    {#if !LINKED_INSTANCE_URL}
      <TextInput
        id="instance_url"
        label={$t('form.instance')}
        placeholder={DEFAULT_INSTANCE_URL}
        disabled={LINKED_INSTANCE_URL != undefined}
        bind:value={resetData.instance}
        class="flex-1"
        required
        pattern={DOMAIN_REGEX_FORMS}
        autocorrect="off"
        autocapitalize="none"
      />
    {/if}
  </div>

  <Button
    loading={resetData.loading}
    disabled={resetData.loading}
    color="primary"
    size="lg"
    submit
  >
    {$t('form.submit')}
  </Button>

  <hr class="border-slate-200 dark:border-zinc-800" />
  
  <div class="flex flex-row items-center justify-center">
    <Button 
      rounding="pill" 
      color="ghost" 
      on:click={onBack}
      type="button"
      element="button"
    >
      {$t('common.back')}
    </Button>
  </div>
</form> 