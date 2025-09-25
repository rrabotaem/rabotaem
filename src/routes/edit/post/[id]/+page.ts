import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  if (!params.id || isNaN(parseInt(params.id))) {
    throw error(404, 'Post not found')
  }
  
  return {
    id: parseInt(params.id)
  }
} 