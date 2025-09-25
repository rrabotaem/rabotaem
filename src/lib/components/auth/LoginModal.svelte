<script lang="ts">
  import { setUser } from '$lib/auth.js'
  import { Note, toast } from 'mono-svelte'
  import { t } from '$lib/translations'
  import { DEFAULT_INSTANCE_URL, LINKED_INSTANCE_URL } from '$lib/instance.js'
  import { getClient, mayBeIncompatible } from '$lib/lemmy.js'
  import { Button, TextInput, Modal } from 'mono-svelte'
  import { Icon, Identification, QuestionMarkCircle, UserCircle } from 'svelte-hero-icons'
  import { DOMAIN_REGEX_FORMS } from '$lib/util.js'
  import { MINIMUM_VERSION } from '$lib/version.js'
  import { errorMessage } from '$lib/lemmy/error'
  import ErrorContainer, { clearErrorScope, pushError } from '$lib/components/error/ErrorContainer.svelte'
  import { page } from '$app/stores'
  import { site } from '$lib/lemmy'
  import SignupForm from './SignupForm.svelte'
  import ResetPasswordForm from './ResetPasswordForm.svelte'

  export let open = false
  
  let isSignupMode = false
  let isResetMode = false
  let loginData = {
    instance: DEFAULT_INSTANCE_URL,
    username: '',
    password: '',
    loading: false,
    attempts: 0,
  }

  function handleSuccessfulAuth() {
    open = false
    loginData = {
      instance: DEFAULT_INSTANCE_URL,
      username: '',
      password: '',
      loading: false,
      attempts: 0,
    }
  }

  async function handleLogin() {
    loginData.loading = true
    clearErrorScope($page.route.id)

    try {
      loginData.instance = loginData.instance.trim()

      const response = await getClient(loginData.instance).login({
        username_or_email: loginData.username.trim(),
        password: loginData.password,
      })

      if (response?.jwt) {
        const result = await setUser(response.jwt, loginData.instance, loginData.username)

        if (result) {
          toast({ content: 'Вы успешно вошли', type: 'success' })
          open = false
          loginData = {
            instance: DEFAULT_INSTANCE_URL,
            username: '',
            password: '',
            loading: false,
            attempts: 0,
          }
        }
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      pushError({
        message: JSON.parse((error as any)?.body?.message ?? '{}')?.error == 'incorrect_login'
          ? errorMessage('incorrect_login' + (loginData.attempts == 0 || loginData.attempts >= 12 ? '' : `_${loginData.attempts + 1}`))
          : errorMessage(error),
        scope: $page.route.id!,
      })
      loginData.attempts++
    }
    loginData.loading = false
  }

  function handleSignupClick(e: Event) {
    e.stopPropagation();
    isSignupMode = true;
  }

  function handleLoginClick(e: Event) {
    e.stopPropagation();
    isSignupMode = false;
  }

  function handleModalClose() {
    open = false;
    isSignupMode = false;
    isResetMode = false;
    loginData = {
      instance: DEFAULT_INSTANCE_URL,
      username: '',
      password: '',
      loading: false,
      attempts: 0,
    }
  }

  function handleResetClick(e: Event) {
    e.stopPropagation();
    isResetMode = true;
    isSignupMode = false;
  }

  function handleBackClick() {
    isResetMode = false;
    isSignupMode = false;
  }
</script>

<Modal 
  bind:open
  dismissable
  on:close={handleModalClose}
>
  {#if isResetMode}
    <ResetPasswordForm onBack={handleBackClick} />
  {:else if isSignupMode}
    <SignupForm onSuccess={handleSuccessfulAuth} />
    <hr class="border-slate-200 dark:border-zinc-800 mt-5" />
    <div class="flex flex-row items-center justify-center mt-5">
      <Button 
        rounding="pill" 
        color="ghost" 
        on:click={handleLoginClick}
        type="button"
        element="button"
      >
        У вас уже есть аккаунт?
      </Button>
    </div>
  {:else}
    <h2 
      class="text-xl font-roboto font-medium text-center"
    >
      {$t('auth.login')}
    </h2>
    <form on:submit|preventDefault={handleLogin} class="flex flex-col gap-5">
      <div class="flex flex-col">
        {#if $site?.site_view?.site?.icon}
          <div class="flex justify-center mb-4">
            <img 
              src={$site.site_view.site.icon} 
              alt="Site icon" 
              class="w-24 h-24 rounded-xl"
            />
          </div>
        {/if}
        
        {#if $site && mayBeIncompatible(MINIMUM_VERSION, $site.version.replace('v', ''))}
          <Note>
            Для работы требуется Lemmy версии v{MINIMUM_VERSION} или выше
          </Note>
        {/if}
        <ErrorContainer class="pt-2" scope={$page.route.id} />
      </div>

      <div class="flex flex-row w-full items-center gap-2">
        <TextInput
          id="username"
          bind:value={loginData.username}
          label="Ваш Email"
          class="flex-1"
          required
        />
        {#if !LINKED_INSTANCE_URL}
          <TextInput
            id="instance_url"
            label="Инстанс"
            placeholder={DEFAULT_INSTANCE_URL}
            disabled={LINKED_INSTANCE_URL != undefined}
            bind:value={loginData.instance}
            class="flex-1"
            required
            pattern={DOMAIN_REGEX_FORMS}
            autocorrect="off"
            autocapitalize="none"
          />
        {/if}
      </div>

      <TextInput
        id="password"
        bind:value={loginData.password}
        label="Пароль"
        type="password"
        minlength={10}
        maxlength={60}
        required
        class="w-full"
      />

      <Button
        loading={loginData.loading}
        disabled={loginData.loading}
        color="primary"
        size="lg"
        submit
      >
        Войти
      </Button>
    </form>
    <hr class="border-slate-200 dark:border-zinc-800" />
    <div class="flex flex-row items-center justify-center gap-4 mt-5">
      <Button 
        rounding="pill" 
        color="ghost" 
        on:click={handleSignupClick}
        type="button"
        element="button"
      >
        <Icon src={Identification} mini size="16" />
        Регистрация
      </Button>
      <Button 
        rounding="pill" 
        color="ghost" 
        on:click={handleResetClick}
        type="button"
        element="button"
      >
        <Icon src={QuestionMarkCircle} mini size="16" />
        Забыли пароль?
      </Button>
      {#if !LINKED_INSTANCE_URL}
        <Button rounding="pill" color="ghost" href="/login/guest">
          <Icon src={UserCircle} mini size="16" />
          Гостевой вход
        </Button>
      {/if}
    </div>
  {/if}
</Modal> 