/**
 * Утилиты для работы со слоганами (taglines)
 */

/**
 * Санитизирует HTML контент для безопасного отображения
 */
export function sanitizeHtml(html: string): string {
  // Базовая санитизация - удаляем потенциально опасные теги и атрибуты
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
}

/**
 * Получает случайный слоган из массива слоганов сайта
 * @param taglines - массив слоганов
 * @returns случайный слоган или пустую строку
 */
export function getRandomTagline(taglines: string[]): string {
  if (!taglines || taglines.length === 0) {
    return ''
  }
  
  const randomIndex = Math.floor(Math.random() * taglines.length)
  return taglines[randomIndex]
}

/**
 * Получает случайный слоган из данных сайта Lemmy
 * @param siteData - данные сайта из API Lemmy
 * @returns случайный слоган или пустую строку
 */
export function getRandomTaglineFromSite(siteData: any): string {
  // Проверяем оба возможных места: siteData.taglines и siteData.site_view.taglines
  let taglines = siteData?.taglines || siteData?.site_view?.taglines;
  
  if (!taglines || !Array.isArray(taglines)) {
    return ''
  }
  
  const taglineContents = taglines
    .map((t: any) => t.content)
    .filter(Boolean)
    .map(content => sanitizeHtml(content)) // Санитизируем каждый слоган
  
  return getRandomTagline(taglineContents);
}

/**
 * Проверяет, есть ли доступные слоганы
 * @param siteData - данные сайта из API Lemmy
 * @returns true, если есть доступные слоганы
 */
export function hasTaglines(siteData: any): boolean {
  // Проверяем оба возможных места: siteData.taglines и siteData.site_view.taglines
  const taglines = siteData?.taglines || siteData?.site_view?.taglines;
  
  return taglines && 
         Array.isArray(taglines) && 
         taglines.length > 0
}
