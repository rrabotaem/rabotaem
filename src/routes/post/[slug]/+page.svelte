<script lang="ts">
  import { buildCommentsTree } from '$lib/components/lemmy/comment/comments.js'
  import { isImage } from '$lib/ui/image.js'
  import { client, getClient } from '$lib/lemmy.js'
  import CommentForm from '$lib/components/lemmy/comment/CommentForm.svelte'
  import { onMount } from 'svelte'
  import Markdown from '$lib/components/markdown/Markdown.svelte'
  import { page } from '$app/stores'
  import PostActions from '$lib/components/lemmy/post/PostActions.svelte'
  import {
    ArrowLeft,
    ArrowPath,
    ChevronDoubleUp,
    Icon,
    InformationCircle,
    Home,
    PlusCircle,
    ChatBubbleLeftRight,
    Bookmark,
    BookmarkSlash,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
  } from 'svelte-hero-icons'
  import PostMeta, {
    parseTags,
  } from '$lib/components/lemmy/post/PostMeta.svelte'
  import { Select, removeToast, toast } from 'mono-svelte'
  import type { CommentSortType } from 'lemmy-js-client'
  import { profile } from '$lib/auth.js'
  import { instance } from '$lib/instance.js'
  import { afterNavigate, goto } from '$app/navigation'
  import FormattedNumber from '$lib/components/util/FormattedNumber.svelte'
  import { Button } from 'mono-svelte'
  import EndPlaceholder from '$lib/components/ui/EndPlaceholder.svelte'
  import { userSettings } from '$lib/settings.js'
  import { publishedToDate } from '$lib/components/util/date.js'
  import PostMedia from '$lib/components/lemmy/post/media/PostMedia.svelte'
  import { mediaType } from '$lib/components/lemmy/post/helpers.js'
  import Post from '$lib/components/lemmy/post/Post.svelte'
  import Expandable from '$lib/components/ui/Expandable.svelte'
  import { Popover } from 'mono-svelte'
  import { t } from '$lib/translations.js'
  import { resumables } from '$lib/lemmy/item.js'
  import { contentPadding } from '$lib/components/ui/layout/Shell.svelte'
  import Placeholder from '$lib/components/ui/Placeholder.svelte'
  import CommentListVirtualizer from '$lib/components/lemmy/comment/CommentListVirtualizer.svelte'
  import Header from '$lib/components/ui/layout/pages/Header.svelte'
  import { browser } from '$app/environment'
  import VirtualFeed from '$lib/components/lemmy/post/feed/VirtualFeed.svelte'
  import PostFeed from '$lib/components/lemmy/post/feed/PostFeed.svelte'
  import { postFeed } from '$lib/lemmy/postfeed'
  import { deserializeEditorModel } from '$lib/util'

  export let data

  let ogImage: string | null;

  $: type = mediaType(data.post.post_view.post.url, 'cozy')
  $: featuredPost = data.recommendations?.communityPosts?.posts
    .filter(p => 
      p.post.featured_community && 
      p.community.id === data.post.post_view.community.id &&
      p.post.id !== data.post.post_view.post.id
    )
    .sort((a, b) => 
      new Date(b.post.published).getTime() - new Date(a.post.published).getTime()
    )[0]

  const updateActions = () => {
    // @ts-ignore
    data.contextual = {
      actions: [
        {
          name: $t('post.actions.vote.upvote'),
          icon: ArrowUp,
          handle: async () => {
            data.post.post_view.my_vote = (
              await client().likePost({
                post_id: data.post.post_view.post.id,
                score: data.post.post_view.my_vote == 1 ? 0 : 1,
              })
            ).post_view.my_vote
          },
        },
        {
          name: $t('post.actions.vote.downvote'),
          icon: ArrowDown,
          handle: async () => {
            data.post.post_view.my_vote = (
              await client().likePost({
                post_id: data.post.post_view.post.id,
                score: data.post.post_view.my_vote == -1 ? 0 : -1,
              })
            ).post_view.my_vote
          },
        },
        {
          name: data.post.post_view.saved
            ? $t('post.actions.unsave')
            : $t('post.actions.save'),
          handle: async () => {
            data.post.post_view.saved = (
              await client().savePost({
                post_id: data.post.post_view.post.id,
                save: !data.post.post_view.saved,
              })
            ).post_view.saved
          },
          icon: data.post.post_view.saved ? BookmarkSlash : Bookmark,
        },
      ],
    }
  }

  $: if (data.post) updateActions()

  // Добавляем функцию для создания слага из названия
  function createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\wа-яё]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Определяем, является ли текущий URL каноническим (со слагом)
  $: postId = $page.params.slug.split('-')[0];
  $: hasSlug = $page.params.slug.includes('-');
  $: canonicalUrl = hasSlug 
    ? $page.url.toString() 
    : new URL(`/post/${data.post.post_view.post.id}-${createSlug(data.post.post_view.post.name)}`, $page.url.origin).toString();

  onMount(async () => {
    if (
      !(data.post.post_view.read && $userSettings.markPostsAsRead) &&
      $profile?.jwt
    ) {
      getClient().markPostAsRead({
        read: $userSettings.markPostsAsRead,
        post_ids: [data.post.post_view.post.id],
      })
    }

    resumables.add({
      name: data.post.post_view.post.name,
      type: 'post',
      url: $page.url.toString(),
      avatar: data.post.post_view.post.thumbnail_url,
    })

    // Добавляем прокрутку к якорю после рендеринга
    if (browser && $page.url.hash) {
      setTimeout(() => {
        const element = document.querySelector($page.url.hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // await processPostBody();
  })

  afterNavigate(async () => {
    // reactivity hack
    data.post = data.post
    await processPostBody();
  })

  const fetchOnHome = async (jwt: string) => {
    const id = toast({
      content: $t('toast.fetchPostOnHome'),
      loading: true,
    })

    try {
      const res = await getClient().resolveObject({
        q: data.post.post_view.post.ap_id,
      })

      if (res.post) {
        removeToast(id)
        goto(`/post/${$instance}/${res.post.post.id}`, {}).then(() =>
          removeToast(id)
        )
      }
    } catch (err) {
      removeToast(id)
    }
  }

  let commentsPage = 1
  let commentSort: CommentSortType = data.commentSort
  let loading = false

  async function reloadComments() {
    loading = true
    data.comments = await getClient().getComments({
      page: 1,
      limit: 25,
      type_: 'All',
      post_id: data.post.post_view.post.id,
      sort: commentSort,
      max_depth: data.post.post_view.counts.comments > 100 ? 1 : 3,
    })
    loading = false
    data.thread.singleThread = false
    commentsPage = 1
  }

  let commenting = false

  let DOMPurify: any
  let processedContent = ''

  // Функция для проверки JSON контента
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

  // Функция для извлечения превью изображения из контента
  function extractPreviewImage(content: string): string | null {
    if (!content) return null;

    if (isJsonContent(content)) {
      try {
        let parsed;
        
        // Пробуем парсить как обычный JSON
        try {
          parsed = JSON.parse(content);
        } catch {
          // Если не получилось, пробуем десериализовать из base64
          parsed = deserializeEditorModel(content);
        }
        
        if (parsed.additional?.previewImage) {
          return parsed.additional.previewImage.trim();
        }
      } catch (error) {
        console.error('Error parsing JSON content:', error);
      }
    }

    // Поиск в HTML формате
    const imageRegex = /<preview-image>(.*?)<\/preview-image>/is;
    const match = content.match(imageRegex);
    return match ? match[1].trim() : null;
  }

  function processJsonBlock(block: any): string {
    // Извлекаем якорь из tunes блока
    const anchorText = block?.tunes?.anchorInput?.text || 
                      block?.tunes?.customInput?.text;
    
    // Создаем атрибут id если есть якорь
    const anchorId = anchorText ? ` id="${anchorText}"` : '';
    
    switch (block.type) {
      case 'paragraph':
        return `<p${anchorId}>${block.data.text}</p>`;
      case 'header':
        return `<h${block.data.level}${anchorId}>${block.data.text}</h${block.data.level}>`;
      case 'list':
        const listClass = block.data.style === 'checklist' ? 'checklist' : '';
        const items = block.data.items.map((item: any) => 
          `<li>${block.data.style === 'checklist' 
            ? `<input type="checkbox" ${item.meta.checked ? 'checked' : ''} disabled> `
            : ''}${item.content}</li>`
        ).join('');
        return block.data.style === 'ordered' 
          ? `<ol${anchorId}>${items}</ol>` 
          : `<ul${anchorId} class="${listClass}">${items}</ul>`;
      case 'quote':
        const cleanCaption = block.data.caption?.trim();
        return `<blockquote${anchorId}>
          <p>${block.data.text}</p>
          ${cleanCaption ? `<footer>${cleanCaption}</footer>` : ''}
        </blockquote>`;
      case 'code':
        return `<pre${anchorId}><code>${block.data.code}</code></pre>`;
      case 'link':
      case 'customLink':
        const url = block.data.url || '#';
        const text = block.data.text || block.data.title || url;
        const title = block.data.title ? ` title="${block.data.title}"` : '';
        const isExternal = url.startsWith('http');
        const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        const linkStyle = block.data.style || 'link';
        return `<p${anchorId}><a href="${url}"${title}${target} class="${linkStyle}">${text}</a></p>`;
      case 'embed':
        const embedCaption = block.data.caption ? `<div class="embed-caption">${block.data.caption}</div>` : '';
        return `<div class="embed-container"${anchorId}>
          <div class="embed-responsive" style="padding-bottom: ${(block.data.height / block.data.width * 100).toFixed(2)}%">
            <iframe 
              src="${block.data.embed}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
          ${embedCaption}
        </div>`;
      case 'image':
        const imageWithAnchor = anchorId 
          ? `<div class="image-wrapper"${anchorId}>
          <img src="${block.data.file.url}" 
            alt="${block.data.file.alt || ''}" 
            title="${block.data.file.title || ''}"
            ${block.data.caption ? `data-caption="${block.data.caption}"` : ''}>
          ${block.data.caption ? `<div class="image-alt-text">${block.data.caption}</div>` : ''}
        </div>`
          : `<div class="image-wrapper">
          <img src="${block.data.file.url}" 
            alt="${block.data.file.alt || ''}" 
            title="${block.data.file.title || ''}"
            ${block.data.caption ? `data-caption="${block.data.caption}"` : ''}>
          ${block.data.caption ? `<div class="image-alt-text">${block.data.caption}</div>` : ''}
        </div>`;
        return imageWithAnchor;
      case 'gallery':
        const images = block.data.images.map((img: any, index: number) => 
          `<div class="gallery-item loaded" ${index > 0 ? 'style="display: none;"' : ''}>
            <img src="${img.url}" alt="${img.alt || ''}" title="${img.title || ''}">
            ${img.title ? `<div class="gallery-alt-text">${img.title}</div>` : ''}
          </div>`
        ).join('');
        return `<div class="post-gallery"${anchorId}>
          <div class="gallery-images">${images}</div>
        </div>`;
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
      
      console.log(`${previewImage}${previewDescription}${metaTitle}${metaDescription} + html`);

      return `${previewImage}${previewDescription}${metaTitle}${metaDescription}${htmlContent}`;
    } catch (error) {
      console.error('Error converting JSON to HTML:', error);
      return '';
    }
  }

  async function processPostBody() {
    if (browser && data.post.post_view.post.body) {
      const module = await import('dompurify');
      DOMPurify = module.default;
      let content = data.post.post_view.post.body;
      
      try {
        // Определяем формат контента и обрабатываем соответственно
        if (isJsonContent(content)) {
          content = convertJsonToHtml(content);
        }
        
        console.log('content before');
        console.log(content);

        // Удаляем мета-теги из контента
        content = content
          .replace(/<preview-image>.*?<\/preview-image>/gs, '')
          .replace(/<preview-description>.*?<\/preview-description>/gs, '')
          .replace(/<meta-title>.*?<\/meta-title>/gs, '')
          .replace(/<meta-description>.*?<\/meta-description>/gs, '');
        
        console.log('content after');
        console.log(content);

        processedContent = DOMPurify.sanitize(content, {
          ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'img', 'figure', 'figcaption', 'div', 'blockquote', 'pre', 'code', 'input', 'iframe', 'footer'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'data-index', 'data-url', 'type', 'checked', 'disabled', 'data-caption', 'id', 'style', 'frameborder', 'allowfullscreen', 'allow']
        });
      } catch (error) {
        console.error('Error processing post body:', error);
        // В случае ошибки возвращаем оригинальный контент
        processedContent = content;
      }

      if (browser) {
        setTimeout(() => {

          // Находим все элементы image-wrapper без изображений внутри и удаляем их
          const emptyWrappers = document.querySelectorAll('.post-content .image-wrapper:not(:has(img))');
          emptyWrappers.forEach(wrapper => {
            wrapper.remove();
          });

          // Изменяем селектор для поиска изображений
          const images = document.querySelectorAll('.post-content img:not(.gallery-item img)')
          images.forEach(img => {
            const imgSrc = img.getAttribute('src')
            const dataUrl = img.getAttribute('data-url')
            
            if (!imgSrc) return

            // Удаляем существующий alt-текст, если он есть
            const existingAltText = img.nextElementSibling
            if (existingAltText?.className === 'image-alt-text') {
              existingAltText.remove()
            }

            if (dataUrl) {
              // Для изображений с data-url создаем только ссылку
              const wrapper = document.createElement('a')
              wrapper.href = dataUrl
              wrapper.target = '_blank'
              wrapper.rel = 'noopener noreferrer'
              img.parentNode?.insertBefore(wrapper, img)
              wrapper.appendChild(img)
            } else {
              // Для обычных изображений создаем обертку с увеличением
              const wrapper = document.createElement('div')
              wrapper.className = 'image-wrapper'
              wrapper.style.position = 'relative'
              wrapper.style.display = 'inline-block'
              
              // Создаем функцию открытия модального окна
              const openModal = (e: Event) => {
                e.stopPropagation() // Предотвращаем всплытие события

                const modal = document.createElement('div')
                modal.className = 'fullscreen-modal'
                
                const fullscreenImg = img.cloneNode(true) as HTMLImageElement
                
                // Кнопка закрытия
                const closeBtn = document.createElement('button')
                closeBtn.className = 'fullscreen-close'
                closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                
                closeBtn.onclick = () => modal.remove()
                
                modal.appendChild(fullscreenImg)
                modal.appendChild(closeBtn)

                // Добавляем alt-текст в модальное окно
                if (img instanceof HTMLImageElement && img.title) {
                  const modalAltText = document.createElement('div')
                  modalAltText.className = 'fullscreen-alt-text'
                  modalAltText.textContent = img.title
                  modal.appendChild(modalAltText)
                }

                document.body.appendChild(modal)
                
                // Добавляем обработчик Escape
                const handleKeydown = (e: KeyboardEvent) => {
                  if (e.key === 'Escape') {
                    modal.remove()
                    document.removeEventListener('keydown', handleKeydown)
                  }
                }
                document.addEventListener('keydown', handleKeydown)
              }

              // Добавляем обработчик для открытия в полноэкранном режиме
              wrapper.addEventListener('click', openModal)
              
              // Оборачиваем изображение
              img.parentNode?.insertBefore(wrapper, img)
              wrapper.appendChild(img)

              // Добавляем alt-текст под изображением
              if (img instanceof HTMLImageElement && img.title) {
                const altText = document.createElement('div')
                altText.className = 'image-alt-text'
                altText.textContent = img.title
                wrapper.appendChild(altText)
              }
              
              // Добавляем иконку увеличения
              const zoomIcon = document.createElement('div')
              zoomIcon.className = 'zoom-icon'
              zoomIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`
              wrapper.appendChild(zoomIcon)
            }
          })

          // Изменяем селектор для галерей
          const galleries = document.querySelectorAll('.post-content .post-gallery')
          galleries.forEach((gallery, galleryIndex) => {
            const images = Array.from(gallery.querySelectorAll('img'))
            if (images.length > 1) {
              // Сохраняем количество изображений
              const imagesCount = images.length
              
              // Создаем контейнер для изображений
              const imageContainer = document.createElement('div')
              imageContainer.className = 'gallery-images'
              
              // Перемещаем все изображения в контейнер и создаем для каждого обертку
              images.forEach((img, index) => {
                const wrapper = document.createElement('div')
                wrapper.className = 'gallery-item'
                wrapper.classList.add('loaded') // Добавляем класс loaded
                wrapper.style.cssText = index > 0 ? 'display: none;' : ''
                
                // Создаем контейнер для alt-текста для каждого изображения
                const altText = document.createElement('div')
                altText.className = 'gallery-alt-text'
                altText.textContent = img.title || ''
                
                // Перемещаем оригинальное изображение (не клонируем)
                wrapper.appendChild(img)
                wrapper.appendChild(altText)
                imageContainer.appendChild(wrapper)
              })
              
              // Очищаем галерею и добавляем новый контейнер
              gallery.innerHTML = ''
              gallery.appendChild(imageContainer)

              // Добавляем навигационные кнопки
              const prevBtn = document.createElement('button')
              prevBtn.className = 'gallery-nav gallery-prev'
              prevBtn.innerHTML = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`
              
              const nextBtn = document.createElement('button')
              nextBtn.className = 'gallery-nav gallery-next'
              nextBtn.innerHTML = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>`

              const counter = document.createElement('div')
              counter.className = 'gallery-counter'
              counter.textContent = `1/${imagesCount}`

              gallery.appendChild(prevBtn)
              gallery.appendChild(nextBtn)
              gallery.appendChild(counter)

              let currentIndex = 0
              let isFullscreen = false
              let fullscreenModal: HTMLElement | null = null

              const toggleFullscreen = (index: number, isFullscreenUpdate = false) => {
                if (!isFullscreen) {
                  // Создаем модальное окно
                  fullscreenModal = document.createElement('div')
                  fullscreenModal.className = 'fullscreen-modal'
                  
                  // Создаем контейнер для изображений в полноэкранном режиме
                  const fullscreenContainer = imageContainer.cloneNode(true) as HTMLElement
                  
                  // Добавляем кнопку закрытия
                  const closeBtn = document.createElement('button')
                  closeBtn.className = 'fullscreen-close'
                  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                  closeBtn.onclick = () => {
                    fullscreenModal?.remove()
                    isFullscreen = false
                    fullscreenModal = null
                  }
                  
                  // Клонируем навигационные элементы
                  const fullscreenPrevBtn = prevBtn.cloneNode(true) as HTMLElement
                  fullscreenPrevBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                  
                  const fullscreenNextBtn = nextBtn.cloneNode(true) as HTMLElement
                  fullscreenNextBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                  
                  const fullscreenCounter = counter.cloneNode(true) as HTMLElement
                  
                  fullscreenPrevBtn.onclick = () => updateGallery(currentIndex - 1, true)
                  fullscreenNextBtn.onclick = () => updateGallery(currentIndex + 1, true)
                  
                  fullscreenModal.appendChild(fullscreenContainer)
                  fullscreenModal.appendChild(closeBtn)
                  fullscreenModal.appendChild(fullscreenPrevBtn)
                  fullscreenModal.appendChild(fullscreenNextBtn)
                  fullscreenModal.appendChild(fullscreenCounter)
                  
                  document.body.appendChild(fullscreenModal)
                  isFullscreen = true
                }
                
                updateGallery(index, isFullscreenUpdate)
              }

              const updateGallery = (newIndex: number, isFullscreenUpdate = false) => {
                const items = (isFullscreenUpdate && fullscreenModal 
                  ? fullscreenModal.querySelectorAll('.gallery-item') 
                  : imageContainer.querySelectorAll('.gallery-item')) as NodeListOf<HTMLElement>
                
                items.forEach(item => item.style.display = 'none')
                currentIndex = (newIndex + items.length) % items.length
                items[currentIndex].style.display = 'block'
                
                const counterElement = isFullscreenUpdate && fullscreenModal
                  ? fullscreenModal.querySelector('.gallery-counter')
                  : counter
                  
                if (counterElement) {
                  counterElement.textContent = `${currentIndex + 1}/${items.length}`
                }
              }

              // Добавляем обработчики событий
              prevBtn.addEventListener('click', () => updateGallery(currentIndex - 1))
              nextBtn.addEventListener('click', () => updateGallery(currentIndex + 1))
              
              // Добавляем обработчик клика по изображениям
              const items = imageContainer.querySelectorAll('.gallery-item')
              items.forEach((item, index) => {
                item.addEventListener('click', () => toggleFullscreen(index))
              })
              
              // Добавляем обработчик клавиш
              document.addEventListener('keydown', (e) => {
                if (isFullscreen) {
                  if (e.key === 'Escape') {
                    fullscreenModal?.remove()
                    isFullscreen = false
                    fullscreenModal = null
                  } else if (e.key === 'ArrowLeft') {
                    updateGallery(currentIndex - 1, true)
                  } else if (e.key === 'ArrowRight') {
                    updateGallery(currentIndex + 1, true)
                  }
                }
              })
            }
          })
        }, 0)
      }
    }
  }

  // Функция для рендеринга контента из JSON/base64 формата
  function renderContent(content: any): string {
    if (!content?.blocks) return '';
    
    const htmlContent = content.blocks
      .map((block: any) => {
        // Получаем якорь из tunes блока
        const anchorText = block?.tunes?.anchorInput?.text || 
                          block?.tunes?.customInput?.text;
        
        switch (block.type) {
          case 'paragraph':
            return `<p${anchorText ? ` id="${anchorText}"` : ''}>${block.data.text}</p>`;
          case 'header':
            return `<h${block.data.level}${anchorText ? ` id="${anchorText}"` : ''}>${block.data.text}</h${block.data.level}>`;
          case 'list':
            const items = block.data.items.map((item: any) => 
              `<li>${block.data.style === 'checklist' 
                ? `<input type="checkbox" ${item.meta?.checked ? 'checked' : ''} disabled> `
                : ''}${item.content}</li>`
            ).join('');
            return block.data.style === 'ordered' 
              ? `<ol${anchorText ? ` id="${anchorText}"` : ''}>${items}</ol>` 
              : `<ul${anchorText ? ` id="${anchorText}"` : ''} class="${block.data.style === 'checklist' ? 'checklist' : ''}">${items}</ul>`;
          case 'quote':
            const cleanCaption = block.data.caption?.trim();
            return `<blockquote${anchorText ? ` id="${anchorText}"` : ''}>
              <p>${block.data.text}</p>
              ${cleanCaption ? `<footer>${cleanCaption}</footer>` : ''}
            </blockquote>`;
          case 'code':
            return `<pre${anchorText ? ` id="${anchorText}"` : ''}><code>${block.data.code}</code></pre>`;
          case 'image':
            const imageWrapper = `<div class="image-wrapper"${anchorText ? ` id="${anchorText}"` : ''}>
              <img src="${block.data.file.url}" 
                alt="${block.data.file.alt || ''}" 
                title="${block.data.file.title || ''}"
                ${block.data.caption ? `data-caption="${block.data.caption}"` : ''}>
              ${block.data.caption ? `<div class="image-alt-text">${block.data.caption}</div>` : ''}
            </div>`;
            return imageWrapper;
          case 'gallery':
            const images = block.data.images.map((img: any, index: number) => 
              `<div class="gallery-item loaded" ${index > 0 ? 'style="display: none;"' : ''}>
                <img src="${img.url}" alt="${img.alt || ''}" title="${img.title || ''}">
                ${img.title ? `<div class="gallery-alt-text">${img.title}</div>` : ''}
              </div>`
            ).join('');
            return `<div class="post-gallery"${anchorText ? ` id="${anchorText}"` : ''}>
              <div class="gallery-images">${images}</div>
            </div>`;
          case 'link':
          case 'customLink':
            const url = block.data.url || '#';
            const text = block.data.text || block.data.title || url;
            const title = block.data.title ? ` title="${block.data.title}"` : '';
            const isExternal = url.startsWith('http');
            const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const linkStyle = block.data.style || 'link';
            return `<p${anchorText ? ` id="${anchorText}"` : ''}><a href="${url}"${title}${target} class="${linkStyle}">${text}</a></p>`;
          case 'embed':
            const embedCaption = block.data.caption ? `<div class="embed-caption">${block.data.caption}</div>` : '';
            return `<div class="embed-container"${anchorText ? ` id="${anchorText}"` : ''}>
              <div class="embed-responsive" style="padding-bottom: ${(block.data.height / block.data.width * 100).toFixed(2)}%">
                <iframe 
                  src="${block.data.embed}" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen
                  loading="lazy"
                ></iframe>
              </div>
              ${embedCaption}
            </div>`;
          default:
            return '';
        }
      })
      .join('\n');

    return htmlContent;
  }

  // Функция для санитизации HTML
  function sanitizeHtml(html: string, isMetaContent = false): string {
    if (browser && DOMPurify) {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: isMetaContent ? [] : [
          'p', 'b', 'i', 'em', 'strong', 'a', 'br', 
          'ul', 'ol', 'li', 'h1', 'h2', 'h3', 
          'img', 'figure', 'figcaption', 'div', 
          'blockquote', 'pre', 'code', 'input', 'footer',
          'iframe'
        ],
        ALLOWED_ATTR: isMetaContent ? [] : [
          'href', 'target', 'rel', 'src', 'alt', 
          'title', 'width', 'height', 'loading', 
          'class', 'data-caption', 'id', 'checked', 
          'disabled', 'style', 'frameborder',
          'allowfullscreen', 'allow'
        ]
      });
    }
    
    // Для SSR или когда DOMPurify недоступен
    if (isMetaContent) {
      return html
        .replace(/<[^>]*>/g, '') // Удаляем все HTML теги
        .replace(/&nbsp;/g, ' ') // Заменяем неразрывные пробелы
        .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
        .trim(); // Удаляем пробелы в начале и конце
    }
    
    return html;
  }

  function stripHtml(html: string | undefined): string {
    if (!html) return '';
    
    try {
      // Удаляем мета-теги
      const cleanHtml = html
        .replace(/<preview-image>.*?<\/preview-image>/gs, '')
        .replace(/<preview-description>.*?<\/preview-description>/gs, '')
        .replace(/<meta-description>.*?<\/meta-description>/gs, '')
        .replace(/<meta-title>.*?<\/meta-title>/gs, '');
      
      // Проверяем, является ли контент JSON или base64
      if (isJsonContent(cleanHtml)) {
        try {
          let parsed;
          try {
            parsed = JSON.parse(cleanHtml);
          } catch {
            // Проверяем, похоже ли это на base64
            const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanHtml);
            if (!isBase64) {
              throw new Error('Not a base64 string');
            }
            parsed = deserializeEditorModel(cleanHtml);
          }
          
          const renderedContent = renderContent(parsed);
          return sanitizeHtml(renderedContent, type === 'meta' as any);
        } catch (error) {
          console.error('Error parsing JSON/base64 content:', error);
          // В случае ошибки возвращаем очищенный HTML
          return sanitizeHtml(cleanHtml, type === 'meta' as any);
        }
      }
      
      return sanitizeHtml(cleanHtml, type === 'meta' as any);
    } catch (error) {
      console.error('Error in stripHtml:', error);
      return html;
    }
  }

  $: remoteView = false

  $: combinedPosts = (() => {
    if (!data.recommendations) return []
    
    // Получаем ID текущего поста
    const currentPostId = data.post.post_view.post.id
    
    // Сначала берем локальные посты из сообщества
    const communityPostsFiltered = (data.recommendations.communityPosts?.posts || [])
      .filter(p => 
        p.post.id !== currentPostId && 
        p.post.local // Добавляем проверку на локальность
      )
    
    // Затем добавляем локальные глобальные посты
    const globalPostsFiltered = (data.recommendations.globalPosts?.posts?.posts || [])
      .filter(p => 
        p.post.id !== currentPostId && 
        !communityPostsFiltered.some(cp => cp.post.id === p.post.id) &&
        p.community.id !== data.post.post_view.community.id &&
        p.post.local // Добавляем проверку на локальность
      )
    
    // Объединяем массивы
    return [...communityPostsFiltered, ...globalPostsFiltered]
  })()

  function getMetaTitle(post: any): string {
    if (!post) return '';
    
    // Проверяем, является ли контент JSON или base64
    if (isJsonContent(post.body)) {
      try {
        let parsed;
        
        // Пробуем парсить как обычный JSON
        try {
          parsed = JSON.parse(post.body);
        } catch {
          // Если не получилось, пробуем десериализовать из base64
          const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(post.body);
          if (!isBase64) {
            throw new Error('Not a base64 string');
          }
          parsed = deserializeEditorModel(post.body);
        }
        
        if (parsed.additional?.metaTitle) {
          return parsed.additional.metaTitle.trim();
        }
      } catch (error) {
        console.error('Error parsing meta title:', error);
      }
    }
    
    // Проверяем HTML формат
    const metaTitleMatch = post.body?.match(/<meta-title>(.*?)<\/meta-title>/s);
    const metaTitle = metaTitleMatch?.[1]?.trim();
    
    return metaTitle || stripHtml(post.name);
  }

  function getMetaDescription(post: any): string {
    if (!post?.body) return '';
    
    // Проверяем, является ли контент JSON или base64
    if (isJsonContent(post.body)) {
      try {
        let parsed;
        
        // Пробуем парсить как обычный JSON
        try {
          parsed = JSON.parse(post.body);
        } catch {
          // Если не получилось, пробуем десериализовать из base64
          const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(post.body);
          if (!isBase64) {
            throw new Error('Not a base64 string');
          }
          parsed = deserializeEditorModel(post.body);
        }
        
        // Если есть метаописание в дополнительных данных, используем его
        if (parsed.additional?.metaDescription) {
          return stripHtml(parsed.additional.metaDescription.trim());
        }

        // Если нет метаописания, но есть блоки, берем текст из первого текстового блока
        if (parsed.blocks && parsed.blocks.length > 0) {
          for (const block of parsed.blocks) {
            if (block.type === 'paragraph' && block.data.text) {
              const cleanText = stripHtml(block.data.text);
              if (cleanText) {
                return cleanText.slice(0, 170);
              }
            }
          }
        }

        // Если не нашли подходящего текста, возвращаем пустую строку
        return '';
      } catch (error) {
        console.error('Error parsing meta description:', error);
        // В случае ошибки парсинга возвращаем пустую строку вместо base64
        return '';
      }
    }
    
    // Проверяем HTML формат
    const metaDescMatch = post.body.match(/<meta-description>(.*?)<\/meta-description>/s);
    const metaDesc = metaDescMatch?.[1]?.trim();
    
    if (metaDesc) {
      return stripHtml(metaDesc);
    }

    // Удаляем все HTML-теги и лишние пробелы
    const cleanBody = stripHtml(post.body)
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim(); // Удаляем пробелы в начале и конце

    return cleanBody.slice(0, 170);
  }

  // Исправляем тип данных для feedData
  $: feedDataForComponent = {
    posts: {
      posts: combinedPosts
    },
    cursor: { next: undefined },
    sort: 'Hot' as const
  }

  // Функция для получения og изображения
  function getOgImage(post: any): string | null {
    // Сначала проверяем превью изображение в контенте
    if (post.body) {
      const previewImage = extractPreviewImage(post.body);
      if (previewImage) return previewImage;
    }
    
    // Если нет превью, используем URL изображения поста
    if (isImage(post.url)) {
      return post.url;
    }
    
    
    return post.thumbnail_url || null;
  }
</script>

<svelte:head>
  <title>{getMetaTitle(data.post.post_view.post)}</title>
  <meta property="og:title" content={getMetaTitle(data.post.post_view.post)} />
  <meta property="twitter:title" content={getMetaTitle(data.post.post_view.post)} />
  <meta property="og:url" content={$page.url.toString()} />

  <meta name="description" content={getMetaDescription(data.post.post_view.post)} />
  <meta property="og:description" content={getMetaDescription(data.post.post_view.post)} />
  <meta property="twitter:description" content={getMetaDescription(data.post.post_view.post)} />

  <!-- Добавляем каноническую ссылку -->
  <link rel="canonical" href={canonicalUrl} />
  
  {#if data.post.post_view.post}
    {@const ogImageValue = getOgImage(data.post.post_view.post)}
    {#if ogImageValue}
      <meta property="og:image" content={ogImageValue} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:image" content={ogImageValue} />
    {/if}
  {/if}
  
</svelte:head>

<article class="flex flex-col mx-auto w-full max-w-[640px] bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 border-b-slate-300 dark:border-t-zinc-700 p-4 sm:p-6">
  {#if remoteView}
    <div
      class="sticky top-0 bg-slate-50 dark:bg-zinc-950 z-20
      border-b dark:border-zinc-800 border-slate-300
      -mx-4 -mt-4 md:-mt-6 md:-mx-6 sticky-header px-4 py-2
      flex items-center gap-2 mb-4 h-12
      "
    >
      <Popover openOnHover>
        <Icon
          src={InformationCircle}
          size="24"
          solid
          slot="target"
          class="bg-slate-200 dark:bg-zinc-700 p-0.5 rounded-full text-primary-900 dark:text-primary-100"
        />
        {$t('routes.post.instanceWarning')}
      </Popover>
      <span class="text-primary-900 dark:text-primary-100 font-bold">
        {$t('routes.post.remoteView')}
      </span>
      {#if $profile?.jwt}
        <Button
          class="ml-auto"
          on:click={() => {
            if ($profile?.jwt) {
              fetchOnHome($profile?.jwt)
            }
          }}
        >
          <Icon src={Home} mini size="16" />
          {$t('routes.post.localView')}
        </Button>
      {/if}
    </div>
  {/if}

  <header class="flex flex-col gap-2">
    <PostMeta
      community={data.post.post_view.community}
      user={data.post.post_view.creator}
      bind:subscribed={data.post.community_view.subscribed}
      badges={{
        deleted: data.post.post_view.post.deleted,
        removed: data.post.post_view.post.removed,
        locked: data.post.post_view.post.locked,
        featured:
          data.post.post_view.post.featured_community ||
          data.post.post_view.post.featured_local,
        nsfw: data.post.post_view.post.nsfw,
        saved: data.post.post_view.saved,
        admin: data.post.post_view.creator_is_admin,
        moderator: data.post.post_view.creator_is_moderator,
      }}
      published={publishedToDate(data.post.post_view.post.published)}
      edited={data.post.post_view.post.updated}
      title={undefined}
      tags={parseTags(data.post.post_view.post.name).tags}
    />
    <!-- Заголовок для отображения и SEO -->
    <h1 class="text-2xl font-bold text-slate-900 dark:text-zinc-50">
      {parseTags(data.post.post_view.post.name).title ?? 
        data.post.post_view.post.name}
    </h1>
  </header>
  <PostMedia
    type={mediaType(data.post.post_view.post.url)}
    post={data.post.post_view.post}
    opened
    view="cozy"
  />
  {#if data.post.post_view.post.body}
    <div class="text-base text-slate-800 dark:text-zinc-200 leading-[1.5] post post-content">
      {#if processedContent}
        {@html processedContent}
      {:else}
        {@html stripHtml(data.post.post_view.post.body)}
      {/if}
    </div>
  {/if}
  <div class="w-full relative">
    <PostActions
      bind:post={data.post.post_view}
      on:edit={() =>
        toast({
          content: 'The post was edited successfully.',
          type: 'success',
        })}
      {type}
    />
  </div>
  {#if data.post.cross_posts?.length > 0}
    <Expandable
      class="text-base mt-2 w-full cursor-pointer"
      open={data.post.cross_posts?.length <= 3}
    >
      <div
        slot="title"
        class="inline-block w-full text-left text-base font-normal"
      >
        <span class="font-bold">{data.post.cross_posts.length}</span>
        {$t('routes.post.crosspostCount')}
      </div>
      <div
        class="!divide-y divide-slate-200 dark:divide-zinc-800 flex flex-col"
      >
        {#each data.post.cross_posts as crosspost}
          <Post view="compact" actions={false} post={crosspost} />
        {/each}
      </div>
    </Expandable>
  {/if}
</article>

{#if featuredPost}
  <div class="mt-4 flex flex-col gap-2 max-w-[640px] w-full mx-auto">
    <div class="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 border-b-slate-300 dark:border-t-zinc-700 p-4 sm:p-6">
      <Post post={featuredPost} view="cozy" />
    </div>
  </div>
{/if}

{#if data.thread.showContext || data.thread.singleThread}
  <div
    class="sticky mx-auto z-50 max-w-lg w-full min-w-0 flex items-center overflow-auto gap-1
    bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50
    p-1 rounded-full px-2.5 justify-between"
    style="top: max(1.5rem, {$contentPadding.top}px);"
  >
    <p class="font-medium text-sm flex items-center gap-2">
      <Icon src={InformationCircle} mini size="20" />
      {data.thread.showContext
        ? $t('routes.post.thread.part')
        : $t('routes.post.thread.single')}
    </p>
    <Button
      color="none"
      rounding="pill"
      {loading}
      disabled={loading}
      href={data.thread.showContext
        ? `/comment/${$page.params.instance}/${data.thread.showContext}`
        : undefined}
      class="hover:bg-white/50 dark:hover:bg-zinc-800/30"
      on:click={data.thread.singleThread ? reloadComments : undefined}
    >
      {data.thread.showContext
        ? $t('routes.post.thread.context')
        : $t('routes.post.thread.allComments')}
    </Button>
  </div>
{/if}
{#if !data.post.post_view.post.locked}
<section class="mt-4 flex flex-col gap-2 max-w-[640px] w-full mx-auto bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 border-b-slate-300 dark:border-t-zinc-700 p-4 sm:p-6" id="comments">
  <header>
    <div class="text-base">
      <span class="font-bold">
        <FormattedNumber number={data.post.post_view.counts.comments} />
      </span>
      {$t('routes.post.commentCount')}
    </div>
  </header>
  {#await data.comments}
    <div class="space-y-4">
      {#each new Array(10) as empty}
        <div class="animate-pulse flex flex-col gap-2 skeleton w-full">
          <div class="w-96 h-4" />
          <div class="w-full h-12" />
          <div class="w-48 h-4" />
        </div>
      {/each}
    </div>
  {:then comments}
    <CommentForm
      postId={data.post.post_view.post.id}
      autoFocus={data.reply}
      on:comment={(e) => {
        if (!$profile?.jwt) {
          goto('/login?redirect=' + encodeURIComponent($page.url.pathname));
          return;
        }
        comments.comments = [
          e.detail.comment_view,
          ...comments.comments,
        ];
      }}
      on:submit={() => {
        if (!$profile?.jwt) {
          goto('/login?redirect=' + encodeURIComponent($page.url.pathname));
          return;
        }
      }}
      locked={(data.post.post_view.post.locked &&
        !(
          $profile?.user?.local_user_view.local_user.admin ||
          $profile?.user?.moderates
            .map((c) => c.community.id)
            .includes(data.post.community_view.community.id)
        ))}
      banned={data.post.community_view.banned_from_community}
      on:focus={() => (commenting = true)}
      tools={true}
      preview={true}
      rows={7}
      placeholder={$t('routes.post.addComment')}
    />

    <div class="gap-2 flex items-center max-w-[640px]">
      <Select bind:value={commentSort} on:change={reloadComments}>
        <option value="Hot">{$t('filter.sort.hot')}</option>
        <option value="Top">{$t('filter.sort.top.label')}</option>
        <option value="New">{$t('filter.sort.new')}</option>
        <option value="Old">{$t('filter.sort.old')}</option>
        <option value="Controversial">
          {$t('filter.sort.controversial')}
        </option>
      </Select>
      <Button size="square-md" on:click={reloadComments}>
        <Icon src={ArrowPath} size="16" mini slot="prefix" />
      </Button>
    </div>
    <CommentListVirtualizer
      post={data.post.post_view.post}
      nodes={buildCommentsTree(
        comments.comments,
        undefined,
        (c) =>
          !(
            ($userSettings.hidePosts.deleted && c.comment.deleted) ||
            ($userSettings.hidePosts.removed && c.comment.removed)
          )
      )}
      scrollTo={data.thread.focus}
      autoReply={data.reply}
    />
    {#if comments.comments.length == 0}
      <Placeholder
        icon={ChatBubbleLeftRight}
        title={$t('routes.post.emptyComments.title')}
        description={$t('routes.post.emptyComments.description')}
      ></Placeholder>
    {/if}
  {/await}
  {#if data.post.post_view.counts.comments > 5}
    <EndPlaceholder>
      <span class="text-black dark:text-white font-bold">
        {data.post.post_view.counts.comments}
      </span>
      {$t('routes.post.commentCount')}

      <Button
        color="tertiary"
        on:click={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        slot="action"
      >
        <Icon src={ChevronDoubleUp} mini size="16" slot="prefix" />
        {$t('routes.post.scrollToTop')}
      </Button>
    </EndPlaceholder>
  {/if}
</section>
{/if}

<section class="mt-4 flex flex-col gap-2 max-w-[640px] w-full mx-auto s-5pF0786g8dBR" id="recomendations">
  <header class="flex items-center gap-2">
    <div class="text-lg font-bold font-display">
      {$t('routes.post.similarPosts')}
    </div>
  </header>

  {#if !data.recommendations}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="animate-pulse flex flex-col gap-2 skeleton w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 border-b-slate-300 dark:border-t-zinc-700 p-4 sm:p-6">
          <div class="w-96 h-4" />
          <div class="w-full h-12" />
          <div class="w-48 h-4" />
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      <svelte:component
        this={browser ? VirtualFeed : PostFeed}
        posts={combinedPosts}
        feedData={feedDataForComponent}
        feedId="recommendations"
      />
    </div>
  {/if}
</section>

<style lang="postcss">
  .skeleton * {
    @apply bg-slate-100 dark:bg-zinc-800 rounded-md;
  }

  :global(.post-content blockquote) {
    @apply border-l-4 pl-4 my-4;
    border-left-color: rgb(234 88 12);
  }

  :global(.post-content blockquote p) {
    @apply text-black dark:text-zinc-200;
  }

  /* Стили для заголовков */
  :global(.post-content h1) {
    font-weight: 500;
  }

  :global(.post-content h2) {
    font-size: 1.2em;
    font-weight: 500;
    line-height: 1.3;
    margin: 1rem 0;
    color: #1f2937;
  }

  :global(.post-content h3) {
    font-size: 1.1em;
    font-weight: 500;
    line-height: 1.4;
    margin: 1rem 0;
    color: #1f2937;
  }

  :global(.dark .post-content h2),
  :global(.dark .post-content h3) {
    color: #e5e7eb;
  }

  :global(.post-content .post-gallery) {
    @apply relative my-4 rounded-lg overflow-hidden;
    aspect-ratio: 4/3;
    background: transparent;
  }

  :global(.post-content .post-gallery .gallery-images) {
    @apply w-full h-full relative;
  }

  :global(.post-content .post-gallery .gallery-item) {
    @apply w-full h-full absolute top-0 left-0;
  }

  :global(.post-content .post-gallery img) {
    @apply w-full h-full object-cover;
  }

  :global(.post-content .post-gallery .gallery-alt-text) {
    @apply absolute bottom-0 left-0 right-0 bg-black/50 text-white px-4 py-2 text-sm
    opacity-0 transition-opacity duration-200 z-20;
    min-height: 2.5rem;
  }

  :global(.post-content .post-gallery:hover .gallery-alt-text) {
    @apply opacity-100;
  }

  :global(.post-content .post-gallery .gallery-nav) {
    @apply absolute top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full 
    opacity-0 transition-opacity duration-200 hover:bg-black/70 z-30;
  }

  :global(.post-content .post-gallery:hover .gallery-nav) {
    @apply opacity-100;
  }

  :global(.post-content .post-gallery .gallery-prev) {
    @apply left-2;
  }

  :global(.post-content .post-gallery .gallery-next) {
    @apply right-2;
  }

  :global(.post-content .post-gallery .gallery-counter) {
    @apply absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-sm z-30;
  }

  :global(.fullscreen-modal) {
    @apply fixed inset-0 bg-black/90 z-50 flex items-center justify-center;
  }

  :global(.fullscreen-modal img) {
    @apply max-h-[90vh] max-w-[90vw] object-contain;
  }

  :global(.fullscreen-modal .gallery-nav) {
    @apply fixed top-1/2 -translate-y-1/2 bg-black/50 text-white p-4 rounded-full 
    hover:bg-black/70 transition-colors duration-200 z-50 opacity-100 cursor-pointer
    flex items-center justify-center;
    width: 48px;
    height: 48px;
  }

  :global(.fullscreen-modal .gallery-prev) {
    @apply left-6;
  }

  :global(.fullscreen-modal .gallery-next) {
    @apply right-6;
  }

  :global(.fullscreen-modal .gallery-counter) {
    @apply fixed bottom-6 right-6 bg-black/50 text-white px-4 py-2 rounded-full text-base z-50;
  }

  :global(.fullscreen-close) {
    @apply fixed top-6 right-6 text-white bg-black/50 p-4 rounded-full 
    hover:bg-black/70 transition-colors duration-200 z-50 cursor-pointer
    flex items-center justify-center;
    width: 48px;
    height: 48px;
  }

  :global(.fullscreen-modal .gallery-alt-text) {
    @apply fixed bottom-0 left-0 right-0 bg-black/50 text-white px-6 py-4 text-base
    opacity-100 z-50 text-center;
  }

  :global(.fullscreen-modal .fullscreen-alt-text) {
    @apply fixed bottom-0 left-0 right-0 bg-black/50 text-white px-6 py-4 text-base
    opacity-100 z-50 text-center;
  }

  :global(.fullscreen-modal svg) {
    @apply w-8 h-8;
  }

  :global(.post-content .image-wrapper) {
    @apply cursor-zoom-in relative inline-block;
  }

  :global(.post-content .image-wrapper .zoom-icon) {
    @apply absolute top-2 right-2 bg-black/50 p-2 rounded-full 
    opacity-0 transition-opacity duration-200 z-10;
  }

  :global(.post-content .image-wrapper:hover .zoom-icon) {
    @apply opacity-100;
  }

  :global(.post-content .zoom-icon svg) {
    @apply w-4 h-4 text-white;
  }

  :global(.post-content .image-wrapper .image-alt-text) {
    @apply text-sm text-slate-600 dark:text-zinc-400 text-center;
  }

  :global(.post-content pre) {
    @apply bg-slate-100 dark:bg-zinc-800 rounded-lg p-4 my-4 overflow-x-auto;
  }

  :global(.post-content pre code) {
    @apply font-mono text-sm text-slate-800 dark:text-zinc-200;
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

  /* Стили для embed блоков */
  :global(.post-content .embed-container) {
    @apply my-6 w-full;
  }

  :global(.post-content .embed-responsive) {
    @apply relative w-full overflow-hidden;
    height: 0;
  }

  :global(.post-content .embed-responsive iframe) {
    @apply absolute top-0 left-0 w-full h-full rounded-lg;
  }

  :global(.post-content .embed-caption) {
    @apply mt-2 text-sm text-slate-600 dark:text-zinc-400 text-center;
  }

  /* Стили для якорных ссылок */
  :global(.post-content [id]) {
    scroll-margin-top: 6rem;
  }

  :global(.post-content h1[id]),
  :global(.post-content h2[id]),
  :global(.post-content h3[id]),
  :global(.post-content h4[id]),
  :global(.post-content h5[id]),
  :global(.post-content h6[id]) {
    scroll-margin-top: 6rem;
  }

  /* Стили для ссылок */
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

  :global(.post-content p:has(.btn-primary)) {
    @apply flex justify-center;
  }

  /* Стили для параграфов в полном просмотре поста */
  :global(.post-content p) {
    margin: 1rem 0;
  }

  /* Стили для жирного текста */
  :global(.post-content strong),
  :global(.post-content b) {
    font-weight: 500;
  }

</style>
