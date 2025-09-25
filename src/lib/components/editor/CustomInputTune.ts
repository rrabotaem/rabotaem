import { transliterate } from '$lib/util/transliterate';

class CustomInputTune {
    static get isTune() {
        return true;
    }

    private api: any;
    private block: any;
    private data: { text: string };
    private _CSS = {
        wrapper: 'ce-tune-custom-input-wrapper',
        icon: 'ce-tune-icon'
    };

    constructor({ api, data, block }: { api: any; data?: { text: string }; block: any }) {
        this.api = api;
        this.block = block;
        this.data = {
            text: data?.text || ''
        };
    }

    wrap(blockContent: HTMLElement) {
        const wrapper = document.createElement('div');
        wrapper.classList.add(this._CSS.wrapper);
        wrapper.appendChild(blockContent);
        return wrapper;
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '6px';
        wrapper.style.paddingLeft = '2px';
        
        const icon = document.createElement('div');
        icon.classList.add(this._CSS.icon);
        icon.innerHTML = `
            <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10.831 8.227A3.333 3.333 0 0 0 10 1.669a3.331 3.331 0 0 0-.831 6.558v.942H6.875a.831.831 0 1 0 0 1.662h2.294v5.797c-1.726-.175-2.68-.89-3.218-1.535a3.837 3.837 0 0 1-.626-1.058 3.1 3.1 0 0 1-.129-.415l-.002-.013a.831.831 0 0 0-1.64.28l.016.076a4.758 4.758 0 0 0 .206.673 5.5 5.5 0 0 0 .898 1.521C5.617 17.29 7.26 18.331 10 18.331c2.74 0 4.382-1.042 5.326-2.174a5.5 5.5 0 0 0 .898-1.52 4.747 4.747 0 0 0 .206-.673v-.001l.015-.076a.831.831 0 0 0-1.64-.28l-.002.013-.019.08a3.04 3.04 0 0 1-.11.335 3.836 3.836 0 0 1-.625 1.058c-.538.646-1.493 1.36-3.218 1.535v-5.797h2.294a.831.831 0 0 0 0-1.662H10.83v-.942zM10 3.33a1.669 1.669 0 1 0 0 3.338 1.669 1.669 0 0 0 0-3.338z"></path>
            </svg>
        `;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.classList.add(this.api.styles.settingsInput);
        input.value = this.data.text;
        input.placeholder = 'Якорь';
        input.style.flex = '1';
        input.style.minWidth = '30px';
        input.style.fontSize = '14px';
        input.style.padding = '0 4px';
        input.style.color = '#000000';
        
        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const originalValue = target.value;
            
            // Транслитерируем текст и удаляем все символы кроме латиницы, цифр, дефиса и подчеркивания
            const transliteratedValue = transliterate(originalValue);
            const validValue = transliteratedValue.replace(/[^a-zA-Z0-9\-_]/g, '');
            
            // Обновляем значение только если оно изменилось
            if (validValue !== target.value) {
                target.value = validValue;
                
                // Сохраняем позицию курсора
                const cursorPosition = target.selectionStart;
                if (cursorPosition !== null) {
                    // Устанавливаем курсор в правильную позицию после изменения значения
                    setTimeout(() => {
                        target.setSelectionRange(cursorPosition, cursorPosition);
                    }, 0);
                }
            }
            
            this.data.text = validValue;
            this.block.dispatchChange();
        });
        
        wrapper.appendChild(icon);
        wrapper.appendChild(input);
        return wrapper;
    }

    save() {
        return this.data;
    }
}

export default CustomInputTune; 