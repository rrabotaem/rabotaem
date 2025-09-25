import type { SortType } from 'lemmy-js-client'

// Прогрессия сортировки Top от самого узкого к самому широкому периоду
export const TOP_SORT_PROGRESSION: SortType[] = [
  'TopHour',
  'TopSixHour', 
  'TopTwelveHour',
  'TopDay',
  'TopWeek',
  'TopMonth',
  'TopThreeMonths',
  'TopSixMonths',
  'TopNineMonths',
  'TopAll'
]

/**
 * Получает следующий тип сортировки в прогрессии
 * @param currentSort - текущий тип сортировки
 * @returns следующий тип сортировки или null, если достигнут конец прогрессии
 */
export function getNextTopSort(currentSort: SortType): SortType | null {
  const currentIndex = TOP_SORT_PROGRESSION.indexOf(currentSort)
  
  if (currentIndex === -1 || currentIndex === TOP_SORT_PROGRESSION.length - 1) {
    return null // Достигнут конец прогрессии или не Top сортировка
  }
  
  return TOP_SORT_PROGRESSION[currentIndex + 1]
}

/**
 * Проверяет, является ли сортировка Top сортировкой с ограниченным периодом
 * @param sort - тип сортировки
 * @returns true, если это Top сортировка с ограниченным периодом
 */
export function isLimitedTopSort(sort: SortType): boolean {
  return sort.startsWith('Top') && sort !== 'TopAll'
}

/**
 * Получает прогрессию от текущей сортировки до TopAll
 * @param currentSort - текущий тип сортировки
 * @returns массив типов сортировки от текущего до TopAll
 */
export function getSortProgression(currentSort: SortType): SortType[] {
  const currentIndex = TOP_SORT_PROGRESSION.indexOf(currentSort)
  
  if (currentIndex === -1) {
    return []
  }
  
  return TOP_SORT_PROGRESSION.slice(currentIndex)
} 