import { profile } from '$lib/auth.js'
import { get } from 'svelte/store'
import { getClient } from '$lib/lemmy.js'
import { site as siteStore } from '$lib/lemmy'
import { isAdmin } from '$lib/components/lemmy/moderation/moderation.js'
import { redirect } from '@sveltejs/kit'

export async function load({ fetch }) {
  const currentProfile = get(profile)
  
  if (!currentProfile?.jwt) {
    redirect(302, '/login')
  }

  // Проверяем права администратора
  if (!currentProfile.user || !isAdmin(currentProfile.user)) {
    redirect(302, '/')
  }

  let site = get(siteStore)

  if (!site) {
    const res = await getClient(undefined, fetch).getSite()
    site = res
  }

  return {
    site: site,
  }
}
