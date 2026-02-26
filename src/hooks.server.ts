import { env } from '$env/dynamic/public'

export async function handle({ event, resolve }) {
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%favicon%', env.PUBLIC_FAVICON ?? '/img/logo-background.svg'),
  })
}
