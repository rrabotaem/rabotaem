import { t } from '$lib/translations'

export function errorMessage(error: any, instance?: string): string {
  try {
    let errorKey: string | undefined

    // Если ошибка - строка, попробуем распарсить её как JSON
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error)
        if (parsed.message) {
          try {
            const messageParsed = JSON.parse(parsed.message)
            errorKey = messageParsed.error
          } catch {
            errorKey = parsed.message
          }
        } else {
          errorKey = parsed.error
        }
      } catch {
        errorKey = error
      }
    } else if (error?.body?.message) {
      // Если ошибка в формате {body: {message: "..."}}
      try {
        const messageParsed = JSON.parse(error.body.message)
        errorKey = messageParsed.error
      } catch {
        errorKey = error.body.message
      }
    } else if (error?.body?.error) {
      // Если ошибка в формате {body: {error: "..."}}
      errorKey = error.body.error
    } else if (error?.message) {
      // Если ошибка в формате {message: "..."}
      try {
        const messageParsed = JSON.parse(error.message)
        errorKey = messageParsed.error
      } catch {
        errorKey = error.message
      }
    } else if (error?.error && typeof error?.error === 'string') {
      errorKey = error.error
    }

    if (!errorKey) throw new Error('No error key found')

    // Ищем перевод ошибки
    const translation = t.get(`error.${errorKey}`)
    if (translation && translation !== `error.${errorKey}`) {
      return translation
    }

    // Если перевод не найден, возвращаем ключ ошибки
    return errorKey
  } catch (e) {
    // В случае ошибки возвращаем исходную ошибку как строку
    return typeof error === 'string' ? error : JSON.stringify(error)
  }
}
