<script lang="ts">
  import Markdown from '$lib/components/markdown/Markdown.svelte'
  import type { View } from '$lib/settings'
  import { Button } from 'mono-svelte'
  import { ChevronDown, Icon } from 'svelte-hero-icons'
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { deserializeEditorModel } from '$lib/util'
  
  let DOMPurify: any
  let parser: any
  
  if (browser) {
    // Динамический импорт DOMPurify только на клиенте
    import('dompurify').then(module => {
      DOMPurify = module.default
    })
  } else {
    // Импорт jsdom для серверной обработки
    import('jsdom').then(module => {
      const { JSDOM } = module.default
      parser = new JSDOM().window.DOMParser
    })
  }

  export let body: string
  export let view: View = 'cozy'
  export let clickThrough = false
  
  let htmlElement = 'div'

  export { htmlElement as element }

  let expanded = true
  let element: Element
  let isFirstImage = true;
  let firstImageUrl: string | null = null;
  let firstImageSrcset: string | null = null;
  let hasPreview = false;

  function isOverflown(element: Element, body: string = '') {
    if (!element) return
    let overflows =
      element.scrollHeight > element.clientHeight ||
      element.scrollWidth > element.clientWidth

    if (!overflows) expanded = true
    else expanded = false

    return overflows
  }

  $: processedBody = extractPreviewContent(body)
  // $: overflows = isOverflown(element, body)

  $: overflows = isOverflown(element, processedBody)

  // Функция для добавления preload в head
  function addPreloadLink(url: string, srcset: string | null = null) {
    if (!browser) return;
    
    // Удаляем предыдущий preload, если он есть
    const existingLink = document.querySelector('link[rel="preload"][as="image"][data-post-image]');
    if (existingLink) {
      existingLink.remove();
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.setAttribute('data-post-image', '');
    if (srcset) {
      link.setAttribute('imagesrcset', srcset);
    }
    // Добавляем высокий приоритет
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
  }

  function isJsonContent(content: string): boolean {
    // Пропускаем пустые строки
    if (!content || content.trim() === '') {
      return false;
    }

    // Если контент начинается с < и заканчивается на >, это вероятно HTML
    if (content.trim().startsWith('<') && content.trim().endsWith('>')) {
      return false;
    }

    try {
      // Сначала пробуем парсить как обычный JSON
      const parsed = JSON.parse(content);
      return parsed && typeof parsed === 'object' && 'blocks' in parsed;
    } catch {
      try {
        // Проверяем, похоже ли это на base64
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(content);
        
        if (!isBase64) {
          return false;
        }
        
        // Если похоже на base64, пробуем десериализовать
        const decoded = deserializeEditorModel(content);
        return decoded && typeof decoded === 'object' && 'blocks' in decoded;
      } catch {
        return false;
      }
    }
  }

  function processJsonBlock(block: any): string {
    switch (block.type) {
      case 'paragraph':
        return `<p>${block.data.text}</p>`;
      case 'header':
        return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
      case 'list':
        const listClass = block.data.style === 'checklist' ? 'checklist' : '';
        const items = block.data.items.map((item: any) => 
          `<li>${block.data.style === 'checklist' 
            ? `<input type="checkbox" ${item.meta.checked ? 'checked' : ''} disabled> `
            : ''}${item.content}</li>`
        ).join('');
        return block.data.style === 'ordered' 
          ? `<ol>${items}</ol>` 
          : `<ul class="${listClass}">${items}</ul>`;
      case 'quote':
        return `<blockquote>
          <p>${block.data.text}</p>
          ${block.data.caption ? `<footer>${block.data.caption}</footer>` : ''}
        </blockquote>`;
      case 'code':
        return `<pre><code>${block.data.code}</code></pre>`;
      case 'image':
        return processImage(block.data.file.url, '', block.data.file.alt || '', block.data.file.title || '', block.data.file.caption || '');
      case 'gallery':
        return `<div class="post-gallery">
          <div class="gallery-images">
            ${block.data.images.map((img: any, index: number) => 
              `<div class="gallery-item" ${index > 0 ? 'style="display: none;"' : ''}>
                ${processImage(img.url, '', img.alt || '', img.title || '')}
                ${img.alt ? `<div class="gallery-alt-text">${img.alt}</div>` : ''}
              </div>`
            ).join('')}
          </div>
        </div>`;
      case 'link':
      case 'customLink':
        const url = block.data.url || '#';
        const text = block.data.text || block.data.title || url;
        const isExternal = url.startsWith('http');
        const target = isExternal ? ' target="_blank" rel="noopener"' : '';
        const linkStyle = block.data.style || 'link';
        return `<p class="text-center"><a href="${url}"${target} class="${linkStyle}">${text}</a></p>`;
      default:
        return '';
    }
  }

  function convertJsonToHtml(jsonContent: string): string {
    try {
      let content;
      
      // Пробуем парсить как обычный JSON
      try {
        content = JSON.parse(jsonContent);
      } catch {
        // Если не получилось, пробуем десериализовать из base64
        content = deserializeEditorModel(jsonContent);
      }
      
      if (!content.blocks) return '';
      
      // Обрабатываем мета-информацию
      const previewImage = content.additional?.previewImage 
        ? `<preview-image>${content.additional.previewImage}</preview-image>` 
        : '';
      const previewDescription = content.additional?.previewDescription 
        ? `<preview-description>${content.additional.previewDescription}</preview-description>` 
        : '';
      const metaTitle = content.additional?.metaTitle 
        ? `<meta-title>${content.additional.metaTitle}</meta-title>` 
        : '';
      const metaDescription = content.additional?.metaDescription 
        ? `<meta-description>${content.additional.metaDescription}</meta-description>` 
        : '';
        
      const htmlContent = content.blocks
        .map((block: any) => processJsonBlock(block))
        .join('\n');
        
      return `${previewImage}${previewDescription}${metaTitle}${metaDescription}${htmlContent}`;
    } catch (error) {
      console.error('Error converting JSON to HTML:', error);
      return '';
    }
  }

  function processImage(imgUrl: string, content: string = '', alt: string = '', title: string = '', caption: string = '') {
    if (imgUrl.includes('pictrs')) {
      // Очищаем URL от всех параметров
      const baseUrl = imgUrl.split('?')[0];
      
      // Базовые параметры для всех изображений
      const baseParams = 'format=webp&quality=80';
      
      // Формируем URL с параметрами
      const getImageUrl = (size: number) => {
        return `${baseUrl}?${baseParams}&thumbnail=${size}`;
      };
      
      // Используем минимальный размер для src
      const minSize = 240;
      const minImageUrl = getImageUrl(minSize);
      
      // Оптимизированные размеры для разных устройств
      // 240px для мобильных (1x)
      // 480px для стандартных экранов (достаточно для max-width: 640px)
      // 960px для ретина-дисплеев (2x)
      const sizes = [240, 480, 960];
      const srcset = sizes
        .map(size => `${getImageUrl(size)} ${size}w`)
        .join(', ');
      
      // Указываем точные размеры для разных брейкпоинтов
      // (max-width: 640px) - мобильные устройства
      // (min-width: 641px) - планшеты и десктопы
      const sizesAttr = '(max-width: 640px) 240px, (min-width: 641px) 480px';
      
      // Определяем атрибуты загрузки в зависимости от позиции изображения
      let loadingAttrs = '';
      
      if (isFirstImage) {
        // Первое изображение загружаем с высоким приоритетом и без ленивой загрузки
        loadingAttrs = 'fetchpriority="high"';
        firstImageUrl = minImageUrl;
        firstImageSrcset = srcset;
      } else {
        // Для остальных изображений используем ленивую загрузку
        // Но только если они не в первых 1000 символах контента
        const imagePosition = content.indexOf(imgUrl);
        if (imagePosition > 1000) {
          loadingAttrs = 'loading="lazy"';
        }
      }
      
      isFirstImage = false;
      
      // Добавляем alt, title и caption к атрибутам
      const altAttr = alt ? `alt="${alt}"` : 'alt="Post image"';
      const titleAttr = title ? `title="${title}"` : '';
      const captionHtml = caption ? `<div class="image-alt-text">${caption}</div>` : '';
      
      const imgHtml = `<img 
        src="${minImageUrl}" 
        srcset="${srcset}" 
        sizes="${sizesAttr}" 
        ${loadingAttrs}
        ${altAttr}
        ${titleAttr}
        class="w-full h-auto">
        ${captionHtml}`;

      return imgHtml;
    }
    return `<img src="${imgUrl}" ${alt ? `alt="${alt}"` : 'alt="Post image"'} ${title ? `title="${title}"` : ''} class="w-full h-auto">`;
  }

  // Добавляем функцию для определения, находится ли изображение выше сгиба
  function isAboveTheFold(imageUrl: string, content: string): boolean {
    // Если это первое изображение, считаем его выше сгиба
    if (isFirstImage) return true;
    
    // Проверяем позицию изображения в контенте
    const imagePosition = content.indexOf(imageUrl);
    // Если изображение находится в первых 1000 символах, считаем его выше сгиба
    return imagePosition <= 1000;
  }

  function extractPreviewContent(html: string) {
    // Проверяем, является ли контент JSON или base64
    if (isJsonContent(html)) {
      try {
        let content;
        
        // Пробуем парсить как обычный JSON
        try {
          content = JSON.parse(html);
        } catch {
          // Если не получилось, пробуем десериализовать из base64
          content = deserializeEditorModel(html);
        }
        
        // Если есть превью изображение или описание, показываем только их
        if (content?.additional?.previewImage || content?.additional?.previewDescription) {
          let previewContent = '';

          // Сначала добавляем изображение превью, если оно есть
          if (content.additional.previewImage?.trim()) {
            previewContent += processImage(
              content.additional.previewImage.trim(),
              '',
              'Preview image'
            );
          }

          // Затем добавляем описание превью, если оно есть
          if (content.additional.previewDescription?.trim()) {
            previewContent += `<p>${content.additional.previewDescription.trim()}</p>`;
          }

          hasPreview = true;
          return `${previewContent}`;
        }
        
        // Если нет превью, конвертируем весь контент
        hasPreview = false;
        return convertJsonToHtml(html);
      } catch (error) {
        console.error('Error processing JSON content:', error);
        return html;
      }
    }

    // Существующая логика для HTML
    const imageRegex = /<preview-image>(.*?)<\/preview-image>/is;
    const descriptionRegex = /<preview-description>(.*?)<\/preview-description>/is;
    
    const imageMatch = html.match(imageRegex);
    const descriptionMatch = html.match(descriptionRegex);
    
    let content = '';
    
    // Сначала добавляем изображение, если оно есть
    if (imageMatch && imageMatch[1].trim()) {
      const imageUrl = imageMatch[1].trim();
      content += processImage(imageUrl, content);
    }

    // Затем добавляем описание, если оно есть
    if (descriptionMatch && descriptionMatch[1].trim()) {
      content += `<p>${descriptionMatch[1].trim()}</p>`;
    }
    
    // Если есть превью теги, устанавливаем флаг hasPreview
    hasPreview = !!(imageMatch || descriptionMatch);
    
    // Если нет превью тегов, обрабатываем обычный HTML
    if (!content) {
      // Создаем временный div для парсинга HTML
      const tempDiv = browser ? document.createElement('div') : null;
      if (tempDiv) {
        tempDiv.innerHTML = html;
        
        // Ищем первое изображение
        const firstImg = tempDiv.querySelector('img');
        if (firstImg) {
          content += processImage(firstImg.src, html, firstImg.alt || '', firstImg.title || '');
        }
        
        // Добавляем первый параграф текста
        const firstP = tempDiv.querySelector('p');
        if (firstP && firstP.textContent) {
          content += `<p>${firstP.textContent.slice(0, 300)}${firstP.textContent.length > 300 ? '...' : ''}</p>`;
        } else {
          // Если нет параграфа, берем первые 300 символов текста
          const text = tempDiv.textContent || '';
          content += `<p>${text.slice(0, 300)}${text.length > 300 ? '...' : ''}</p>`;
        }
      } else {
        // Для серверного рендеринга возвращаем оригинальный HTML
        content = html;
      }
    }
    
    return content || html;
  }

  function sanitizeHtml(html: string) {
    if (browser && DOMPurify) {
      // Обрабатываем изображения
      const processedHtml = html.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, (match, src) => {
        return processImage(src, html);
      });

      return DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'br', 'ul', 'ol', 'li', 'img', 'figure', 'figcaption', 'blockquote', 'footer'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'srcset', 'sizes', 'loading', 'alt', 'width', 'height', 'class']
      });
    }
    // Если мы на сервере или DOMPurify еще не загружен, возвращаем исходный HTML
    return html;
  }

  // Сбрасываем флаг при изменении body
  $: {
    isFirstImage = true;
    firstImageUrl = null;
    firstImageSrcset = null;
    hasPreview = false;
    processedBody = extractPreviewContent(body);
  }

  // Добавляем preload для первого изображения
  $: if (firstImageUrl && browser) {
    addPreloadLink(firstImageUrl, firstImageSrcset);
  }

  // Добавляем preload в head при SSR
  export function preloadData() {
    if (!browser && firstImageUrl) {
      return `
        <link 
          rel="preload" 
          as="image" 
          href="${firstImageUrl}" 
          ${firstImageSrcset ? `imagesrcset="${firstImageSrcset}"` : ''} 
          fetchpriority="high"
          data-post-image
        />
      `;
    }
    return '';
  }

