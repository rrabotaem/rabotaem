<script lang="ts">
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import Placeholder from '@tiptap/extension-placeholder'
  import Link from '@tiptap/extension-link'
  import Image from '@tiptap/extension-image'
  import { Extension } from '@tiptap/core'
  import { Node } from '@tiptap/core'
  import { onMount, onDestroy } from 'svelte'
  import { Button } from 'mono-svelte'
  import TurndownService from 'turndown'
  import { uploadImage } from '$lib/util'
  import { profile } from '$lib/auth'

  // Создаем кастомное расширение Image с поддержкой url
  const CustomImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        'data-url': {
          default: null,
          parseHTML: element => element.getAttribute('data-url'),
          renderHTML: attributes => {
            if (!attributes['data-url']) {
              return {}
            }
            return {
              'data-url': attributes['data-url'],
            }
          }
        }
      }
    }
  })

  // Создаем расширение для галереи
  const Gallery = Node.create({
    name: 'gallery',
    group: 'block',
    content: 'image*',
    isolating: true,
    addCommands() {
      return {
        insertGallery: () => ({ commands, chain }) => {
          return commands.insertContent({
            type: this.name,
            content: []
          })
        }
      }
    },
    parseHTML() {
      return [
        {
          tag: 'div.post-gallery'
        }
      ]
    },
    renderHTML({ HTMLAttributes }) {
      return ['div', { class: 'post-gallery', ...HTMLAttributes }, 0]
    }
  })

  export let value = ''
  export let placeholder = ''
  export let label = ''

  let previewImage = ''
  let previewDescription = ''
  let metaDescription = ''
  let metaTitle = ''
  
  let element: HTMLElement
  let editor: Editor
  let linkUrl = ''
  let showLinkInput = false
  let showMarkdown = false
  let markdownOutput = ''
  
  // Добавляем состояние форматирования
  let formatting = {
    bold: false,
    italic: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    link: false
  }

  let characterCount = 0

  // Функция для обновления состояния форматирования
  const updateFormatting = () => {
    if (!editor) return
    formatting = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      codeBlock: editor.isActive('codeBlock'),
      link: editor.isActive('link')
    }
  }

  let showToolbar = false
  let toolbarPosition = { x: 0, y: 0 }
  let showAddMenu = false
  let showContextMenu = false
  let contextMenuPosition = { x: 0, y: 0 }

  let contextMenuRef: HTMLDivElement

  let showImageTitleEdit = false
  let selectedImage: HTMLImageElement | null = null
  let editingImageAlt = ''
  let editingImageTitle = ''
  let editingImageUrl = ''
  let showImageUrlEdit = false
  let isImageUploading = false
  let uploadProgress = {
    current: 0,
    total: 0,
    percent: 0
  }

  let contextType = {
    isImage: false,
    isInGallery: false,
    isGallery: false,
    hasSelection: false
  }

  let currentGalleryElement: HTMLElement | null = null;
  let currentGalleryPos = -1;

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  })

  const addBlock = (type: string) => {
    switch(type) {
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        updateFormatting()
        break
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        updateFormatting()
        break
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run()
        updateFormatting()
        break
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run()
        updateFormatting()
        break
      default:
        break
    }
  }

  const updateMarkdown = (html: string) => {
    // Добавляем все теги в конец HTML
    const tags = `<preview-image>${previewImage}</preview-image><preview-description>${previewDescription}</preview-description><meta-title>${metaTitle}</meta-title><meta-description>${metaDescription}</meta-description>`
    const htmlWithTags = `${html}${tags}`
    markdownOutput = htmlWithTags
    value = markdownOutput
  }

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    const target = event.target as HTMLElement
    
    console.log('=== Контекстное меню ===')
    console.log('1. Базовая информация:', {
      eventType: event.type,
      targetElement: target.tagName,
      targetClasses: target.className,
      coordinates: { x: event.clientX, y: event.clientY }
    })

    const isImage = target.tagName === 'IMG'
    const gallery = target.closest('.post-gallery')
    const isInGallery = gallery !== null
    const isGallery = target.classList.contains('post-gallery') || target === gallery
    const hasSelection = window.getSelection()?.toString().length > 0

    // Сохраняем ссылку на галерею и её позицию
    if ((isGallery || isInGallery) && gallery instanceof HTMLElement) {
      currentGalleryElement = gallery
      // Находим индекс текущей галереи среди всех галерей
      const galleries = Array.from(document.querySelectorAll('.post-gallery'))
      const galleryIndex = galleries.indexOf(gallery)
      
      // Находим соответствующую позицию в документе
      let foundGalleries = 0
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'gallery') {
          if (foundGalleries === galleryIndex) {
            currentGalleryPos = pos
            return false
          }
          foundGalleries++
        }
      })

      console.log('Найдена галерея:', {
        galleryIndex,
        currentGalleryPos,
        galleryContent: gallery.innerHTML
      })
    } else {
      currentGalleryElement = null
      currentGalleryPos = -1
    }

    console.log('2. Контекст:', {
      isImage,
      isInGallery,
      isGallery,
      hasSelection,
      currentGalleryPos,
      currentGalleryElement: currentGalleryElement ? {
        innerHTML: currentGalleryElement.innerHTML,
        classList: Array.from(currentGalleryElement.classList),
        childNodes: currentGalleryElement.childNodes.length
      } : null,
      path: event.composedPath().map(el => {
        const element = el as HTMLElement
        return {
          tag: element.tagName,
          classes: element.className,
          id: element.id
        }
      })
    })

    if (isImage) {
      selectedImage = target as HTMLImageElement
      editingImageAlt = selectedImage.alt || ''
      editingImageTitle = selectedImage.title || ''
    }

    contextMenuPosition = {
      x: event.clientX,
      y: event.clientY
    }
    showContextMenu = true

    // Сохраняем контекст для использования в меню
    contextType = {
      isImage,
      isInGallery,
      isGallery,
      hasSelection
    }
  }

  const handleGalleryDelete = () => {
    if (currentGalleryElement && editor) {
      deleteGallery(currentGalleryElement)
    }
  }

  const hideContextMenu = () => {
    showContextMenu = false
    currentGalleryElement = null
    currentGalleryPos = -1
  }

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    showLinkInput = true
  }

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      linkUrl = ''
      showLinkInput = false
    }
  }

  const addImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file && $profile?.jwt) {
        try {
          isImageUploading = true
          const imageUrl = await uploadImage(file, $profile.instance, $profile.jwt)
          
          if (imageUrl) {
            // Добавляем ?format=webp к URL изображения
            const webpUrl = `${imageUrl}?format=webp`
            
            editor.chain().focus().insertContent({
              type: 'image',
              attrs: {
                src: webpUrl,
                alt: '',
                title: ''
              }
            }).run()
          }
        } catch (error) {
          console.error('Ошибка при загрузке изображения:', error)
          alert('Не удалось загрузить изображение. Пожалуйста, попробуйте снова.')
        } finally {
          isImageUploading = false
        }
      }
    }
    
    input.click()
  }

  const updateToolbarPosition = () => {
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      toolbarPosition = {
        x: rect.left + window.scrollX + (rect.width / 2),
        y: rect.top + window.scrollY - 10
      }
      showToolbar = true
    } else {
      showToolbar = false
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (showContextMenu && 
        contextMenuRef && 
        !contextMenuRef.contains(e.target as Node) && 
        !(e.target as HTMLElement).closest('.context-menu')) {
      hideContextMenu()
    }
  }

  const updateImageTitle = () => {
    if (selectedImage && editor) {
      let imagePos = -1
      const imageSrc = selectedImage.src
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === imageSrc) {
          imagePos = pos
          return false
        }
      })

      if (imagePos > -1) {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            const node = tr.doc.nodeAt(imagePos)
            if (node && node.type.name === 'image') {
              tr.setNodeMarkup(imagePos, null, {
                ...node.attrs,
                alt: editingImageAlt,
                title: editingImageTitle
              })
              return true
            }
            return false
          })
          .run()
      }
      
      showImageTitleEdit = false
      selectedImage = null
      editingImageAlt = ''
      editingImageTitle = ''
      hideContextMenu()
    }
  }

  const setPreviewImage = () => {
    if (selectedImage) {
      previewImage = selectedImage.src
      updateMarkdown(editor.getHTML())
      hideContextMenu()
    }
  }

  const addImagesToGallery = async (files: FileList) => {
    if (!$profile?.jwt) return
    
    console.log('Добавление изображений в галерею:', {
      currentGalleryElement,
      currentGalleryPos,
      filesCount: files.length
    })

    // Проверяем, что у нас есть целевая галерея
    if (!currentGalleryElement || currentGalleryPos === -1) {
      console.error('Не найдена целевая галерея для добавления изображений')
      alert('Произошла ошибка при добавлении изображений. Пожалуйста, попробуйте снова.')
      return
    }

    try {
      isImageUploading = true
      uploadProgress = {
        current: 0,
        total: files.length,
        percent: 0
      }

      // Загружаем и добавляем изображения
      for (const file of Array.from(files)) {
        const imageUrl = await uploadImage(file, $profile.instance, $profile.jwt)
        if (imageUrl) {
          const webpUrl = `${imageUrl}?format=webp`
          
          // Находим актуальную позицию галереи перед каждой вставкой
          let targetPos = -1
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'gallery') {
              const domNode = editor.view.nodeDOM(pos)
              if (domNode === currentGalleryElement) {
                targetPos = pos
                return false
              }
            }
          })

          if (targetPos === -1) {
            console.error('Галерея не найдена в документе')
            throw new Error('Галерея не найдена в документе')
          }

          console.log('Найдена актуальная позиция галереи:', targetPos)
          
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              const galleryNode = tr.doc.nodeAt(targetPos)
              if (galleryNode) {
                const insertPos = targetPos + galleryNode.nodeSize - 1 // Вставляем в конец галереи
                console.log('Вставка изображения:', {
                  galleryPos: targetPos,
                  insertPos,
                  galleryNodeSize: galleryNode.nodeSize,
                  imageUrl: webpUrl
                })
                tr.insert(insertPos, editor.schema.nodes.image.create({
                  src: webpUrl,
                  alt: '',
                  title: ''
                }))
                return true
              }
              return false
            })
            .run()

          // Обновляем прогресс
          uploadProgress = {
            current: uploadProgress.current + 1,
            total: uploadProgress.total,
            percent: Math.round(((uploadProgress.current + 1) / uploadProgress.total) * 100)
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при добавлении изображений в галерею:', error)
      alert('Произошла ошибка при добавлении изображений. Пожалуйста, попробуйте снова.')
    } finally {
      isImageUploading = false
      uploadProgress = {
        current: 0,
        total: 0,
        percent: 0
      }
    }
  }

  const addGalleryImages = () => {
    // Сохраняем текущие значения галереи
    const targetGalleryElement = currentGalleryElement;
    const targetGalleryPos = currentGalleryPos;

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files
      if (files && files.length > 0) {
        try {
          // Временно восстанавливаем значения галереи
          currentGalleryElement = targetGalleryElement;
          currentGalleryPos = targetGalleryPos;
          
          await addImagesToGallery(files)
          
          // Очищаем значения после загрузки
          currentGalleryElement = null;
          currentGalleryPos = -1;
        } catch (error) {
          console.error('Ошибка при добавлении изображений в галерею:', error)
          alert('Произошла ошибка при загрузке изображений. Пожалуйста, попробуйте снова.')
        }
      }
    }
    
    hideContextMenu()
    input.click()
  }

  const deleteImage = () => {
    if (selectedImage && editor) {
      // Находим позицию изображения в документе
      let imagePos = -1
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === selectedImage.src) {
          imagePos = pos
          return false
        }
      })

      if (imagePos > -1) {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.delete(imagePos, imagePos + 1)
            return true
          })
          .run()
      }
      
      hideContextMenu()
    }
  }

  const deleteGallery = (galleryElement: HTMLElement) => {
    if (!editor) return
    
    let found = false
    editor.state.doc.descendants((node, pos) => {
      if (!found && node.type.name === 'gallery') {
        const domNode = editor.view.nodeDOM(pos)
        if (domNode === galleryElement) {
          found = true
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              try {
                tr.delete(pos, pos + node.nodeSize)
                return true
              } catch (error) {
                console.error('Ошибка при удалении галереи:', error)
                return false
              }
            })
            .run()
        }
      }
    })
    hideContextMenu()
  }

  const updateImageUrl = () => {
    if (selectedImage && editor && !contextType.isInGallery) {
      let imagePos = -1
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === selectedImage.src) {
          imagePos = pos
          return false
        }
      })

      if (imagePos > -1) {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            const node = tr.doc.nodeAt(imagePos)
            if (node && node.type.name === 'image') {
              const newAttrs = {
                ...node.attrs,
                'data-url': editingImageUrl || null // Если пустая строка, устанавливаем null
              }
              tr.setNodeMarkup(imagePos, null, newAttrs)
              return true
            }
            return false
          })
          .run()
      }
      
      showImageUrlEdit = false
      selectedImage = null
      editingImageUrl = ''
      hideContextMenu()
    }
  }

  onMount(() => {
    // Извлекаем существующие данные из value при монтировании
    const previewImageMatch = value.match(/<preview-image>(.*?)<\/preview-image>/)
    const previewDescMatch = value.match(/<preview-description>(.*?)<\/preview-description>/)
    const metaTitleMatch = value.match(/<meta-title>(.*?)<\/meta-title>/)
    const metaDescMatch = value.match(/<meta-description>(.*?)<\/meta-description>/)
    
    if (previewImageMatch) {
      previewImage = previewImageMatch[1]
    }
    if (previewDescMatch) {
      previewDescription = previewDescMatch[1]
    }
    if (metaTitleMatch) {
      metaTitle = metaTitleMatch[1]
    }
    if (metaDescMatch) {
      metaDescription = metaDescMatch[1]
    }

    // Удаляем теги из контента редактора
    const contentWithoutTags = value
      .replace(/<preview-image>.*?<\/preview-image>/, '')
      .replace(/<preview-description>.*?<\/preview-description>/, '')
      .replace(/<meta-title>.*?<\/meta-title>/, '')
      .replace(/<meta-description>.*?<\/meta-description>/, '')

    editor = new Editor({
      element: element,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: placeholder,
        }),
        Link.configure({
          openOnClick: false,
        }),
        CustomImage,
        Gallery,
      ],
      content: contentWithoutTags,
      onUpdate: ({ editor }) => {
        updateMarkdown(editor.getHTML())
        updateFormatting()
        characterCount = editor.getHTML().length
      },
      onSelectionUpdate: () => {
        updateToolbarPosition()
        updateFormatting()
      }
    })

    // Инициализируем начальное значение счетчика
    characterCount = editor.getHTML().length

    element.addEventListener('contextmenu', handleContextMenu)
    
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('scroll', hideContextMenu)
  })

  onDestroy(() => {
    if (editor) {
      element.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('scroll', hideContextMenu)
      editor.destroy()
    }
  })
