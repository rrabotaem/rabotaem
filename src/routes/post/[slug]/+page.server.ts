import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
  // Получаем ID и проверяем, содержит ли URL слаг
  const parts = params.slug.split('-');
  const postId = parts[0];
  const hasSlug = parts.length > 1;
  
  // Если URL содержит только ID без слага
  if (!hasSlug) {
    try {
      // Получаем данные о посте
      const response = await fetch(`/api/post/${postId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Создаем слаг из названия поста
        const slug = createSlug(data.post.post_view.post.name);
        
        // Редирект на URL со слагом
        throw redirect(301, `/post/${postId}-${slug}`);
      }
    } catch (error) {
      // Если ошибка - это редирект, пробрасываем его дальше
      if (error instanceof Response && error.status === 301) {
        throw error;
      }
      // Иначе продолжаем загрузку с текущим URL
    }
  }
  
  // Продолжаем обычную загрузку
  // ... ваш существующий код загрузки данных
};

// Функция для создания слага из названия
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\wа-яё]+/g, '-') // Заменяем все спецсимволы на дефис
    .replace(/^-+|-+$/g, '') // Убираем дефисы в начале и конце
    .replace(/_/g, '-'); // Заменяем оставшиеся подчеркивания на дефисы
} 