</script>

<svelte:element
  this={htmlElement}
  style={$$props.style ?? ''}
  class="{!expanded
    ? ` overflow-hidden
bg-gradient-to-b text-transparent from-slate-600 via-slate-600
dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-400 bg-clip-text z-0
${view == 'list' ? `max-h-24` : 'max-h-48'}`
    : 'text-slate-600 dark:text-zinc-400 max-h-full'} {!hasPreview ? 'set-max-height' : ''} text-base {$$props.class ??
    ''} {overflows && !hasPreview ? 'has-overflow' : ''}"
  class:pointer-events-none={!clickThrough}
  bind:this={element}
>
  <!-- {@html sanitizeHtml(expanded ? processedBody : processedBody.slice(0, 1000))} -->
  {@html sanitizeHtml(processedBody)}
  
  <!--
  {#if overflows}
    <Button
      on:click={() => (expanded = !expanded)}
      size="square-sm"
      color="tertiary"
      class="text-black dark:text-white absolute z-10 isolate pointer-events-auto bottom-0 {expanded
        ? 'bg-slate-200/50 dark:bg-zinc-900 border shadow-md'
        : ''} left-1/2 -translate-x-1/2 mb-4"
      title="Expand"
    >
      <Icon
        src={ChevronDown}
        size="20"
        mini
        class="{expanded ? 'rotate-180' : ''} transition-transform"
      />
    </Button>
  {/if}
  -->
