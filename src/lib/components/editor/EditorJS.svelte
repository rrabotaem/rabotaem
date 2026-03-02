<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { profile } from '$lib/auth'
  import { uploadImage, uploadVideo, getVideoDuration, serializeEditorModel, deserializeEditorModel } from '$lib/util'
  import { toast } from 'mono-svelte'
  import { Button } from 'mono-svelte'
  import CustomInputTune from './CustomInputTune'
  import './CustomInputTune.css'
  import { saveDraft, getDraft, formatLastSaved, getDraftLastSaved } from '$lib/session'

  // Импортируем иконки
  const iconPath = '/img/editorjs'
  const icons = {
    delete: `${iconPath}/x-lg.svg`,
    moveDown: `${iconPath}/chevron-down.svg`,
    convert: `${iconPath}/arrow-repeat.svg`,
    moveUp: `${iconPath}/chevron-up.svg`,
    gallery: `${iconPath}/images.svg`,
    code: `${iconPath}/code-slash.svg`,
    header: `${iconPath}/type-h2.svg`,
    unorderedList: `${iconPath}/list-ul.svg`,
    orderedList: `${iconPath}/list-ol.svg`,
    checklist: `${iconPath}/list-check.svg`,
    quote: `${iconPath}/quote.svg`,
    image: `${iconPath}/card-image.svg`,
    video: `${iconPath}/images.svg`, // Используем иконку галереи как временную, можно заменить на специальную для видео
    link: `${iconPath}/link-45deg.svg`,
    italic: `${iconPath}/type-italic.svg`,
    bold: `${iconPath}/type-bold.svg`,
    text: `${iconPath}/type.svg`,
    table: `${iconPath}/table.svg`
  }

  // Кастомный плагин для ссылок
  class CustomLinkTool {
    private api: any;
    private data: { url: string; title: string; text: string; style?: string };
    private config: any;
    private wrapper: HTMLElement | null = null;
    private suggestionList: HTMLElement | null = null;

    static get toolbox() {
      return {
        title: 'Ссылка',
        icon: `<img src="${icons.link}" width="16" height="16" />`
      }
    }

    constructor({ data, config, api }: { data?: { url: string; title: string; text: string; style?: string }, config?: any, api?: any }) {
      this.api = api;
      this.data = {
        url: data?.url || '',
        title: data?.title || '',
        text: data?.text || '',
        style: data?.style || 'link'
      };
      this.config = config || {};
    }

    private async getAnchors(): Promise<string[]> {
      const anchors: string[] = [];
      const count = this.api.blocks.getBlocksCount();
      
      console.log('Blocks count:', count);
      
      for (let i = 0; i < count; i++) {
        const block = this.api.blocks.getBlockByIndex(i);
        const data = await block.save();
        //console.log('Block data:', data);
        
        // Проверяем разные возможные пути к якорю
        const anchorText = data?.tunes?.anchorInput?.text || 
                         data?.tunes?.customInput?.text || 
                         block?.tunes?.anchorInput?.text ||
                         block?.tunes?.customInput?.text;
                         
        if (anchorText) {
          //console.log('Found anchor:', anchorText);
          anchors.push(anchorText);
        }
      }
      
      //console.log('All anchors:', anchors);
      return anchors;
    }

    private async createSuggestionList() {
      if (this.suggestionList) {
        this.suggestionList.remove();
      }

      const suggestionList = document.createElement('div');
      suggestionList.classList.add('link-suggestions');
      this.suggestionList = suggestionList;
      
      const anchors = await this.getAnchors();
      if (anchors.length > 0) {
        const title = document.createElement('div');
        title.classList.add('link-suggestions__title');
        title.textContent = 'Якоря в материале:';
        suggestionList.appendChild(title);
        
        anchors.forEach(anchor => {
          if (!anchor) return;
          
          const item = document.createElement('div');
          item.classList.add('link-suggestions__item');
          item.textContent = `#${anchor}`;
          item.onclick = () => {
            if (this.wrapper) {
              const urlInput = this.wrapper.querySelector('input:nth-child(2)') as HTMLInputElement;
              if (urlInput) {
                urlInput.value = `#${anchor}`;
                this.data.url = `#${anchor}`;
                this.data.title = `Якорь: ${anchor}`;
              }
            }
            suggestionList.remove();
          };
          suggestionList.appendChild(item);
        });
      }

      return suggestionList;
    }

    render() {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('link-tool');
      
      const textInput = document.createElement('input');
      textInput.classList.add('link-tool__input');
      textInput.placeholder = 'Введите текст ссылки...';
      textInput.value = this.data.text;
      
      textInput.addEventListener('input', () => {
        this.data.text = textInput.value;
      });
      
      const urlWrapper = document.createElement('div');
      urlWrapper.classList.add('link-tool__row');
      
      const urlInput = document.createElement('input');
      urlInput.classList.add('link-tool__input', 'link-tool__input--url');
      urlInput.placeholder = 'Вставьте URL или выберите якорь...';
      urlInput.value = this.data.url;
      
      urlInput.addEventListener('input', () => {
        this.data.url = urlInput.value;
      });
      
      urlInput.addEventListener('focus', async () => {
        const suggestions = await this.createSuggestionList();
        this.wrapper?.appendChild(suggestions);
      });
      
      urlInput.addEventListener('blur', () => {
        // Небольшая задержка, чтобы успеть обработать клик по подсказке
        setTimeout(() => {
          this.suggestionList?.remove();
        }, 200);
      });

      const styleSelect = document.createElement('select');
      styleSelect.classList.add('link-tool__input', 'link-tool__input--select');
      styleSelect.innerHTML = `
        <option value="link">Обычная ссылка</option>
        <option value="btn-primary">Кнопка Primary</option>
      `;
      styleSelect.value = this.data.style || 'link';
      
      styleSelect.addEventListener('change', () => {
        console.log('Style changed to:', styleSelect.value);
        this.data.style = styleSelect.value;
        console.log('Updated data:', this.data);
        // Принудительно вызываем сохранение всего редактора
        editor.save().then((savedData: any) => {
          console.log('Editor saved data:', savedData);
          updateMarkdown(savedData);
        });
      });
      
      urlWrapper.appendChild(urlInput);
      urlWrapper.appendChild(styleSelect);
      
      this.wrapper.appendChild(textInput);
      this.wrapper.appendChild(urlWrapper);
      
      return this.wrapper;
    }

    save() {
      console.log('Save method called, current data:', this.data);
      const savedData = {
        text: this.data.text,
        url: this.data.url,
        style: this.data.style || 'link'
      };
      console.log('Returning saved data:', savedData);
      return savedData;
    }
  }

  // Кастомный плагин для галереи
  class GalleryTool {
    private api: any;
    private data: { images: Array<{ url: string; alt: string; title: string }> };
    private config: any;
    private isUploading: boolean = false;

    static get toolbox() {
      return {
        title: 'Галерея',
        icon: `<img src="${icons.gallery}" width="16" height="16" />`
      }
    }

    constructor({ data, config, api }: { data?: { images: Array<{ url: string; alt: string; title: string }> }, config?: any, api?: any }) {
      this.api = api
      this.data = {
        images: Array.isArray(data?.images) ? data.images : []
      }
      this.config = config || {}
    }

    render() {
      const wrapper = document.createElement('div')
      wrapper.classList.add('gallery-wrapper')
      
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = 'image/*'
      input.style.display = 'none'
      
      const button = document.createElement('button')
      button.classList.add('gallery-button')
      button.textContent = 'Добавить изображения'
      button.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        input.click()
      }
      
      const gallery = document.createElement('div')
      gallery.classList.add('gallery-grid')
      
      const loader = document.createElement('div')
      loader.classList.add('gallery-loader')
      loader.innerHTML = `
        <div class="gallery-loader-spinner"></div>
        <div class="gallery-loader-text">Загрузка изображений...</div>
      `
      
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement
        if (!target.files) return
        
        const files = Array.from(target.files)
        if (files.length > 0 && $profile?.jwt) {
          try {
            this.isUploading = true
            wrapper.appendChild(loader)
            button.disabled = true
            button.textContent = 'Загрузка...'
            
            for (const file of files) {
              const imageUrl = await uploadImage(file, $profile.instance, $profile.jwt)
              if (imageUrl) {
                this.data.images.push({
                  url: `${imageUrl}?format=webp`,
                  alt: '',
                  title: ''
                })
                this.renderGallery(gallery)
              }
            }
          } catch (error) {
            console.error('Ошибка при загрузке изображения:', error)
          } finally {
            this.isUploading = false
            wrapper.removeChild(loader)
            button.disabled = false
            button.textContent = 'Добавить изображения'
          }
        }
      }
      
      wrapper.appendChild(button)
      wrapper.appendChild(input)
      wrapper.appendChild(gallery)
      
      this.renderGallery(gallery)
      
      return wrapper
    }

    renderGallery(container: HTMLElement) {
      if (!container || !this.data?.images) return
      
      container.innerHTML = ''
      
      if (!Array.isArray(this.data.images)) {
        this.data.images = []
      }
      
      // Добавляем обработчик клика вне панели
      const closePanels = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.gallery-settings-panel') && !target.closest('.gallery-settings')) {
          const openPanels = container.querySelectorAll('.gallery-settings-panel')
          openPanels.forEach(panel => panel.remove())
          document.removeEventListener('click', closePanels)
        }
      }
      
      this.data.images.forEach((image: { url: string; alt: string; title: string }, index: number) => {
        const imgWrapper = document.createElement('div')
        imgWrapper.classList.add('gallery-item')
        imgWrapper.draggable = true
        imgWrapper.dataset.index = index.toString()
        
        // Добавляем обработчики drag and drop
        imgWrapper.ondragstart = (e) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData('application/x-gallery-item', index.toString())
            e.dataTransfer.effectAllowed = 'move'
            
            // Создаем миниатюру для перетаскивания
            const dragImage = document.createElement('div')
            dragImage.style.position = 'absolute'
            dragImage.style.top = '-1000px'
            dragImage.style.width = '100px'
            dragImage.style.height = '100px'
            dragImage.style.background = `url(${image.url}) center/cover`
            dragImage.style.borderRadius = '4px'
            dragImage.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
            document.body.appendChild(dragImage)
            
            // Устанавливаем смещение курсора относительно миниатюры
            e.dataTransfer.setDragImage(dragImage, 50, 50)
            
            setTimeout(() => {
              document.body.removeChild(dragImage)
            }, 0)
          }
          imgWrapper.classList.add('dragging')
        }
        
        imgWrapper.ondragend = () => {
          imgWrapper.classList.remove('dragging')
        }
        
        imgWrapper.ondragover = (e) => {
          e.preventDefault()
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move'
          }
          const draggingItem = container.querySelector('.dragging')
          if (draggingItem !== imgWrapper) {
            imgWrapper.classList.add('drag-over')
          }
        }
        
        imgWrapper.ondragleave = () => {
          imgWrapper.classList.remove('drag-over')
        }
        
        imgWrapper.ondrop = (e) => {
          e.preventDefault()
          imgWrapper.classList.remove('drag-over')
          
          const fromIndex = e.dataTransfer ? parseInt(e.dataTransfer.getData('application/x-gallery-item') || '0') : 0
          const toIndex = parseInt(imgWrapper.dataset.index || '0')
          
          if (fromIndex !== toIndex) {
            const images = [...this.data.images]
            const [movedImage] = images.splice(fromIndex, 1)
            images.splice(toIndex, 0, movedImage)
            this.data.images = images
            this.renderGallery(container)
          }
        }
        
        const img = document.createElement('img')
        img.src = image.url
        img.alt = image.alt
        img.title = image.title
        
        // Добавляем обработчик загрузки изображения
        img.onload = () => {
          imgWrapper.classList.add('loaded')
        }
        
        // Добавляем обработчик ошибки загрузки
        img.onerror = () => {
          console.error('Ошибка загрузки изображения:', image.url)
          imgWrapper.classList.add('error')
        }
        
        const removeBtn = document.createElement('button')
        removeBtn.classList.add('gallery-remove')
        removeBtn.textContent = '×'
        removeBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (Array.isArray(this.data.images)) {
            this.data.images.splice(index, 1)
            this.renderGallery(container)
          }
        }
        
        const settingsBtn = document.createElement('button')
        settingsBtn.classList.add('gallery-settings')
        settingsBtn.textContent = '⚙️'
        settingsBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          // Проверяем, есть ли уже открытая панель для этого изображения
          const existingPanel = imgWrapper.querySelector('.gallery-settings-panel')
          if (existingPanel) {
            existingPanel.remove()
            return
          }
          
          // Закрываем все открытые панели
          const openPanels = container.querySelectorAll('.gallery-settings-panel')
          openPanels.forEach(panel => panel.remove())
          
          const altInput = document.createElement('input')
          altInput.type = 'text'
          altInput.classList.add('gallery-input')
          altInput.placeholder = 'Alt текст'
          altInput.value = image.alt
          altInput.onchange = (e) => {
            e.preventDefault()
            e.stopPropagation()
            image.alt = altInput.value
            img.alt = altInput.value
          }
          
          const titleInput = document.createElement('input')
          titleInput.type = 'text'
          titleInput.classList.add('gallery-input')
          titleInput.placeholder = 'Title текст'
          titleInput.value = image.title
          titleInput.onchange = (e) => {
            e.preventDefault()
            e.stopPropagation()
            image.title = titleInput.value
            img.title = titleInput.value
          }
          
          const settingsPanel = document.createElement('div')
          settingsPanel.classList.add('gallery-settings-panel')
          settingsPanel.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
          }
          settingsPanel.appendChild(altInput)
          settingsPanel.appendChild(titleInput)
          
          imgWrapper.appendChild(settingsPanel)
          
          // Добавляем обработчик клика вне панели
          document.addEventListener('click', closePanels)
        }
        
        imgWrapper.appendChild(img)
        imgWrapper.appendChild(removeBtn)
        imgWrapper.appendChild(settingsBtn)
        container.appendChild(imgWrapper)
      })
    }

    save() {
      return {
        images: Array.isArray(this.data?.images) ? this.data.images : []
      }
    }
  }

  // Кастомный плагин для изображений
  class CustomImageTool {
    private api: any;
    private data: { file: { url: string; alt: string; title: string }; caption: string };
    private config: any;
    private isUploading: boolean = false;

    static get toolbox() {
      return {
        title: 'Изображение',
        icon: `<img src="${icons.image}" width="16" height="16" />`
      }
    }

    constructor({ data, config, api }: { data?: { file: { url: string; alt: string; title: string }; caption: string }, config?: any, api?: any }) {
      this.api = api
      this.data = {
        file: {
          url: data?.file?.url || '',
          alt: data?.file?.alt || '',
          title: data?.file?.title || ''
        },
        caption: data?.caption || ''
      }
      this.config = config || {}
    }

    render() {
      const wrapper = document.createElement('div')
      wrapper.classList.add('image-tool__wrapper')
      
      const imageWrapper = document.createElement('div')
      imageWrapper.classList.add('image-tool__image-wrapper')
      
      const image = document.createElement('img')
      image.src = this.data.file.url
      image.alt = this.data.file.alt
      image.title = this.data.file.title
      
      const previewControl = document.createElement('div')
      previewControl.classList.add('image-tool__preview-control')
      
      // Показываем контрол только если изображение уже загружено
      if (!this.data.file.url) {
        previewControl.style.display = 'none'
      }
      
      const isPreview = Boolean(this.data.file.url && this.data.file.url === previewImage)
      previewControl.classList.toggle('active', isPreview)
      previewControl.innerHTML = `
        <span class="preview-star">${isPreview ? '★' : '☆'}</span>
        <span class="preview-text">Вывести в ленте</span>
      `
      previewControl.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (this.data.file.url) {
          // Если выбираем новое изображение, сначала очищаем все остальные
          if (this.data.file.url !== previewImage) {
            // Находим все контролы в редакторе
            const allControls = document.querySelectorAll('.image-tool__preview-control')
            allControls.forEach(control => {
              control.classList.remove('active')
              const star = control.querySelector('.preview-star')
              if (star) {
                star.textContent = '☆'
              }
            })
          }
          
          // Устанавливаем новое значение previewImage
          previewImage = this.data.file.url === previewImage ? '' : this.data.file.url
          
          // Обновляем текущий контрол
          previewControl.classList.toggle('active', Boolean(this.data.file.url === previewImage))
          const star = previewControl.querySelector('.preview-star')
          if (star) {
            star.textContent = this.data.file.url === previewImage ? '★' : '☆'
          }
          
          editor.save().then(updateMarkdown)
        }
      }
      
      const caption = document.createElement('textarea')
      caption.classList.add('image-tool__caption')
      caption.placeholder = 'Введите подпись к изображению...'
      caption.value = this.data.caption
      caption.onchange = () => {
        this.data.caption = caption.value
      }
      
      const altInput = document.createElement('input')
      altInput.type = 'text'
      altInput.classList.add('image-tool__alt')
      altInput.placeholder = 'Описание изображения для поисковиков (ALT)'
      altInput.value = this.data.file.alt
      altInput.onchange = () => {
        this.data.file.alt = altInput.value
        image.alt = altInput.value
      }
      
      const titleInput = document.createElement('input')
      titleInput.type = 'text'
      titleInput.classList.add('image-tool__title')
      titleInput.placeholder = 'Подпись к изображению'
      titleInput.value = this.data.file.title
      titleInput.onchange = () => {
        this.data.file.title = titleInput.value
        image.title = titleInput.value
      }
      
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.style.display = 'none'
      
      const button = document.createElement('button')
      button.classList.add('image-tool__button')
      button.textContent = 'Загрузить изображение'
      button.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        input.click()
      }
      
      const loader = document.createElement('div')
      loader.classList.add('image-tool__loader')
      loader.innerHTML = `
        <div class="image-tool__loader-spinner"></div>
        <div class="image-tool__loader-text">Загрузка изображения...</div>
      `
      
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement
        if (!target.files) return
        
        const file = target.files[0]
        if (file && $profile?.jwt) {
          try {
            this.isUploading = true
            wrapper.appendChild(loader)
            button.disabled = true
            button.textContent = 'Загрузка...'
            
            const imageUrl = await uploadImage(file, $profile.instance, $profile.jwt)
            if (imageUrl) {
              this.data.file.url = `${imageUrl}?format=webp`
              image.src = this.data.file.url
              
              // Показываем контрол "Вывести в ленте" после успешной загрузки
              previewControl.style.display = 'flex'
              
              // Обновляем состояние контрола
              const isNowPreview = Boolean(this.data.file.url === previewImage)
              previewControl.classList.toggle('active', isNowPreview)
              const star = previewControl.querySelector('.preview-star')
              if (star) {
                star.textContent = isNowPreview ? '★' : '☆'
              }
            }
          } catch (error) {
            console.error('Ошибка при загрузке изображения:', error)
          } finally {
            this.isUploading = false
            wrapper.removeChild(loader)
            button.disabled = false
            button.textContent = 'Загрузить изображение'
          }
        }
      }
      
      imageWrapper.appendChild(image)
      imageWrapper.appendChild(previewControl)
      wrapper.appendChild(imageWrapper)
      
      wrapper.appendChild(button)
      wrapper.appendChild(input)
      
      wrapper.appendChild(caption)
      wrapper.appendChild(altInput)
      wrapper.appendChild(titleInput)
      
      return wrapper
    }

    save() {
      return this.data
    }
  }

  // Кастомный плагин для видео
  class VideoTool {
    private api: any;
    private data: { file: { url: string; alt: string; title: string }; caption: string };
    private config: any;
    private isUploading: boolean = false;

    static get toolbox() {
      return {
        title: 'Видео',
        icon: `<img src="${icons.video}" width="16" height="16" />`
      }
    }

    constructor({ data, config, api }: { data?: { file: { url: string; alt: string; title: string }; caption: string }, config?: any, api?: any }) {
      this.api = api
      this.data = {
        file: {
          url: data?.file?.url || '',
          alt: data?.file?.alt || '',
          title: data?.file?.title || ''
        },
        caption: data?.caption || ''
      }
      this.config = config || {}
    }

    render() {
      const wrapper = document.createElement('div')
      wrapper.style.position = 'relative'
      
      const video = document.createElement('video')
      video.controls = true
      video.style.maxWidth = '100%'
      video.style.height = 'auto'
      video.style.width = '100%'
      video.style.display = this.data.file.url ? 'block' : 'none'
      
      // Создаем loader для отображения процесса загрузки
      const loader = document.createElement('div')
      loader.classList.add('video-tool__loader')
      loader.style.display = 'none'
      loader.innerHTML = `
        <div class="video-tool__loader-spinner"></div>
        <div class="video-tool__loader-text">Загрузка видео...</div>
      `
      
      // Создаем скрытый input для выбора файла
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*'
      input.style.display = 'none'
      
      // Если видео уже загружено, добавляем source элемент
      if (this.data.file.url) {
        const source = document.createElement('source')
        source.src = this.data.file.url
        // Определяем MIME-тип по расширению URL
        const urlLower = this.data.file.url.toLowerCase()
        if (urlLower.includes('.webm') || urlLower.includes('webm')) {
          source.type = 'video/webm'
        } else if (urlLower.includes('.mov') || urlLower.includes('quicktime')) {
          source.type = 'video/quicktime'
        } else if (urlLower.includes('.avi') || urlLower.includes('x-msvideo')) {
          source.type = 'video/x-msvideo'
        } else if (urlLower.includes('.mkv') || urlLower.includes('matroska')) {
          source.type = 'video/x-matroska'
        } else {
          source.type = 'video/mp4'
        }
        video.appendChild(source)
        // Добавляем текст для браузеров без поддержки видео
        const fallbackText = document.createTextNode('Ваш браузер не поддерживает видео.')
        video.appendChild(fallbackText)
      } else {
        // Если видео не загружено, сразу открываем диалог выбора файла
        setTimeout(() => {
          input.click()
        }, 100)
      }
      
      // Обработчик выбора файла
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement
        if (!target.files) return
        
        const file = target.files[0]
        if (file && $profile?.jwt) {
          try {
            this.isUploading = true
            loader.style.display = 'flex'
            video.style.display = 'none'
            
            // Проверяем длительность видео перед загрузкой
            try {
              const duration = await getVideoDuration(file)
              
              if (duration > 30) {
                throw new Error('Видео слишком длинное (максимум 30 секунд)')
              }
            } catch (error: any) {
              if (error.message && error.message.includes('максимум 30 секунд')) {
                toast({
                  content: error.message,
                  type: 'error',
                })
                this.isUploading = false
                loader.style.display = 'none'
                input.value = ''
                return
              }
              console.warn('Не удалось определить длительность видео, продолжаем загрузку:', error)
            }
            
            const videoUrl = await uploadVideo(file, $profile.instance, $profile.jwt)
            if (videoUrl) {
              this.data.file.url = videoUrl
              
              // Очищаем предыдущие source элементы и текст
              video.innerHTML = ''
              
              // Создаем новый source элемент
              const source = document.createElement('source')
              source.src = videoUrl
              // Определяем MIME-тип по расширению файла
              const fileName = file.name.toLowerCase()
              if (fileName.endsWith('.mp4')) {
                source.type = 'video/mp4'
              } else if (fileName.endsWith('.webm')) {
                source.type = 'video/webm'
              } else if (fileName.endsWith('.mov')) {
                source.type = 'video/quicktime'
              } else if (fileName.endsWith('.avi')) {
                source.type = 'video/x-msvideo'
              } else if (fileName.endsWith('.mkv')) {
                source.type = 'video/x-matroska'
              } else {
                source.type = 'video/mp4'
              }
              video.appendChild(source)
              // Добавляем fallback текст для браузеров без поддержки видео
              const fallbackText = document.createTextNode('Ваш браузер не поддерживает видео.')
              video.appendChild(fallbackText)
              
              // Перезагружаем видео для применения изменений
              video.load()
              
              // Показываем видео и скрываем loader
              loader.style.display = 'none'
              video.style.display = 'block'
            }
          } catch (error: any) {
            console.error('Ошибка при загрузке видео:', error)
            toast({
              content: error.message || 'Не удалось загрузить видео. Пожалуйста, попробуйте снова.',
              type: 'error',
            })
            loader.style.display = 'none'
          } finally {
            this.isUploading = false
            input.value = ''
          }
        }
      }
      
      wrapper.appendChild(video)
      wrapper.appendChild(loader)
      wrapper.appendChild(input)
      
      return wrapper
    }

    save() {
      return this.data
    }
  }

  // Кастомный inline link tool с одинарными кавычками
  class CustomInlineLinkTool {
    private api: any;
    private button: HTMLButtonElement | null = null;
    private tag = 'A';
    private iconSVG = `<img src="${icons.link}" width="13" height="14" />`;

    static get isInline() {
      return true;
    }

    static get title() {
      return 'Ссылка';
    }

    get shortcut() {
      return 'CMD+K';
    }

    constructor({ api }: { api: any }) {
      this.api = api;
    }

    private async getAnchors(): Promise<string[]> {
      const anchors: string[] = [];
      const count = this.api.blocks.getBlocksCount();
      
      console.log('Blocks count:', count);
      
      for (let i = 0; i < count; i++) {
        const block = this.api.blocks.getBlockByIndex(i);
        const data = await block.save();
        
        // Проверяем разные возможные пути к якорю
        const anchorText = data?.tunes?.anchorInput?.text || 
                         data?.tunes?.customInput?.text || 
                         block?.tunes?.anchorInput?.text ||
                         block?.tunes?.customInput?.text;
                         
        if (anchorText) {
          anchors.push(anchorText);
        }
      }
      
      return anchors;
    }

    // Функция для проверки и добавления протокола
    private normalizeUrl(url: string): string {
      // Если это якорь, оставляем как есть
      if (url.startsWith('#')) {
        return url;
      }
      
      // Если уже есть протокол, оставляем как есть
      if (url.match(/^https?:\/\//)) {
        return url;
      }
      
      // Если это localhost или IP адрес, добавляем http
      if (url.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.0\.0\.0)/)) {
        return `http://${url}`;
      }
      
      // Во всех остальных случаях добавляем https
      return `https://${url}`;
    }

    render() {
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.classList.add('ce-inline-tool');
      this.button.innerHTML = this.iconSVG;
      this.button.title = 'Ссылка';
      
      return this.button;
    }

    surround(range: Range) {
      console.log('🎯 CustomInlineLinkTool: surround вызван');
      console.log('📍 Range:', range);
      
      if (!range) return;

      const selectedText = range.extractContents();
      console.log('📝 Выделенный текст:', selectedText.textContent);
      
      const link = document.createElement(this.tag) as HTMLAnchorElement;
      
      if (selectedText.textContent?.trim()) {
        link.appendChild(selectedText);
        range.insertNode(link);
        console.log('✅ Ссылка создана:', link);
        
        // Показываем инлайн попап для редактирования
        this.showInlinePopup(link);
      } else {
        console.log('⚠️ Текст не выделен, вставляем как есть');
        // Если текст не выделен, вставляем текст ссылки
        range.insertNode(selectedText);
      }
    }

    // Функция для принудительного сохранения модели
    private triggerSave() {
      console.log('🔄 CustomInlineLinkTool: Попытка сохранения модели...');
      console.log('🔍 API объект:', this.api);
      console.log('🔍 API.saver:', this.api?.saver);
      
      if (this.api && this.api.saver) {
        // Используем встроенный механизм сохранения EditorJS
        console.log('✅ Вызываем api.saver.save()...');
        this.api.saver.save().then((data: any) => {
          console.log('💾 Данные сохранены через API:', data);
          updateMarkdown(data);
          console.log('📝 updateMarkdown вызван');
        }).catch((error: any) => {
          console.error('❌ Ошибка сохранения через API:', error);
        });
      } else {
        console.warn('⚠️ API.saver недоступен, пробуем альтернативный метод...');
        // Альтернативный способ через прямой вызов editor.save()
        if (typeof editor !== 'undefined' && editor && editor.save) {
          console.log('🔄 Используем прямой вызов editor.save()...');
          editor.save().then((data: any) => {
            console.log('💾 Данные сохранены через editor:', data);
            updateMarkdown(data);
            console.log('📝 updateMarkdown вызван (альтернативный путь)');
          }).catch((error: any) => {
            console.error('❌ Ошибка сохранения через editor:', error);
          });
        } else {
          console.error('❌ Ни API.saver, ни editor.save() не доступны');
        }
      }
    }

    // Функция для извлечения якоря из полного URL
    private extractAnchorFromUrl(url: string): string {
      if (!url) return '';
      
      // Если это уже якорь, возвращаем как есть
      if (url.startsWith('#')) {
        return url;
      }
      
      // Если это полный URL с якорем, извлекаем только якорь
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        return url.substring(hashIndex);
      }
      
      // Если это обычный URL без якоря, возвращаем как есть
      return url;
    }

    async showInlinePopup(linkElement: HTMLAnchorElement) {
      // Удаляем существующие попапы
      const existingPopups = document.querySelectorAll('.ce-link-popup');
      existingPopups.forEach(popup => popup.remove());

      // Создаем попап
      const popup = document.createElement('div');
      popup.className = 'ce-link-popup';
      
      // Извлекаем якорь из URL если это якорь
      const currentUrl = linkElement.href || '';
      const displayUrl = this.extractAnchorFromUrl(currentUrl);
      
      // Создаем input для URL
      const urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.className = 'ce-link-popup__input';
      urlInput.placeholder = 'Вставьте ссылку или выберите якорь...';
      urlInput.value = displayUrl;
      
      // Кнопка показать якоря
      const anchorsButton = document.createElement('button');
      anchorsButton.className = 'ce-link-popup__anchors';
      anchorsButton.innerHTML = '⚓';
      anchorsButton.title = 'Выбрать якорь';
      
      // Кнопка сохранить
      const saveButton = document.createElement('button');
      saveButton.className = 'ce-link-popup__save';
      saveButton.innerHTML = '✓';
      saveButton.title = 'Сохранить';
      
      // Кнопка удалить
      const removeButton = document.createElement('button');
      removeButton.className = 'ce-link-popup__remove';
      removeButton.innerHTML = '✕';
      removeButton.title = 'Удалить ссылку';
      
      // Добавляем элементы в попап
      popup.appendChild(urlInput);
      popup.appendChild(anchorsButton);
      popup.appendChild(saveButton);
      popup.appendChild(removeButton);
      
      // Сначала добавляем попап в DOM с невидимым состоянием для правильного расчета размеров
      popup.style.visibility = 'hidden';
      popup.style.position = 'absolute';
      document.body.appendChild(popup);
      
      // Теперь позиционируем попап правильно
      this.positionPopup(popup, linkElement);
      
      // Делаем попап видимым с анимацией
      popup.style.visibility = 'visible';
      setTimeout(() => {
        popup.classList.add('visible');
      }, 10);
      
      // Фокусируемся на input
      urlInput.focus();
      urlInput.select();
      
      // Обработчики событий
      const handleSave = () => {
        const url = urlInput.value.trim();
        console.log('💾 CustomInlineLinkTool: Сохранение ссылки...');
        console.log('🔗 URL:', url);
        console.log('🎯 Элемент ссылки:', linkElement);
        console.log('📝 Текущий href:', linkElement.href);
        
        if (url) {
          // Нормализуем URL (добавляем протокол если нужно)
          const normalizedUrl = this.normalizeUrl(url);
          linkElement.href = normalizedUrl;
          console.log('✅ Новый href установлен:', linkElement.href);
        } else {
          console.log('🗑️ URL пустой, удаляем ссылку...');
          this.removeLink(linkElement);
        }
        popup.remove();
        
        // Принудительно сохраняем модель после изменения
        console.log('⏰ Запланировано сохранение через 100мс...');
        setTimeout(() => {
          this.triggerSave();
        }, 100);
      };
      
      const handleRemove = () => {
        console.log('🗑️ CustomInlineLinkTool: Удаление ссылки...');
        console.log('🎯 Элемент ссылки:', linkElement);
        this.removeLink(linkElement);
        popup.remove();
        
        // Принудительно сохраняем модель после удаления
        console.log('⏰ Запланировано сохранение после удаления через 100мс...');
        setTimeout(() => {
          this.triggerSave();
        }, 100);
      };

      const handleAnchors = async () => {
        // Удаляем существующий список якорей если есть
        const existingSuggestions = popup.querySelector('.ce-link-suggestions');
        if (existingSuggestions) {
          existingSuggestions.remove();
          return;
        }

        const anchors = await this.getAnchors();
        if (anchors.length === 0) {
          // Показываем уведомление об отсутствии якорей
          const noAnchorsDiv = document.createElement('div');
          noAnchorsDiv.className = 'ce-link-suggestions';
          noAnchorsDiv.innerHTML = '<div class="ce-link-suggestions__title">Якорей в материале не найдено</div>';
          popup.appendChild(noAnchorsDiv);
          
          setTimeout(() => {
            noAnchorsDiv.remove();
          }, 2000);
          return;
        }

        const suggestionList = document.createElement('div');
        suggestionList.className = 'ce-link-suggestions';
        
        const title = document.createElement('div');
        title.className = 'ce-link-suggestions__title';
        title.textContent = 'Якоря в материале:';
        suggestionList.appendChild(title);
        
        anchors.forEach(anchor => {
          if (!anchor) return;
          
          const item = document.createElement('div');
          item.className = 'ce-link-suggestions__item';
          item.textContent = `#${anchor}`;
          item.onclick = (e) => {
            e.stopPropagation();
            urlInput.value = `#${anchor}`;
            suggestionList.remove();
            urlInput.focus();
          };
          suggestionList.appendChild(item);
        });

        popup.appendChild(suggestionList);
      };
      
      const handleClickOutside = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node) && !linkElement.contains(e.target as Node)) {
          handleSave();
          document.removeEventListener('click', handleClickOutside);
        }
      };
      
      // События
      anchorsButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAnchors();
      });
      
      saveButton.addEventListener('click', handleSave);
      removeButton.addEventListener('click', handleRemove);
      
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          popup.remove();
        }
      });
      
      // Клик вне попапа через небольшую задержку
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }

    positionPopup(popup: HTMLElement, linkElement: HTMLAnchorElement) {
      const linkRect = linkElement.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      
      // Находим контейнер редактора для дополнительной проверки
      const editorContainer = linkElement.closest('.codex-editor') as HTMLElement;
      const editorRect = editorContainer ? editorContainer.getBoundingClientRect() : null;
      
      console.log('Позиционирование попапа:', {
        linkRect: {
          top: linkRect.top,
          bottom: linkRect.bottom,
          left: linkRect.left,
          right: linkRect.right,
          width: linkRect.width,
          height: linkRect.height
        },
        editorRect: editorRect ? {
          top: editorRect.top,
          bottom: editorRect.bottom,
          left: editorRect.left,
          right: editorRect.right
        } : null,
        popupRect: {
          width: popupRect.width,
          height: popupRect.height
        },
        window: {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight
        }
      });
      
      // Позиционируем под ссылкой
      let top = linkRect.bottom + window.scrollY + 8;
      let left = linkRect.left + window.scrollX;
      
      console.log('Первичные координаты:', { top, left });
      
      // Проверяем, не выходит ли попап за правую границу экрана
      if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 20;
        console.log('Скорректировано по правой границе:', { left });
      }
      
      // Проверяем, не выходит ли попап за левую границу экрана
      if (left < 10) {
        left = 10;
        console.log('Скорректировано по левой границе:', { left });
      }
      
      // Проверяем, не выходит ли попап за нижнюю границу экрана
      if (top + popupRect.height > window.innerHeight + window.scrollY) {
        top = linkRect.top + window.scrollY - popupRect.height - 8;
        console.log('Скорректировано по нижней границе:', { top });
      }
      
      // Проверяем, не выходит ли попап за верхнюю границу экрана
      if (top < window.scrollY + 10) {
        top = linkRect.bottom + window.scrollY + 8;
        console.log('Скорректировано по верхней границе:', { top });
      }
      
      console.log('Финальные координаты:', { top, left });
      
      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;
      popup.style.zIndex = '1000';
    }

    removeLink(linkElement: HTMLAnchorElement) {
      console.log('🗑️ removeLink вызван для элемента:', linkElement);
      const textContent = linkElement.textContent || '';
      console.log('📝 Текст ссылки:', textContent);
      const textNode = document.createTextNode(textContent);
      linkElement.parentNode?.replaceChild(textNode, linkElement);
      console.log('✅ Ссылка удалена, текст сохранен');
    }

    checkState() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      
      const range = selection.getRangeAt(0);
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;
      
      return !!(parentNode as Element)?.closest(this.tag);
    }

    clear() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;
      
      const linkElement = (parentNode as Element)?.closest(this.tag) as HTMLAnchorElement;
      if (linkElement) {
        this.removeLink(linkElement);
      }
    }

    // Метод для санитизации HTML
    static get sanitize() {
      return {
        a: {
          href: true,
          target: '_blank',
          rel: 'noopener'
        }
      };
    }

    // Метод для удаления обертки
    unwrap(termWrapper: HTMLElement) {
      this.api.selection.expandToTag(termWrapper);
    }
  }

  interface AdditionalData {
    previewImage: string
    previewDescription: string
    metaTitle: string
    metaDescription: string
  }

  interface ContentData {
    blocks: any[]
    additional?: AdditionalData
    [key: string]: any
  }

  export let value = ''
  export let placeholder = ''
  export let label = ''
  export let postId: string | number | null = null // ID поста для автосохранения
  export let enableAutosave: boolean = true // Разрешение автосохранения
  export let onContentChange: (() => void) | null = null // Callback для уведомления PostForm об изменениях

  let previewImage = ''
  let previewDescription = ''
  let metaDescription = ''
  let metaTitle = ''
  let draftLastSaved: Date | null = null
  let autosaveTimeout: NodeJS.Timeout | null = null
  let isUpdatingFromInternal = false // Флаг для предотвращения циклов обновления
  let isInitialized = false // Флаг готовности редактора для автосохранения
  
  let element: HTMLElement
  let editor: any
  let showMarkdown = false
  let markdownOutput = ''

  // Вычисляемое свойство для отображения читаемого JSON в режиме предпросмотра
  $: displayMarkdown = (() => {
    if (!markdownOutput) return ''
    try {
      const decodedData = deserializeEditorModel(markdownOutput)
      return JSON.stringify(decodedData, null, 2)
    } catch (e) {
      return markdownOutput // Возвращаем как есть в случае ошибки
    }
  })()

  // Функция для автосохранения черновика
  const autosaveDraft = () => {
    console.log('🔄 EditorJS autosaveDraft: начало функции', {
      postId,
      enableAutosave,
      isInitialized,
      valueLength: value?.length || 0,
      hasTimeout: !!autosaveTimeout
    })
    
    // Блокируем автосохранение если оно отключено
    if (!enableAutosave) {
      console.log('🚫 EditorJS autosaveDraft: блокировано - автосохранение отключено')
      return
    }
    
    // Блокируем автосохранение если редактор ещё не инициализирован
    if (!isInitialized) {
      console.log('🚫 EditorJS autosaveDraft: блокировано - редактор ещё не готов')
      return
    }
    
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout)
      console.log('⏰ EditorJS autosaveDraft: очистили предыдущий таймер')
    }
    
          autosaveTimeout = setTimeout(() => {
        console.log('🚀 EditorJS autosaveDraft: выполняем отложенное сохранение', {
          postId,
          valueLength: value?.length || 0,
          previewImageLength: previewImage?.length || 0,
          previewDescriptionLength: previewDescription?.length || 0
        })
        
        // Не сохраняем отдельные черновики от EditorJS
        // Автосохранение должно происходить только на уровне PostForm
        console.log('⏭️ EditorJS: пропускаем автосохранение - оставляем это PostForm')
        draftLastSaved = new Date()
      }, 2000) // Автосохранение через 2 секунды после изменения
  }

  // Функция для обновления markdown
  const updateMarkdown = (data: any) => {
    console.log('📄 updateMarkdown вызван с данными:', data);
    
    // Устанавливаем флаг что обновление идёт изнутри (только если не обновляем извне)
    if (!isUpdatingFromInternal) {
      isUpdatingFromInternal = true
      
      // Добавляем дополнительные данные в JSON
      const additionalData = {
        previewImage,
        previewDescription,
        metaTitle,
        metaDescription
      }
      data.additional = additionalData
      
      // Сериализуем данные в base64
      const serializedData = serializeEditorModel(data)
      markdownOutput = serializedData
      value = serializedData
      lastExternalValue = serializedData // Обновляем также последнее внешнее значение
      
      console.log('💾 Данные сериализованы в base64, длина:', serializedData.length);
      console.log('📊 Количество блоков:', data.blocks?.length || 0);
      
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        isUpdatingFromInternal = false
      }, 100)
    } else {
      console.log('⏭️ updateMarkdown пропущен - идёт внешнее обновление')
    }
    
    // Проверяем наличие ссылок в блоках
    if (data.blocks) {
      data.blocks.forEach((block: any, index: number) => {
        if (block.data?.text && block.data.text.includes('<a ')) {
          console.log(`🔗 Блок ${index} содержит ссылки:`, block.data.text);
        }
      });
    }
    
    // Запускаем автосохранение
    autosaveDraft()
    
    // Уведомляем PostForm об изменении контента
    if (onContentChange) {
      onContentChange()
    }
  }

  onMount(async () => {
    console.log('🚀 EditorJS onMount: начало монтирования', { postId })
    
    // Загружаем информацию о последнем сохранении черновика
    draftLastSaved = getDraftLastSaved(postId)
    console.log('📅 EditorJS onMount: дата последнего черновика', {
      draftLastSaved: draftLastSaved?.toLocaleString('ru-RU') || 'нет'
    })
    
    // Извлекаем существующие данные из value при монтировании
    let contentData: ContentData = { blocks: [] }
    
    try {
      // Пробуем десериализовать данные
      contentData = value ? deserializeEditorModel(value) : { blocks: [] }
    } catch (e) {
      console.error('Failed to deserialize content data:', e)
      contentData = { blocks: [] }
    }
    
    if (contentData.additional) {
      previewImage = contentData.additional.previewImage || ''
      previewDescription = contentData.additional.previewDescription || ''
      metaTitle = contentData.additional.metaTitle || ''
      metaDescription = contentData.additional.metaDescription || ''
    }

    // Динамический импорт Editor.js и его плагинов
    const [
      { default: EditorJS },
      { default: Header },
      { default: List },
      { default: Image },
      { default: Quote },
      { default: Code },
      { default: AlignmentBlockTune },
      { default: LinkTool },
      { default: Embed },
      { default: Table }
    ] = await Promise.all([
      import('@editorjs/editorjs'),
      import('@editorjs/header'),
      import('@editorjs/list'),
      import('@editorjs/image'),
      import('@editorjs/quote'),
      import('@editorjs/code'),
      import('editorjs-text-alignment-blocktune'),
      import('@editorjs/link'),
      import('@editorjs/embed'),
      import('@editorjs/table')
    ])

    // Инициализация Editor.js
    editor = new EditorJS({
      holder: element,
      placeholder: placeholder,
      tools: {
        header: {
          class: Header,
          config: {
            levels: [2, 3],
            defaultLevel: 2
          },
          toolbox: {
            title: 'Заголовок',
            icon: `<img src="${icons.header}" width="16" height="16" />`
          }
        },
        list: {
          class: List,
          inlineToolbar: ['bold', 'italic', 'customInlineLink'],
          toolbox: {
            title: 'Список',
            icon: `<img src="${icons.unorderedList}" width="16" height="16" />`
          },
          config: {
            defaultStyle: 'unordered'
          }
        },
        image: CustomImageTool,
        video: VideoTool,
        quote: {
          class: Quote,
          inlineToolbar: ['bold', 'italic', 'customInlineLink'],
          toolbox: {
            title: 'Цитата',
            icon: `<img src="${icons.quote}" width="16" height="16" />`
          }
        },
        code: {
          class: Code,
          inlineToolbar: ['bold', 'italic'],
          toolbox: {
            title: 'Код',
            icon: `<img src="${icons.code}" width="16" height="16" />`
          }
        },
        table: {
          class: Table,
          inlineToolbar: true,
          toolbox: {
            title: 'Таблица',
            icon: `<img src="${icons.table}" width="16" height="16" />`
          },
          config: {
            rows: 2,
            cols: 3,
            withHeadings: true
          }
        },
        gallery: GalleryTool,
        anchorInput: {
          class: CustomInputTune
        },
        customLink: CustomLinkTool,
        customInlineLink: CustomInlineLinkTool,
        embed: {
          class: Embed,
          config: {
            services: {
              // Стандартные сервисы
              youtube: true,
              vimeo: true,
              coub: true,
              facebook: true,
              instagram: true,
              twitter: true,
              'twitch-video': true,
              'twitch-channel': true,
              miro: true,
              gfycat: true,
              imgur: true,
              vine: true,
              aparat: true,
              'yandex-music-track': true,
              'yandex-music-album': true,
              'yandex-music-playlist': true,
              codepen: true,
              pinterest: true,
              github: true,
              // Кастомные сервисы
              rutube: {
                regex: /https?:\/\/rutube\.ru\/video\/([a-f0-9]+)(?:\/.*)?/,
                embedUrl: '<%= remote_id %>',
                html: "<iframe width='720' height='405' frameBorder='0' allow='clipboard-write; autoplay' webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>",
                height: 405,
                width: 720,
                id: (groups: RegExpMatchArray) => {
                  console.log('Rutube video parsing - Input:', {
                    input: groups.input,
                    groups: Array.from(groups)
                  });
                  
                  try {

                    const videoId = groups[0];
                    
                    if (!videoId) {
                      throw new Error('Could not extract video ID from Rutube URL');
                    }

                    const embedUrl = `https://rutube.ru/play/embed/${videoId}/`;
                    console.log('Rutube video parsing - Success!', { videoId, embedUrl });
                    return embedUrl;
                  } catch (error) {
                    console.error('Rutube video parsing - Error:', error);
                    return null;
                  }
                }
              },
              vk: {
                regex: /https?:\/\/vk\.com\/vkvideo\?z=video([-\d]+)_(\d+)(?:%.+)?/,
                embedUrl:  '<%= remote_id %>',
                html: "<iframe width='426' height='240' allow='autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;' frameborder='0' allowfullscreen></iframe>",
                height: 300,
                width: 426,
                id: (groups: RegExpMatchArray) => {
                  console.log('VK video parsing (vkvideo format) - Input:', {
                    input: groups.input,
                    groups: Array.from(groups)
                  });
                  
                  try {
                    // В массиве groups:
                    // groups[0] содержит ID владельца (например "-220754053")
                    // groups[1] содержит ID видео (например "456243385")
                    const oid = groups[0];
                    const vid = groups[1];
                    
                    if (!oid || !vid) {
                      throw new Error('Could not extract video ID from vkvideo URL');
                    }

                    const result = {
                      remote_id: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}`,
                      remote_id_oid: oid,
                      remote_id_vid: vid
                    };
                    console.log('VK video parsing (vkvideo format) - Success!', result);
                    return result.remote_id;
                  } catch (error) {
                    console.error('VK video parsing (vkvideo format) - Error:', error);
                    return null;
                  }
                }
              },
              vkvideo: {
                regex: /https?:\/\/vk\.com\/video([-\d]+)_(\d+)/,
                embedUrl: '<%= remote_id %>',
                html: "<iframe width='426' height='240' allow='autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;' frameborder='0' allowfullscreen></iframe>",
                height: 300,
                width: 426,
                id: (groups: RegExpMatchArray) => {
                  console.log('VK video parsing (direct format) - Input:', {
                    input: groups.input,
                    groups: Array.from(groups)
                  });
                  
                  try {
                  
                    const oid = groups[0];
                    const vid = groups[1];
                    
                    if (!oid || !vid) {
                      throw new Error('Could not extract video ID from direct video URL');
                    }

                    const result = {
                      remote_id: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}`,
                      remote_id_oid: oid,
                      remote_id_vid: vid
                    };
                    console.log('VK video parsing (direct format) - Success!', result);
                    return result.remote_id;

                  } catch (error) {
                    console.error('VK video parsing (direct format) - Error:', error);
                    return null;
                  }
                }
              },
              vkvideoRu: {
                // Пример URL: https://vkvideo.ru/video-1623507_456247959
                regex: /https?:\/\/vkvideo\.ru\/video-([-\d]+)_(\d+)/,
                embedUrl: '<%= remote_id %>',
                html: "<iframe width='426' height='240' allow='autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;' frameborder='0' allowfullscreen></iframe>",
                height: 300,
                width: 426,
                id: (groups: RegExpMatchArray) => {
                  console.log('VK video parsing (vkvideo.ru format) - Input:', {
                    input: groups.input,
                    groups: Array.from(groups),
                    match: {
                      full: groups[0],
                      oid: groups[1],
                      vid: groups[2]
                    }
                  });
                  
                  try {
                    // В массиве groups:
                    // groups[0] содержит ID владельца (например "-220754053")
                    // groups[1] содержит ID видео (например "456243385")
                    const oid = groups[0];
                    const vid = groups[1];
                    
                    if (!oid || !vid) {
                      console.error('Missing oid or vid:', { oid, vid, groups: Array.from(groups) });
                      throw new Error('Could not extract video ID from vkvideo.ru URL');
                    }

                    const result = {
                      remote_id: `https://vkvideo.ru/video_ext.php?oid=-${oid}&id=${vid}`,
                      remote_id_oid: oid,
                      remote_id_vid: vid
                    };
                    console.log('VK video parsing (vkvideo.ru format) - Success!', result);
                    return result.remote_id;
                  } catch (error) {
                    console.error('VK video parsing (vkvideo.ru format) - Error:', error);
                    return null;
                  }
                }
              }
            }
          }
        }
      },
      tunes: ["anchorInput"],
      inlineToolbar: ['bold', 'italic', 'customInlineLink'],
      i18n: {
        messages: {
          ui: {
            "blockTunes": {
              "toggler": {
                "Click to tune": "Нажмите, чтобы настроить",
                "or drag to move": "или перетащите"
              },
            },
            "toolbar": {
              "toolbox": {
                "Add": "Добавить",
                "Filter": "Фильтр",
                "Nothing found": "Ничего не найдено"
              }
            },
            "inlineToolbar": {
              "converter": {
                "Convert to": "Преобразовать в"
              }
            },
            "popover": {
              "Convert to": "Преобразовать в"
            }
          },
          toolNames: {
            "Text": "Текст",
            "Heading": "Заголовок",
            "List": "Список",
            "Quote": "Цитата",
            "Code": "Код",
            "Image": "Изображение",
            "Video": "Видео",
            "Gallery": "Галерея",
            "Link": "Ссылка",
            "Unordered List": "Маркированный список",
            "Ordered List": "Нумерованный список",
            "Checklist": "Чек-лист",
            "Numbered List": "Нумерованный список",
            "Heading 2": "Заголовок 2",
            "Heading 3": "Заголовок 3",
            "Table": "Таблица"
          },
          tools: {
            "warning": {
              "Title": "Заголовок",
              "Message": "Сообщение",
            },
            "link": {
              "Add a link": "Добавить ссылку",
              "Link": "Ссылка",
              "Paste the link and press Enter": "Вставьте ссылку и нажмите Enter"
            },
            "customInlineLink": {
              "Add a link": "Добавить ссылку",
              "Link": "Ссылка"
            },
            "stub": {
              "The block can not be displayed correctly.": "Блок не может быть корректно отображен."
            },
            "list": {
              "Unordered": "Маркированный",
              "Ordered": "Нумерованный",
              "Convert to": "Преобразовать в"
            },
            "header": {
              "Heading 2": "Заголовок 2",
              "Heading 3": "Заголовок 3",
              "Convert to": "Преобразовать в"
            },
            "embed": {
              "Enter a caption": "Введите подпись"
            },
            "table": {
              "Add column to left": "Добавить столбец слева",
              "Add column to right": "Добавить столбец справа",
              "Delete column": "Удалить столбец",
              "Add row above": "Добавить строку выше",
              "Add row below": "Добавить строку ниже",
              "Delete row": "Удалить строку",
              "With headings": "С заголовками",
              "Without headings": "Без заголовков"
            }
          },
          blockTunes: {
            "delete": {
              "Delete": "Удалить",
              "Click to delete": "Нажмите, чтобы удалить"
            },
            "moveUp": {
              "Move up": "Переместить вверх"
            },
            "moveDown": {
              "Move down": "Переместить вниз"
            },
            "convertTo": {
              "Convert to": "Преобразовать в"
            }
          }
        }
      },
      data: contentData,
      onChange: async () => {
        const data = await editor.save()
        updateMarkdown(data)
      },
      onReady: () => {
        console.log('🚀 EditorJS готов к работе');
        
        // Добавляем обработчик кликов по ссылкам для их редактирования
        const editorElement = element.querySelector('.codex-editor__redactor');
        if (editorElement) {
          console.log('✅ Обработчик кликов по ссылкам добавлен');
          editorElement.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const linkElement = target.closest('a') as HTMLAnchorElement;
            
            console.log('👆 Клик в редакторе:', { target, linkElement });
            
            if (linkElement && !(e as MouseEvent).ctrlKey && !(e as MouseEvent).metaKey) {
              console.log('🔗 Клик по ссылке обнаружен:', linkElement.href);
              e.preventDefault();
              e.stopPropagation();
              
              // Создаем временный экземпляр tool для показа попапа с правильным API
              const tempTool = new CustomInlineLinkTool({ api: editor });
              tempTool.showInlinePopup(linkElement);
            }
          });
        } else {
          console.warn('⚠️ Элемент редактора не найден');
        }
        
        // Включаем автосохранение через 2 секунды после готовности редактора
        setTimeout(() => {
          isInitialized = true;
          console.log('✅ EditorJS: автосохранение включено');
        }, 2000);
      }
    })
  })

  let lastExternalValue = '' // Отслеживаем последнее внешнее значение

  // Реактивное обновление содержимого редактора при изменении value извне
  $: if (editor && value && !isUpdatingFromInternal && value !== lastExternalValue) {
    updateEditorContent(value)
  }

  async function updateEditorContent(newValue: string) {
    if (!editor || !newValue || isUpdatingFromInternal) return
    
    try {
      console.log('🔄 EditorJS: обновляем содержимое редактора извне', {
        newValueLength: newValue.length,
        newValuePreview: newValue.substring(0, 100),
        lastExternalValue: lastExternalValue.substring(0, 50)
      })
      
      // Устанавливаем флаг блокировки
      isUpdatingFromInternal = true
      lastExternalValue = newValue
      
      const contentData = deserializeEditorModel(newValue)
      
      // Очищаем редактор и загружаем новые данные
      await editor.clear()
      await editor.render(contentData)
      
      // Временно отключаем автосохранение при внешнем обновлении
      isInitialized = false
      
      console.log('✅ EditorJS: содержимое редактора обновлено', {
        blocksCount: contentData.blocks?.length || 0
      })
      
      // Обновляем дополнительные данные
      if (contentData.additional) {
        previewImage = contentData.additional.previewImage || ''
        previewDescription = contentData.additional.previewDescription || ''
        metaTitle = contentData.additional.metaTitle || ''
        metaDescription = contentData.additional.metaDescription || ''
      }
      
      // Сбрасываем флаг через задержку и включаем автосохранение обратно
      setTimeout(() => {
        isUpdatingFromInternal = false
        isInitialized = true
        console.log('✅ EditorJS: автосохранение включено после внешнего обновления')
      }, 1000) // Увеличиваем задержку
      
    } catch (e) {
      console.error('❌ EditorJS: ошибка при обновлении содержимого:', e)
      isUpdatingFromInternal = false
    }
  }

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout)
    }
  })
