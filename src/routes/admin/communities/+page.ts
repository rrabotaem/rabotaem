import { getClient } from '$lib/lemmy.js'
import type { ListingType, SortType } from 'lemmy-js-client'

export async function load({ url, fetch }) {
  const page = Number(url.searchParams.get('page')) || 1
  const query = url.searchParams.get('q') || ''
  const sort = (url.searchParams.get('sort') as SortType) || 'TopAll'
  const type: ListingType = 'Local'

  const client = getClient({ func: fetch })

  const response =
    query.trim() !== ''
      ? await client.search({
          limit: 40,
          page: page,
          sort: sort,
          type_: 'Communities',
          listing_type: type,
          q: query,
        })
      : await client.listCommunities({
          limit: 40,
          page: page,
          sort: sort,
          type_: type,
        })

  return {
    communities: response.communities ?? [],
    page: page,
    query: query,
    sort: sort,
    type: type,
  }
}