</svelte:element>

<style lang="postcss">
  .set-max-height {
    max-height: 600px;
    position: relative;
    overflow: hidden;
  }
  
  .set-max-height.has-overflow::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(to bottom, transparent, rgb(255 255 255));
  }

  :global(.dark) .set-max-height.has-overflow::after {
    background: linear-gradient(to bottom, transparent, #202532);
  }

  .custom-gradient {
    background: linear-gradient(to bottom, 
      rgb(243 244 246) 0%, 
      rgb(229 231 235) 50%, 
      rgb(156 163 175) 100%
    ) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    color: transparent !important;
  }

  :global(.dark) .custom-gradient {
    background: linear-gradient(to bottom, 
      rgb(243 244 246) 0%, 
      rgb(229 231 235) 30%, 
      rgb(156 163 175) 70%, 
      rgb(107 114 128) 100%
    ) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    color: transparent !important;
  }

  .test-gradient {
    background: linear-gradient(to bottom, 
      rgb(239 68 68) 0%, 
      rgb(234 179 8) 50%, 
      rgb(34 197 94) 100%
    ) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    color: transparent !important;
  }

  :global(.post-content pre) {
    @apply bg-slate-100 dark:bg-zinc-800 rounded-lg p-4 my-4 overflow-x-auto;
  }

  :global(.post-content pre code) {
    @apply font-mono text-sm text-slate-800 dark:text-zinc-200;
  }

  :global(.post-content blockquote) {
    @apply border-l-4 pl-4 my-4;
    border-left-color: rgb(234 88 12 / var(--tw-bg-opacity, 1));
  }

  :global(.dark .post-content blockquote) {
    @apply border-zinc-700;
  }

  /* Стили для параграфов в PostBody */
  :global(.post-content p) {
    margin: 1rem 0;
  }

  :global(.post-content blockquote footer) {
    @apply mt-2 text-sm text-slate-500 dark:text-zinc-400 not-italic;
  }

  :global(.post-content ul) {
    @apply list-disc list-outside pl-6 my-4 space-y-2;
  }

  :global(.post-content ol) {
    @apply list-decimal list-outside pl-6 my-4 space-y-2;
  }

  :global(.post-content ul.checklist) {
    @apply list-none;
  }

  :global(.post-content ul.checklist li) {
    @apply flex items-start;
  }

  :global(.post-content ul.checklist li input[type="checkbox"]) {
    @apply -ml-6 mr-2 rounded border-slate-300 dark:border-zinc-600 
    text-blue-600 dark:text-blue-400
    focus:ring-blue-500 dark:focus:ring-blue-400;
  }

  :global(.post-content .link) {
    @apply text-blue-600 dark:text-blue-400 hover:underline;
  }

  :global(.post-content .btn-primary) {
    background-color: var(--btn-primary-background);
    color: var(--btn-primary-color);
    border: 1px solid var(--btn-primary-border);
    border-radius: var(--btn-primary-border-radius);
    padding: var(--btn-primary-padding-y) var(--btn-primary-padding-x);
    font-size: var(--btn-primary-font-size);
    font-weight: var(--btn-primary-font-weight);
    line-height: var(--btn-primary-line-height);
    transition: var(--btn-primary-transition);
    box-shadow: var(--btn-primary-shadow);
    width: var(--btn-primary-width);
    display: var(--btn-primary-display);
    align-items: var(--btn-primary-align-items);
    justify-content: var(--btn-primary-justify-content);
  }

  :global(.post-content .btn-primary:hover) {
    background-color: var(--btn-primary-background-hover);
    color: var(--btn-primary-color);
    text-decoration: none;
    box-shadow: var(--btn-primary-shadow-hover);
  }
</style>
