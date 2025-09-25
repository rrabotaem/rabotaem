import { type GetSiteResponse, LemmyHttp } from 'lemmy-js-client'
import { get, writable } from 'svelte/store'
import { error } from '@sveltejs/kit'
import { instance } from '$lib/instance.js'
import { instanceToURL } from '$lib/util.js'
import { profile } from '$lib/auth.js'
import { toast } from 'mono-svelte'

export const site = writable<GetSiteResponse | undefined>(undefined)

const isURL = (input: RequestInfo | URL): input is URL =>
  typeof input == 'object' && 'searchParams' in input

const toURL = (input: RequestInfo | URL): URL | undefined => {
  if (isURL(input)) return input

  try {
    return new URL(input.toString())
  } catch (e) {
    return
  }
}

async function customFetch(
  func: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined,
  input: RequestInfo | URL,
  init?: RequestInit,
  auth?: string
): Promise<Response> {
  const f = func ? func : fetch
  
  init = init || {}
  init.headers = init.headers || {}
  
  const headers = init.headers as Record<string, string>
  
  if (!headers['Content-Type'] && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  if (auth) {
    headers['Authorization'] = `Bearer ${auth}`
  }

  if (init.body && auth && (init.method === 'POST' || init.method === 'PUT')) {
    try {
      if (!(init.body instanceof FormData)) {
        const body = JSON.parse(init.body.toString())
        body.auth = auth
        init.body = JSON.stringify(body)
      }
    } catch (e) {}
  }

  if (auth && (!init.method || init.method === 'GET')) {
    const url = new URL(input.toString())
    url.searchParams.append('auth', auth)
    input = url
  }

  const res = await f(input, init)
  
  if (!res.ok) {
    console.error('Response error:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    })
    const errorText = await res.text()
    error(res.status, errorText)
  }
  
  return res
}

export function client({
  instanceURL,
  func,
  auth,
}: {
  instanceURL?: string
  func?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  auth?: string
} = {}) {
  if (!instanceURL) instanceURL = get(profile).instance

  const jwt = auth || get(profile)?.jwt

  return new LemmyHttp(instanceToURL(instanceURL), {
    fetchFunction: (input, init) => customFetch(func, input, init, jwt),
    headers: {}
  })
}

export function getClient(
  options?: string | { 
    instanceURL?: string,
    auth?: string,
    func?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  }
): LemmyHttp {
  if (typeof options === 'string') {
    return client({ instanceURL: options })
  }

  return client({
    instanceURL: options?.instanceURL,
    auth: options?.auth,
    func: options?.func
  })
}

export const getInstance = () => encodeURIComponent(get(instance))

export async function validateInstance(instance: string): Promise<boolean> {
  if (instance == '') return false

  try {
    await getClient(instance).getSite()

    return true
  } catch (err) {
    return false
  }
}

export function mayBeIncompatible(
  minVersion: string,
  availableVersion: string
) {
  if (minVersion.valueOf() === availableVersion.valueOf()) return false

  const versionFormatter = /[\d.]/
  if (
    !minVersion.match(versionFormatter) ||
    !availableVersion.match(availableVersion)
  ) {
    return true
  }

  const splitMinVersion = minVersion.split('.')
  const splitAvailableVersion = availableVersion.split('.')

  if (splitMinVersion.length !== splitAvailableVersion.length) return true

  for (let i = 0; i < splitMinVersion.length; ++i) {
    const minVersionDigit = parseInt(splitMinVersion[i])
    const availableVersionDigit = parseInt(splitAvailableVersion[i])

    if (availableVersionDigit === undefined) return true
    if (minVersionDigit < availableVersionDigit) return false
    if (availableVersionDigit < minVersionDigit) return true
  }

  return false
}
