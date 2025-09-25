<script>
  import { t } from '$lib/translations'
  import { Button } from 'mono-svelte'

  import SidebarButton from '$lib/components/ui/sidebar/SidebarButton.svelte'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { page } from '$app/stores'

  const routes = [
    {
      name: $t('routes.profile.credentials'),
      url: '/profile/password',
    },
    {
      name: $t('form.profile.2fa.2fa'),
      url: '/profile/password/2fa',
    },
    {
      name: $t('routes.passwordChange.title'),
      url: '/profile/password/change',
    },
    {
      name: $t('routes.profile.logins'),
      url: '/profile/password/logins',
    },
    {
      name: $t('routes.profile.delete.title'),
      url: '/profile/password/delete',
    },
  ]
</script>

<Header pageHeader>
  {routes.find((r) => $page.url.pathname == r.url)?.name}
</Header>
<div class="w-full">
  <slot />
</div>
