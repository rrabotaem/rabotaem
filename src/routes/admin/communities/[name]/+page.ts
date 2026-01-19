import { getClient } from '$lib/lemmy.js'

export async function load({ params, fetch }) {
  const community = await getClient({ func: fetch }).getCommunity({
    name: params.name,
  })

  return {
    community: community,
  }
}