</script>

<div class="flex flex-col gap-1 relative editor-container">
  {#if label}
    <span class="font-medium text-sm  dark:text-slate-300">{label}</span>
  {/if}

  <div
    class="min-h-[400px] p-3 rounded-lg focus-within:ring-1 focus-within:ring-blue-500 transition-all duration-200 editor-content bg-white dark:bg-slate-800 border dark:border-slate-700"
    bind:this={element}
  />

  {#if true}
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
        {showMarkdown ? 'Скрыть JSON' : 'Показать JSON'}
      </Button>
      
      <span class="text-sm text-slate-500 dark:text-slate-400">
        {markdownOutput.length} символов (base64)
      </span>
    </div>

    {#if showMarkdown}
      <div class="mt-2 space-y-2">
        <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
          ℹ️ Данные хранятся в формате base64. Ниже показан декодированный JSON для удобства просмотра.
        </div>
        <pre class="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
          <code>{displayMarkdown}</code>
        </pre>
      </div>
    {/if}
  </div>
  {/if}
  
  <!-- Информационный блок об обложке поста -->
  <div class="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-zinc-900/60 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 sm:px-4 sm:py-3">
    <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
      <div class="flex-1 flex flex-col gap-1.5">
        <span class="font-medium text-slate-800 dark:text-slate-100">
          Обложка поста
        </span>
        <p class="leading-snug">
          Хороший пост должен быть с обложкой. Выберите любое изображение в статье и кликните - <strong>вывести в ленте</strong>. Тогда выбранное изображение появится в ленте постов, и ваш пост станет гораздо более кликабельным.
        </p>
      </div>
      <div class="flex-shrink-0 w-full sm:w-auto sm:max-w-[300px]">
        <img
          src="/img/oblozhka.webp"
          alt="Демонстрация создания обложки поста"
          class="w-full sm:w-[300px] rounded-lg border border-slate-200 dark:border-zinc-700"
          loading="lazy"
        />
      </div>
    </div>
  </div>
  
  <div class="mt-4 space-y-4">
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <p class="font-medium text-lg text-slate-600 dark:text-slate-300">
          Настройки поста
        </p>
        {#if draftLastSaved}
          <span class="text-xs text-slate-500 dark:text-slate-400">
            Черновик: {formatLastSaved(draftLastSaved)}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <div class="mt-4 space-y-4">
    <div class="flex flex-col gap-1">
      <label for="previewDescription" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        Вывести в ленте
      </label>
      <textarea
        id="previewDescription"
        bind:value={previewDescription}
        on:input={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.save().then(updateMarkdown);
        }}
        placeholder="Этот текст будет показан в ленте постов и в превью статьи. Коротко и ясно опишите, о чём материал — это помогает привлечь внимание и повысить кликабельность. Если оставить поле пустым, в ленту автоматически попадут первые 300 символов из статьи."
        rows="4"
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 resize-none"
      ></textarea>
    </div>

    <div class="flex flex-col gap-1">
      <label for="metaTitle" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        SEO meta title
      </label>
      <input
        id="metaTitle"
        type="text"
        bind:value={metaTitle}
        on:input={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.save().then(updateMarkdown);
        }}
        placeholder="Введите заголовок для поисковых систем (до 60 символов)"
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label for="metaDescription" class="font-medium text-sm text-slate-600 dark:text-slate-300">
        SEO meta description
      </label>
      <textarea
        id="metaDescription"
        bind:value={metaDescription}
        on:input={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.save().then(updateMarkdown);
        }}
        placeholder="Описание, которое увидят пользователи в результатах поиска (до 160 символов)"
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
    padding-left: 2.5rem;
  }

  :global(.gallery-wrapper) {
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  :global(.dark .gallery-wrapper) {
    background: #1f2937;
    border-color: #4b5563;
  }

  :global(.gallery-button) {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    margin-bottom: 1rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  :global(.gallery-button:hover) {
    background: #e5e7eb;
  }

  :global(.dark .gallery-button) {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.dark .gallery-button:hover) {
    background: #4b5563;
  }

  :global(.gallery-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  :global(.gallery-item) {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 0.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    opacity: 0;
    transition: all 0.3s ease;
    cursor: move;
  }

  :global(.gallery-item.dragging) {
    opacity: 0.5;
    transform: scale(0.95);
    box-shadow: 0 0 0 2px #2563eb;
  }

  :global(.dark .gallery-item.dragging) {
    box-shadow: 0 0 0 2px #60a5fa;
  }

  :global(.gallery-item.drag-over) {
    border: 2px dashed #2563eb;
    background: rgba(37, 99, 235, 0.1);
  }

  :global(.dark .gallery-item.drag-over) {
    border-color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  :global(.gallery-item.loaded) {
    opacity: 1;
  }

  :global(.gallery-item.error) {
    background: #fee2e2;
    border-color: #ef4444;
  }

  :global(.dark .gallery-item.error) {
    background: #7f1d1d;
    border-color: #dc2626;
  }

  :global(.gallery-item img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  :global(.gallery-item.loaded img) {
    opacity: 1;
  }

  :global(.gallery-remove) {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.2rem;
  }

  :global(.gallery-settings) {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  :global(.gallery-settings:hover) {
    background: rgba(0, 0, 0, 0.7);
  }

  :global(.gallery-settings-panel) {
    position: absolute;
    top: 2.5rem;
    left: 0.5rem;
    right: 0.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 10;
  }

  :global(.dark .gallery-settings-panel) {
    background: #1f2937;
    border-color: #4b5563;
  }

  :global(.gallery-input) {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  :global(.dark .gallery-input) {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.gallery-input:focus) {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .gallery-input:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  }

  :global(.image-tool__wrapper) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  :global(.dark .image-tool__wrapper) {
    background: #1f2937;
    border-color: #4b5563;
  }

  :global(.image-tool__image-wrapper) {
    position: relative;
    margin: 1rem 0;
  }

  :global(.image-tool__image-wrapper img) {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 0.375rem;
  }

  :global(.image-tool__preview-control) {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(229, 231, 235, 0.9);
    border-radius: 0.375rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 2;
    font-size: 0.875rem;
  }

  :global(.dark .image-tool__preview-control) {
    background: rgba(55, 65, 81, 0.9);
    color: #e5e7eb;
  }

  :global(.image-tool__preview-control:hover) {
    background: rgba(209, 213, 219, 0.9);
  }

  :global(.dark .image-tool__preview-control:hover) {
    background: rgba(75, 85, 99, 0.9);
  }

  :global(.image-tool__preview-control.active) {
    color: #2563eb;
  }

  :global(.dark .image-tool__preview-control.active) {
    color: #60a5fa;
  }

  :global(.preview-star) {
    font-size: 1.2rem;
    line-height: 1;
    transition: all 0.2s;
  }

  :global(.image-tool__preview-control:hover .preview-star) {
    transform: scale(1.1);
  }

  :global(.preview-text) {
    font-weight: 500;
  }

  :global(.image-tool__caption) {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
    min-height: 2.5rem;
  }

  :global(.dark .image-tool__caption) {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.image-tool__caption:focus) {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .image-tool__caption:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  }

  :global(.image-tool__alt),
  :global(.image-tool__title) {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  :global(.dark .image-tool__alt),
  :global(.dark .image-tool__title) {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.image-tool__alt:focus),
  :global(.image-tool__title:focus) {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .image-tool__alt:focus),
  :global(.dark .image-tool__title:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  }

  :global(.image-tool__button) {
    display: block;
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 1rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.image-tool__button:hover) {
    background: #e5e7eb;
  }

  :global(.dark .image-tool__button) {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.dark .image-tool__button:hover) {
    background: #4b5563;
  }

  :global(.image-tool__loader) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 0.5rem;
  }

  :global(.image-tool__loader-spinner) {
    width: 40px;
    height: 40px;
    border: 4px solid #2563eb;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  :global(.image-tool__loader-text) {
    margin-top: 1rem;
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  :global(.dark .image-tool__loader) {
    background: rgba(31, 41, 55, 0.8);
  }

  :global(.dark .image-tool__loader-spinner) {
    border-color: #60a5fa;
    border-top-color: transparent;
  }

  :global(.dark .image-tool__loader-text) {
    color: #e5e7eb;
  }

  :global(.video-tool__wrapper video),
  :global(video[controls]) {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 0.5rem;
  }

  :global(.video-tool__caption) {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
    min-height: 2.5rem;
    resize: vertical;
  }

  :global(.dark .video-tool__caption) {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.video-tool__caption:focus) {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .video-tool__caption:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  }

  :global(.video-tool__alt),
  :global(.video-tool__title) {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  :global(.dark .video-tool__alt),
  :global(.dark .video-tool__title) {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.video-tool__alt:focus),
  :global(.video-tool__title:focus) {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .video-tool__alt:focus),
  :global(.dark .video-tool__title:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  }

  :global(.video-tool__button) {
    display: block;
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 1rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.video-tool__button:hover:not(:disabled)) {
    background: #e5e7eb;
  }

  :global(.video-tool__button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.dark .video-tool__button) {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.dark .video-tool__button:hover:not(:disabled)) {
    background: #4b5563;
  }

  :global(.video-tool__loader) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 0.5rem;
    z-index: 10;
  }

  :global(.dark .video-tool__loader) {
    background: rgba(31, 41, 55, 0.8);
  }

  :global(.video-tool__loader-spinner) {
    width: 40px;
    height: 40px;
    border: 4px solid #2563eb;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  :global(.dark .video-tool__loader-spinner) {
    border-color: #60a5fa;
    border-top-color: transparent;
  }

  :global(.video-tool__loader-text) {
    margin-top: 1rem;
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  :global(.dark .video-tool__loader-text) {
    color: #e5e7eb;
  }

  :global(.gallery-loader) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 0.5rem;
    z-index: 10;
  }

  :global(.dark .gallery-loader) {
    background: rgba(31, 41, 55, 0.8);
  }

  :global(.gallery-loader-spinner) {
    width: 40px;
    height: 40px;
    border: 4px solid #2563eb;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  :global(.dark .gallery-loader-spinner) {
    border-color: #60a5fa;
    border-top-color: transparent;
  }

  :global(.gallery-loader-text) {
    margin-top: 1rem;
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  :global(.dark .gallery-loader-text) {
    color: #e5e7eb;
  }

  :global(.ce-header[contenteditable="true"][data-placeholder]) {
    margin-bottom: 0.7em;
  }

  :global(.ce-header[contenteditable="true"]) {
    outline: none;
  }

  :global(.ce-header) {
    padding: 0.4em 0;
    margin: 0;
    line-height: 1.25em;
    outline: none;
  }

  :global(h2.ce-header) {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
  }

  :global(h3.ce-header) {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.2;
  }

  :global(.dark .ce-header) {
    color: #e5e7eb;
  }

  :global(.link-tool) {
    position: relative;
    width: 100%;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.link-tool__input) {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
    margin-bottom: 0.5rem;
  }

  :global(.dark .link-tool__input) {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global(.link-tool__input:focus) {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .link-tool__input:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  }

  :global(.link-suggestions) {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
  }

  :global(.dark .link-suggestions) {
    background: #1f2937;
    border-color: #4b5563;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  }

  :global(.link-suggestions__title) {
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.dark .link-suggestions__title) {
    color: #9ca3af;
    border-color: #4b5563;
  }

  :global(.link-suggestions__item) {
    padding: 0.5rem;
    font-size: 0.875rem;
    color: #1f2937;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.dark .link-suggestions__item) {
    color: #e5e7eb;
  }

  :global(.link-suggestions__item:hover) {
    background: #f3f4f6;
  }

  :global(.dark .link-suggestions__item:hover) {
    background: #374151;
  }

  /* Стили для кастомного попапа ссылок */
  :global(.ce-link-popup) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-family: inherit;
    font-size: 0.875rem;
    min-width: 250px;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.2s ease-out, transform 0.2s ease-out;
    flex-wrap: wrap;
  }

  :global(.ce-link-popup.visible) {
    opacity: 1;
    transform: translateY(0);
  }

  :global(.dark .ce-link-popup) {
    background: #1f2937;
    border-color: #4b5563;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  }

  :global(.ce-link-popup__input) {
    flex: 1;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background: white;
    color: #1f2937;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline: none;
    transition: border-color 0.15s ease-in-out;
    min-width: 150px;
  }

  :global(.dark .ce-link-popup__input) {
    background: #374151;
    border-color: #6b7280;
    color: #e5e7eb;
  }

  :global(.ce-link-popup__input:focus) {
    border-color: #2563eb;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.1);
  }

  :global(.dark .ce-link-popup__input:focus) {
    border-color: #60a5fa;
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.1);
  }

  :global(.ce-link-popup__anchors),
  :global(.ce-link-popup__save),
  :global(.ce-link-popup__remove) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background: white;
    color: #4b5563;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    outline: none;
  }

  :global(.dark .ce-link-popup__anchors),
  :global(.dark .ce-link-popup__save),
  :global(.dark .ce-link-popup__remove) {
    background: #374151;
    border-color: #6b7280;
    color: #e5e7eb;
  }

  :global(.ce-link-popup__anchors:hover) {
    background: #f3f4f6;
    border-color: #8b5cf6;
    color: #8b5cf6;
  }

  :global(.dark .ce-link-popup__anchors:hover) {
    background: #4b5563;
    border-color: #a78bfa;
    color: #a78bfa;
  }

  :global(.ce-link-popup__save:hover) {
    background: #f3f4f6;
    border-color: #2563eb;
    color: #2563eb;
  }

  :global(.dark .ce-link-popup__save:hover) {
    background: #4b5563;
    border-color: #60a5fa;
    color: #60a5fa;
  }

  :global(.ce-link-popup__remove:hover) {
    background: #fef2f2;
    border-color: #ef4444;
    color: #ef4444;
  }

  :global(.dark .ce-link-popup__remove:hover) {
    background: #7f1d1d;
    border-color: #dc2626;
    color: #dc2626;
  }

  :global(.ce-link-popup__anchors:active),
  :global(.ce-link-popup__save:active),
  :global(.ce-link-popup__remove:active) {
    transform: scale(0.95);
  }

  /* Стили для списка якорей в inline popup */
  :global(.ce-link-popup .ce-link-suggestions) {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 20;
    max-height: 200px;
    overflow-y: auto;
  }

  :global(.dark .ce-link-popup .ce-link-suggestions) {
    background: #1f2937;
    border-color: #4b5563;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  }

  :global(.ce-link-popup .ce-link-suggestions__title) {
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.dark .ce-link-popup .ce-link-suggestions__title) {
    color: #9ca3af;
    border-color: #4b5563;
  }

  :global(.ce-link-popup .ce-link-suggestions__item) {
    padding: 0.5rem;
    font-size: 0.875rem;
    color: #1f2937;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.dark .ce-link-popup .ce-link-suggestions__item) {
    color: #e5e7eb;
  }

  :global(.ce-link-popup .ce-link-suggestions__item:hover) {
    background: #f3f4f6;
  }

  :global(.dark .ce-link-popup .ce-link-suggestions__item:hover) {
    background: #374151;
  }
  
  /* Стили для позиционирования тулбара */
  :global(.ce-toolbar) {
    left: 1.5rem !important;
    margin-left: 0 !important;
  }

  /* Стили для иконок в тулбаре */
  :global(.ce-toolbar__plus img),
  :global(.ce-toolbar__settings-btn img),
  :global(.ce-conversion-tool img),
  :global(.ce-inline-toolbar__dropdown img),
  :global(.ce-inline-toolbar__buttons img) {
    width: 16px;
    height: 16px;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  :global(.ce-toolbar__plus:hover img),
  :global(.ce-toolbar__settings-btn:hover img),
  :global(.ce-conversion-tool:hover img),
  :global(.ce-inline-toolbar__dropdown:hover img),
  :global(.ce-inline-toolbar__buttons button:hover img) {
    opacity: 1;
  }

  :global(.ce-toolbar__actions img) {
    width: 14px;
    height: 14px;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  :global(.ce-toolbar__actions button:hover img) {
    opacity: 1;
  }

  :global(.ce-block__content) {
    margin-left: 1.5rem !important;
  }

  :global(.ce-block__content img) {
    max-width: 100%;
    height: auto;
  }

  :global(.ce-block--selected .ce-block__content img) {
    opacity: 0.7;
  }

  /* Стили для иконок в тунах блока */
  :global(.ce-tune-move-up img),
  :global(.ce-tune-move-down img) {
    width: 14px;
    height: 14px;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  :global(.ce-tune-move-up:hover img),
  :global(.ce-tune-move-down:hover img) {
    opacity: 1;
  }

  /* Стили для иконок в инлайн тулбаре */
  :global(.ce-inline-tool img) {
    width: 14px;
    height: 14px;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  :global(.ce-inline-tool:hover img) {
    opacity: 1;
  }

  :global(.ce-inline-tool--active img) {
    opacity: 1;
  }

  /* Стили для иконок в конвертере */
  :global(.ce-conversion-tool img) {
    margin-right: 8px;
  }

  :global(.ce-conversion-tool--focused img) {
    opacity: 1;
  }

  /* Стили для иконок в тулбоксе */
  :global(.ce-toolbox__button img) {
    width: 16px;
    height: 16px;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  :global(.ce-toolbox__button:hover img) {
    opacity: 1;
  }

  :global(.ce-toolbox__button--active img) {
    opacity: 1;
  }

  /* Темная тема для иконок */
  :global(.dark .ce-toolbar__plus img),
  :global(.dark .ce-toolbar__settings-btn img),
  :global(.dark .ce-conversion-tool img),
  :global(.dark .ce-inline-toolbar__dropdown img),
  :global(.dark .ce-inline-toolbar__buttons img),
  :global(.dark .ce-toolbar__actions img),
  :global(.dark .ce-tune-move-up img),
  :global(.dark .ce-tune-move-down img),
  :global(.dark .ce-inline-tool img),
  :global(.dark .ce-toolbox__button img) {
    filter: invert(1);
  }

  /* Стили для иконок в тулбаре */
  :global(.ce-block__content a),
  :global(.ce-block a),
  :global(.codex-editor a) {
    color: #0000EE !important;
    text-decoration: underline !important;
    cursor: pointer;
  }

  :global(.ce-block__content a:hover),
  :global(.ce-block a:hover),
  :global(.codex-editor a:hover) {
    color: #0000EE !important;
    text-decoration: underline !important;
  }

  :global(.dark .ce-toolbar__plus svg) {
    filter: none !important;
    color: #e4e4e7 !important;
    fill: #e4e4e7 !important;
    stroke: #e4e4e7 !important;
  }

  :global(.dark .ce-toolbar__plus:hover svg) {
    color: #000 !important;
    fill: #000 !important;
    stroke: #000 !important;
  }

  :global(.link-tool__row) {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  :global(.link-tool__input--url) {
    flex: 1;
    margin-bottom: 0;
  }

  :global(.link-tool__input--select) {
    width: 200px;
    margin-bottom: 0;
  }

  /* Таблица: убираем ограничения ширины */
  :global(.ce-block:has(.tc-wrap)) {
    max-width: 100% !important;
  }

  :global(.ce-block:has(.tc-wrap) .ce-block__content) {
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  :global(.tc-wrap) {
    overflow: visible;
    max-width: 100%;
  }

  :global(.tc-table) {
    overflow-x: auto;
  }

  :global(.tc-table--heading .tc-row:first-child) {
    z-index: 1 !important;
  }

  :global(.tc-toolbox) {
    z-index: 10 !important;
  }

  :global(.tc-popover) {
    z-index: 100 !important;
    background: white;
    border-radius: 6px;
    box-shadow: 0 3px 15px -3px rgba(13, 20, 33, 0.13);
  }

  :global(.dark .tc-popover) {
    background: #1e293b;
  }
</style>