</script>

<div class="flex flex-col gap-1 relative editor-container">
  {#if label}
    <span class="font-medium text-sm text-slate-600 dark:text-slate-300">{label}</span>
  {/if}

  {#if editor}
    <div class="toolbar bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-2 mb-2 flex items-center gap-2">
      <div class="flex items-center gap-1">
        <button
          class="toolbar-btn"
          class:active={formatting.bold}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleBold().run()
            updateFormatting()
          }}
          type="button"
          title="Полужирный (⌘B)"
        >
          Ж
        </button>
        <button
          class="toolbar-btn"
          class:active={formatting.italic}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleItalic().run()
            updateFormatting()
          }}
          type="button"
          title="Курсив (⌘I)"
        >
          К
        </button>
      </div>

      <div class="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

      <div class="flex items-center gap-1">
        <button
          class="toolbar-btn"
          class:active={formatting.heading2}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
            updateFormatting()
          }}
          type="button"
          title="Заголовок 2"
        >
          H2
        </button>
        <button
          class="toolbar-btn"
          class:active={formatting.heading3}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
            updateFormatting()
          }}
          type="button"
          title="Заголовок 3"
        >
          H3
        </button>
      </div>

      <div class="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

      <div class="flex items-center gap-1">
        <button
          class="toolbar-btn"
          class:active={formatting.bulletList}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleBulletList().run()
            updateFormatting()
          }}
          type="button"
          title="Маркированный список"
        >
          •
        </button>
        <button
          class="toolbar-btn"
          class:active={formatting.orderedList}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleOrderedList().run()
            updateFormatting()
          }}
          type="button"
          title="Нумерованный список"
        >
          1.
        </button>
        <button
          class="toolbar-btn"
          class:active={formatting.blockquote}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleBlockquote().run()
            updateFormatting()
          }}
          type="button"
          title="Цитата"
        >
          "
        </button>
        <button
          class="toolbar-btn"
          class:active={formatting.codeBlock}
          on:click|preventDefault|stopPropagation={() => {
            editor?.chain().focus().toggleCodeBlock().run()
            updateFormatting()
          }}
          type="button"
          title="Блок кода"
        >
          {`</>`}
        </button>
      </div>

      <div class="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

      <div class="flex items-center gap-1">
        <button
          class="toolbar-btn"
          class:active={formatting.link}
          on:click|preventDefault|stopPropagation={toggleLink}
          type="button"
          title="Добавить ссылку (⌘K)"
        >
          🔗
        </button>
        <button
          class="toolbar-btn"
          on:click|preventDefault|stopPropagation={addImage}
          type="button"
          title="Вставить изображение"
        >
          📷
        </button>
        <button
          class="toolbar-btn"
          on:click|preventDefault|stopPropagation={() => {
            editor.chain().focus().insertGallery().run()
          }}
          type="button"
          title="Добавить галерею"
        >
          🖼️
        </button>
      </div>
    </div>
  {/if}

  {#if showLinkInput}
    <div class="absolute top-0 left-0 right-0 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-2 z-50">
      <div class="flex gap-2">
        <input
          type="url"
          bind:value={linkUrl}
          placeholder="Введите URL..."
          class="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:keydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              setLink();
            }
          }}
        />
        <Button size="sm" on:click={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLink();
        }}>Добавить</Button>
      </div>
    </div>
  {/if}

  {#if showImageTitleEdit}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-slate-800 rounded-lg p-4 w-full max-w-md">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ALT изображения
          </label>
          <input
            type="text"
            bind:value={editingImageAlt}
            placeholder="Что на этой картинке?"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 mb-4"
          />
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Title изображения
          </label>
          <input
            type="text"
            bind:value={editingImageTitle}
            placeholder="Подсказка при наведении"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button 
            color="ghost" 
            on:click={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showImageTitleEdit = false;
              selectedImage = null;
              editingImageAlt = '';
              editingImageTitle = '';
            }}
          >
            Отмена
          </Button>
          <Button on:click={(e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageTitle();
          }}>Сохранить</Button>
        </div>
      </div>
    </div>
  {/if}

  {#if showImageUrlEdit}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-slate-800 rounded-lg p-4 w-full max-w-md">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            URL изображения
          </label>
          <input
            type="url"
            bind:value={editingImageUrl}
            placeholder="https://example.com"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button 
            color="ghost" 
            on:click={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showImageUrlEdit = false;
              selectedImage = null;
              editingImageUrl = '';
            }}
          >
            Отмена
          </Button>
          <Button on:click={(e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageUrl();
          }}>Сохранить</Button>
        </div>
      </div>
    </div>
  {/if}

  {#if isImageUploading}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-4">
        <div class="spinner"></div>
        <div class="flex flex-col items-center gap-2">
          <p class="text-slate-600 dark:text-slate-300">
            {#if uploadProgress.total > 1}
              Загрузка изображений ({uploadProgress.current + 1} из {uploadProgress.total})
            {:else}
              Загрузка изображения...
            {/if}
          </p>
          {#if uploadProgress.total > 1}
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 max-w-[200px]">
              <div 
                class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style="width: {uploadProgress.percent}%"
              ></div>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">{uploadProgress.percent}%</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if editor && showContextMenu}
    <div
      class="context-menu"
      style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px"
      bind:this={contextMenuRef}
    >
      {#if !contextType.isGallery && !contextType.isInGallery && !contextType.isImage}
        <div class="menu-group">
          <button
            class="context-menu-item"
            class:active={editor.isActive('bold')}
            on:click|preventDefault|stopPropagation={() => {
              editor.chain().focus().toggleBold().run()
              updateFormatting()
              hideContextMenu()
            }}
          >
            <span class="icon">Ж</span>
            <span>Полужирный</span>
            <span class="shortcut">⌘B</span>
          </button>
          <button
            class="context-menu-item"
            class:active={editor.isActive('italic')}
            on:click|preventDefault|stopPropagation={() => {
              editor.chain().focus().toggleItalic().run()
              updateFormatting()
              hideContextMenu()
            }}
          >
            <span class="icon">К</span>
            <span>Курсив</span>
            <span class="shortcut">⌘I</span>
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-group">
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              addBlock('heading2')
              hideContextMenu()
            }}
          >
            <span class="icon text-lg">H2</span>
            <span>Заголовок 2</span>
          </button>
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              addBlock('heading3')
              hideContextMenu()
            }}
          >
            <span class="icon text-base">H3</span>
            <span>Заголовок 3</span>
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-group">
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              addBlock('bulletList')
              hideContextMenu()
            }}
          >
            <span class="icon">•</span>
            <span>Маркированный список</span>
          </button>
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              addBlock('orderedList')
              hideContextMenu()
            }}
          >
            <span class="icon">1.</span>
            <span>Нумерованный список</span>
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-group">
          <button
            class="context-menu-item"
            class:active={editor.isActive('blockquote')}
            on:click|preventDefault|stopPropagation={() => {
              editor.chain().focus().toggleBlockquote().run()
              updateFormatting()
              hideContextMenu()
            }}
          >
            <span class="icon">"</span>
            <span>Цитата</span>
          </button>
          <button
            class="context-menu-item"
            class:active={editor.isActive('codeBlock')}
            on:click|preventDefault|stopPropagation={() => {
              editor.chain().focus().toggleCodeBlock().run()
              updateFormatting()
              hideContextMenu()
            }}
          >
            <span class="icon">{`</>`}</span>
            <span>Блок кода</span>
          </button>
        </div>

        <div class="menu-divider"></div>
      {/if}

      <div class="menu-group">
        {#if !contextType.isImage && !contextType.isInGallery && !contextType.isGallery}
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              toggleLink()
              hideContextMenu()
            }}
          >
            <span class="icon">🔗</span>
            <span>Добавить ссылку</span>
            <span class="shortcut">⌘K</span>
          </button>
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              addImage()
              hideContextMenu()
            }}
          >
            <span class="icon">📷</span>
            <span>Вставить изображение</span>
          </button>
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              editor.chain().focus().insertGallery().run()
              hideContextMenu()
            }}
          >
            <span class="icon">🖼️</span>
            <span>Добавить галерею</span>
          </button>
        {/if}

        {#if contextType.isGallery || (contextType.isImage && contextType.isInGallery)}
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              addGalleryImages()
              hideContextMenu()
            }}
          >
            <span class="icon">➕</span>
            <span>Добавить изображение в галерею</span>
          </button>
          {#if contextType.isGallery}
            <button
              class="context-menu-item delete"
              on:click|preventDefault|stopPropagation={handleGalleryDelete}
            >
              <span class="icon">🗑️</span>
              <span>Удалить галерею</span>
            </button>
          {/if}
        {/if}
      </div>

      {#if contextType.isImage}
        <div class="menu-divider"></div>
        <div class="menu-group">
          <button
            class="context-menu-item"
            on:click|preventDefault|stopPropagation={() => {
              showImageTitleEdit = true
              hideContextMenu()
            }}
          >
            <span class="icon">✏️</span>
            <span>Редактировать alt/title</span>
          </button>
          {#if !contextType.isInGallery}
            <button
              class="context-menu-item"
              on:click|preventDefault|stopPropagation={() => {
                if (selectedImage) {
                  editingImageUrl = selectedImage.getAttribute('data-url') || ''
                  showImageUrlEdit = true
                  hideContextMenu()
                }
              }}
            >
              <span class="icon">🔗</span>
              <span>Добавить URL</span>
            </button>
          {/if}
          {#if !contextType.isInGallery}
            <button
              class="context-menu-item"
              on:click|preventDefault|stopPropagation={setPreviewImage}
            >
              <span class="icon">🖼️</span>
              <span>Использовать как превью</span>
            </button>
          {/if}
          <button
            class="context-menu-item delete"
            on:click|preventDefault|stopPropagation={deleteImage}
          >
            <span class="icon">🗑️</span>
            <span>Удалить изображение</span>
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <div
    class="min-h-[400px] p-3 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all duration-200 editor-content bg-white dark:bg-slate-800 border dark:border-slate-700"
    bind:this={element}
  />

  {#if false}
  <div class="mt-2">
    <div class="flex items-center gap-4">
      <Button
        size="sm"
        color="ghost"
        on:click={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showMarkdown = !showMarkdown;
        }}
      >
        {showMarkdown ? 'Скрыть Markdown' : 'Показать Markdown'}
      </Button>
      
      <span class="text-sm text-slate-500 dark:text-slate-400">
        {markdownOutput.length} символов
      </span>
    </div>

    {#if showMarkdown}
      <pre class="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
        <code>{markdownOutput}</code>
      </pre>
    {/if}
  </div>
  {/if}

  <div class="mt-4 space-y-4">
    <div class="flex flex-col gap-1">
      <label for="previewDescription" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        Описание анонса
      </label>
      <textarea
        id="previewDescription"
        bind:value={previewDescription}
        on:input={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateMarkdown(editor.getHTML());
        }}
        placeholder="Введите описание анонса..."
        rows="3"
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 resize-none"
      ></textarea>
    </div>

    <div class="flex flex-col gap-1">
      <label for="previewImage" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        Картинка анонса
      </label>
      <div class="flex gap-2">
        <input
          id="previewImage"
          type="text"
          bind:value={previewImage}
          readonly
          placeholder="Выберите картинку анонса в тексте"
          class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
        />
        {#if previewImage}
          <Button
            size="sm"
            color="ghost"
            on:click={(e) => {
              e.preventDefault();
              e.stopPropagation();
              previewImage = '';
              updateMarkdown(editor.getHTML());
            }}
            title="Очистить картинку анонса"
          >
            ✕
          </Button>
        {/if}
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label for="metaTitle" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        Meta Title
      </label>
      <input
        id="metaTitle"
        type="text"
        bind:value={metaTitle}
        on:input={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateMarkdown(editor.getHTML());
        }}
        placeholder="Введите meta title..."
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label for="metaDescription" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        Meta Description
      </label>
      <textarea
        id="metaDescription"
        bind:value={metaDescription}
        on:input={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateMarkdown(editor.getHTML());
        }}
        placeholder="Введите meta description..."
        rows="3"
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 resize-none"
      ></textarea>
    </div>
  </div>
</div>

<style>
  .editor-container {
    position: relative;
  }

  .editor-content {
    /* padding-left: 2.5rem; */
  }

  .floating-toolbar {
    position: fixed;
    transform: translateX(-50%) translateY(-100%);
    z-index: 50;
    pointer-events: all;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .toolbar-btn {
    padding: 0.5rem;
    border-radius: 0.375rem;
    font-size: 1rem;
    color: #4b5563;
    background: transparent;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
  }

  .toolbar-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .toolbar-btn.active {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
  }

  :global(.ProseMirror) {
    outline: none;
    min-height: 200px;
  }
  
  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
    font-style: italic;
  }

  :global(.ProseMirror blockquote) {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #4b5563;
  }

  :global(.ProseMirror code) {
    background-color: rgba(97, 97, 97, 0.1);
    border-radius: 4px;
    padding: 0.2em 0.4em;
    font-family: monospace;
  }

  :global(.ProseMirror ul), :global(.ProseMirror ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    margin: 1rem 0;
    border-radius: 4px;
    cursor: help;
  }

  :global(.ProseMirror img[title]:hover::after) {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
    z-index: 10;
  }

  :global(.ProseMirror img[alt]:hover::before) {
    content: attr(alt);
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
    z-index: 10;
    margin-top: 4px;
  }

  :global(.dark) .ProseMirror img[title]:hover::after,
  :global(.dark) .ProseMirror img[alt]:hover::before {
    background: rgba(255, 255, 255, 0.9);
    color: black;
  }

  .context-menu {
    position: fixed;
    z-index: 100;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 240px;
    padding: 4px;
    border: 1px solid #e5e7eb;
  }

  .menu-group {
    padding: 4px 0;
  }

  .menu-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 4px 0;
  }

  .context-menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: #4b5563;
    font-size: 14px;
    text-align: left;
  }

  .context-menu-item:hover {
    background: #f3f4f6;
  }

  .context-menu-item.active {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
  }

  .context-menu-item .icon {
    width: 20px;
    margin-right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .context-menu-item .shortcut {
    margin-left: auto;
    color: #9ca3af;
    font-size: 12px;
  }

  :global(.dark) .context-menu {
    background: #1f2937;
    border-color: #374151;
  }

  :global(.dark) .menu-divider {
    background: #374151;
  }

  :global(.dark) .context-menu-item {
    color: #e5e7eb;
  }

  :global(.dark) .context-menu-item:hover {
    background: #374151;
  }

  :global(.dark) .context-menu-item .shortcut {
    color: #6b7280;
  }

  /* Стили для заголовков */
  :global(.ProseMirror h2) {
    font-size: 1.5em;
    font-weight: 600;
    line-height: 1.3;
    margin: 0.8em 0 0.4em;
  }

  :global(.ProseMirror h3) {
    font-size: 1.25em;
    font-weight: 600;
    line-height: 1.4;
    margin: 0.6em 0 0.3em;
  }

  /* Стили для параграфов */
  :global(.ProseMirror p) {
    margin: 0.5em 0;
    line-height: 1.6;
  }

  /* Стили для списков */
  :global(.ProseMirror ul), :global(.ProseMirror ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  :global(.ProseMirror ul) {
    list-style-type: disc;
  }

  :global(.ProseMirror ul ul) {
    list-style-type: circle;
  }

  :global(.ProseMirror ul ul ul) {
    list-style-type: square;
  }

  :global(.ProseMirror ol) {
    list-style-type: decimal;
  }

  :global(.ProseMirror ol ol) {
    list-style-type: lower-alpha;
  }

  :global(.ProseMirror ol ol ol) {
    list-style-type: lower-roman;
  }

  :global(.ProseMirror li) {
    margin: 0.2em 0;
  }

  /* Стили для цитат */
  :global(.ProseMirror blockquote) {
    border-left: 3px solid #e5e7eb;
    padding: 0.5em 0 0.5em 1em;
    margin: 1em 0;
    color: #4b5563;
    font-style: italic;
    background: rgba(0, 0, 0, 0.02);
  }

  /* Стили для кода */
  :global(.ProseMirror pre) {
    background-color: #f3f4f6;
    border-radius: 4px;
    padding: 0.75em 1em;
    margin: 1em 0;
    overflow-x: auto;
    font-family: monospace;
  }

  :global(.ProseMirror code) {
    background-color: rgba(97, 97, 97, 0.1);
    border-radius: 4px;
    padding: 0.2em 0.4em;
    font-family: monospace;
    font-size: 0.9em;
  }

  /* Стили для изображений */
  :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
    border-radius: 4px;
    display: block;
  }

  /* Стили для ссылок */
  :global(.ProseMirror a) {
    color: #0000EE;
    text-decoration: underline;
    text-decoration-thickness: 0.1em;
    text-underline-offset: 0.15em;
    transition: all 0.2s;
  }

  :global(.ProseMirror a:hover) {
    color: #0000EE;
    text-decoration-thickness: 0.2em;
  }

  /* Темная тема */
  :global(.dark) .ProseMirror {
    color: #e5e7eb;
  }

  :global(.dark) .ProseMirror blockquote {
    border-color: #374151;
    color: #9ca3af;
    background: rgba(255, 255, 255, 0.02);
  }

  :global(.dark) .ProseMirror pre {
    background-color: #1f2937;
  }

  :global(.dark) .ProseMirror code {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .ProseMirror a {
    color: #60a5fa;
  }

  :global(.dark) .ProseMirror a:hover {
    color: #93c5fd;
  }

  :global(.dark) .toolbar-btn {
    color: #e5e7eb;
  }

  :global(.dark) .toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  :global(.dark) .toolbar-btn.active {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  /* Стили для галереи */
  :global(.ProseMirror .post-gallery) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: rgba(37, 99, 235, 0.05);
    border: 2px dashed rgba(37, 99, 235, 0.2);
    border-radius: 8px;
    margin: 1rem 0;
    transition: all 0.2s ease;
  }

  :global(.ProseMirror .post-gallery:hover) {
    background: rgba(37, 99, 235, 0.08);
    border-color: rgba(37, 99, 235, 0.3);
  }

  :global(.dark) .ProseMirror .post-gallery {
    background: rgba(96, 165, 250, 0.05);
    border-color: rgba(96, 165, 250, 0.2);
  }

  :global(.dark) .ProseMirror .post-gallery:hover {
    background: rgba(96, 165, 250, 0.08);
    border-color: rgba(96, 165, 250, 0.3);
  }

  .context-menu-item.delete {
    color: #ef4444;
  }

  .context-menu-item.delete:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  :global(.dark) .context-menu-item.delete {
    color: #f87171;
  }

  :global(.dark) .context-menu-item.delete:hover {
    background: rgba(248, 113, 113, 0.1);
  }

  :global(.ProseMirror img[data-url]) {
    position: relative;
    cursor: pointer;
  }

  :global(.ProseMirror img[data-url]:hover::after) {
    content: attr(data-url);
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
    z-index: 10;
  }

  :global(.dark) .ProseMirror img[data-url]:hover::after {
    background: rgba(255, 255, 255, 0.9);
    color: black;
  }

  /* Стили для прогресс-бара */
  .progress-bar {
    transition: width 0.3s ease;
  }

  /* Стили для спиннера */
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  :global(.dark) .spinner {
    border-color: #374151;
    border-top-color: #60a5fa;
  }
</style> 