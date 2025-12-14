<script lang="ts">
  import { setUser } from '$lib/auth.js'
  import { Note, toast } from 'mono-svelte'
  import { t } from '$lib/translations'
  import { DEFAULT_INSTANCE_URL, LINKED_INSTANCE_URL } from '$lib/instance.js'
  import { getClient } from '$lib/lemmy.js'
  import { Button, TextInput } from 'mono-svelte'
  import { DOMAIN_REGEX_FORMS } from '$lib/util.js'
  import { errorMessage } from '$lib/lemmy/error'
  import ErrorContainer, { clearErrorScope, pushError } from '$lib/components/error/ErrorContainer.svelte'
  import { page } from '$app/stores'
  import { getRandomDefaultAvatar } from '$lib/util.js'
  import { goto } from '$app/navigation'

  export let onSuccess: () => void

  const DISPLAY_NAME_MAX_LENGTH = 100;
  const DISPLAY_NAME_MAX_BYTES = 300;
  const DISPLAY_NAME_REGEX = /^[а-яёА-ЯЁa-zA-Z0-9\s\-_]+$/;

  let signupData = {
    username: '',
    displayName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    loading: false,
  }

  function getByteLength(str: string) {
    return new TextEncoder().encode(str).length;
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
    
    return text.split('').map(char => ru2en[char] || char).join('');
  }

  async function getNextUserId(): Promise<number> {
    try {
      // Используем getPersonDetails для получения последнего пользователя
      const response = await getClient(DEFAULT_INSTANCE_URL).getPosts({
        type_: "All",
        sort: "Old",
        limit: 1,
        page: 1
      });
      
      // Если не удалось получить ID, используем timestamp
      return Math.floor(Date.now() / 1000);
    } catch (error) {
      console.error('Error getting next user ID:', error);
      return Math.floor(Date.now() / 1000);
    }
  }

  async function handleSubmit() {
    signupData.loading = true;
    clearErrorScope($page.route.id);

    try {
      if (signupData.password !== signupData.passwordConfirm) {
        throw new Error('Passwords do not match');
      }

      // Валидация display name
      if (signupData.displayName) {
        if (signupData.displayName.length > DISPLAY_NAME_MAX_LENGTH) {
          throw new Error('display_name_too_long');
        }
        const byteLength = getByteLength(signupData.displayName);
        if (byteLength > DISPLAY_NAME_MAX_BYTES) {
          throw new Error('display_name_byte_length_exceeded');
        }
        if (!DISPLAY_NAME_REGEX.test(signupData.displayName)) {
          throw new Error('display_name_invalid_chars');
        }
      }

      const displayName = signupData.displayName;
      console.log('1. Display name:', displayName);

      // Генерируем безопасный username
      let safeUsername = displayName
        .toLowerCase()
        .replace(/[^а-яёa-z0-9\s]/g, '') // Оставляем только буквы, цифры и пробелы
        .trim()
        .replace(/\s+/g, '_'); // Заменяем пробелы на подчеркивания

      // Транслитерируем после базовой очистки
      const transliteratedName = transliterate(safeUsername)
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 15); // Ограничиваем длину

      console.log('2. Transliterated name:', transliteratedName);

      // Если после всех преобразований строка пустая, используем запасной вариант
      if (!transliteratedName) {
        safeUsername = 'user';
      } else {
        safeUsername = transliteratedName;
      }

      const randomSuffix = Math.random().toString(36).substring(2, 5);
      const username = `${safeUsername}_${randomSuffix}`;
      console.log('3. Final username:', username);

      const response = await getClient(DEFAULT_INSTANCE_URL).register({
        username: username,
        password: signupData.password,
        password_verify: signupData.passwordConfirm,
        email: signupData.email.trim() || undefined,
        show_nsfw: false,
      });

      if (response?.jwt) {
        console.log('4. Registration successful, got JWT:', response.jwt);
        
        try {
          // Сначала устанавливаем пользователя
          const result = await setUser(
            response.jwt, 
            DEFAULT_INSTANCE_URL, 
            username
          );

          if (result) {
            // Создаем клиент с правильной аутентификацией
            const authenticatedClient = getClient(DEFAULT_INSTANCE_URL);
            authenticatedClient.setHeaders({
              'Authorization': `Bearer ${response.jwt}`
            });

            // Сохраняем только настройки пользователя без аватара
            const saveResponse = await authenticatedClient.saveUserSettings({
              display_name: displayName,
              show_nsfw: false,
              theme: 'light',
              default_sort_type: 'Active',
              interface_language: 'ru'
            });
            console.log('5. Save user settings response:', saveResponse);

            toast({ content: $t('toast.signup'), type: 'success' });
            onSuccess();

            // Перезагружаем страницу для обновления данных
            window.location.reload();
          }
        } catch (err) {
          console.error('Failed to set display name:', err);
          throw err;
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      pushError({
        message: errorMessage(error),
        scope: $page.route.id!,
      });
    }
    signupData.loading = false;
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-5">
  <ErrorContainer class="pt-2" scope={$page.route.id} />

  <TextInput
    bind:value={signupData.displayName}
    label={$t('form.displayName')}
    placeholder="Шальная императрица"
    class="w-full"
    required
    maxlength={DISPLAY_NAME_MAX_LENGTH}
    pattern={DISPLAY_NAME_REGEX.source}
    title="Используйте только буквы, цифры, пробелы, дефис и подчеркивание"
  />

  <TextInput
    id="email"
    type="email"
    bind:value={signupData.email}
    label={$t('form.email')}
    class="w-full"
  />

  <div class="flex flex-row gap-2">
    <TextInput
      id="password"
      bind:value={signupData.password}
      label={$t('form.password')}
      type="password"
      minlength={10}
      maxlength={60}
      required
      class="w-full"
    />
    <TextInput
      id="password_confirm"
      bind:value={signupData.passwordConfirm}
      label={$t('form.passwordConfirm')}
      type="password"
      minlength={10}
      maxlength={60}
      required
      class="w-full"
    />
  </div>

  <Button
    loading={signupData.loading}
    disabled={signupData.loading}
    color="primary"
    size="lg"
    submit
  >
    {$t('account.signup')}
  </Button>
</form> 