<script lang="ts">
  import {
    buttonColor,
    buttonSize,
    type ButtonShadow,
    type ButtonSize,
    buttonShadow,
  } from '../button/Button.svelte'
  import Label from '../forms/Label.svelte'
  import { generateID } from '../forms/helper.js'
  import Menu from '../popover/Menu.svelte'
  import MenuButton from '../popover/MenuButton.svelte'
  import Popover from '../popover/Popover.svelte'
  import { createEventDispatcher, onMount } from 'svelte'
  import { browser } from '$app/environment'
  import {
    CheckCircle,
    Icon,
  } from 'svelte-hero-icons'
  import { openedSelectId } from './selectStore'
  import { nanoid } from 'nanoid'

  type T = $$Generic

  export let value: T | undefined = undefined
  export let placeholder: string | undefined = undefined
  export let id: string = ''

  let open = false
  let element: HTMLSelectElement

  let options: { value: any; label: string | null; disabled: boolean }[] = []

  // Capture all options from the select element
  $: options = element?.options
    ? Array.from(element?.options).map((option) => ({
        value: option.value,
        label: option.innerHTML,
        disabled: option.disabled,
      }))
    : []

  const dispatcher = createEventDispatcher<{
    change: any
    contextmenu: any
    input: any
  }>()

  // Закрытие дропдауна при клике вне селекта
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.custom-select-wrapper')) {
      open = false
    }
  }

  // Закрытие дропдауна при нажатии Escape
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      open = false
    }
  }

  // Добавляем и удаляем обработчики событий
  $: if (open && browser) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
  } else if (browser) {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  }

  // Очистка при размонтировании компонента
  onMount(() => {
    if (!id) id = nanoid()
    const unsub = openedSelectId.subscribe(current => {
      if (open && current !== id) open = false
    })
    return () => {
      unsub()
      if (browser) {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('keydown', handleKeydown)
      }
    }
  })

  $: if (open) {
    openedSelectId.set(id)
  }
</script>

<style>
  .custom-select-wrapper {
    display: inline-flex;
    align-items: baseline;
    position: relative;
    font-size: 14px;
    font-weight: normal;
    color: #18181b;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    width: max-content;
    min-width: max-content;
  }
  
  :global(.dark) .custom-select-wrapper {
    color: #e4e4e7;
  }
  
  .custom-select-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    width: fit-content;
    min-width: 0;
    white-space: nowrap;
    transition: background 0.15s;
    border-radius: 32px;
    padding: 8px 16px;
  }
  .custom-select-label:hover {
    background: rgba(100, 116, 139, 0.08);
  }
  
  :global(.dark) .custom-select-label:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .custom-select-label:hover .custom-select-chevron svg path {
    stroke: #334155;
  }
  
  :global(.dark) .custom-select-label:hover .custom-select-chevron svg path {
    stroke: #a1a1aa;
  }
  
  .custom-select-main {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
  }
  .custom-select-text {
    background: none;
    border: none;
    outline: none;
    font: inherit;
    color: inherit;
    padding: 0;
    cursor: pointer;
    position: relative;
    z-index: 1;
    display: inline-block;
    text-align: center;
    width: fit-content;
    min-width: 0;
    white-space: nowrap;
  }
  .custom-select-chevron {
    font-size: 12px;
    color: #b0b0b0;
    pointer-events: none;
    user-select: none;
    z-index: 2;
    margin-left: 8px;
  }
  
  :global(.dark) .custom-select-chevron {
    color: #71717a;
  }
  
  .custom-select-underline {
    width: 100%;
    height: 2px;
    background: #0a84ff;
    border-radius: 2px;
    margin-top: 2px;
    transition: width 0.2s;
    z-index: 0;
    align-self: stretch;
  }
  select {
    display: none;
  }
  .custom-options {
    position: absolute;
    left: 0;
    top: 120%;
    min-width: 100%;
    max-width: 120px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 24px 0 #0001;
    padding: 0.3em 0;
    z-index: 10;
    border: 1px solid #e5e7eb;
    margin-top: 0.2em;
    overflow-x: auto;
  }
  
  :global(.dark) .custom-options {
    background: #18181b;
    border-color: #3f3f46;
    box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.3);
  }
  
  .custom-option {
    padding: 0.5em 1.2em 0.5em 0.7em;
    font-size: 14px;
    color: #18181b;
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background 0.12s;
    white-space: nowrap;
  }
  
  :global(.dark) .custom-option {
    color: #e4e4e7;
  }
  
  .custom-option:hover, .custom-option.selected {
    background: #f3f4f6;
  }
  
  :global(.dark) .custom-option:hover, 
  :global(.dark) .custom-option.selected {
    background: #27272a;
  }
</style>

<div class="custom-select-wrapper">
  <button type="button" class="custom-select-label" on:click={() => open = !open}>
    <span class="custom-select-main">
      <span class="custom-select-text">
        {#if value}
          {options.find(o => o.value == value)?.label}
        {:else if placeholder}
          <span class="text-slate-400">{placeholder}</span>
        {/if}
      </span>
      <span class="custom-select-chevron" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 8L10 13L15 8" stroke="#64748b" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </span>
    <div class="custom-select-underline"></div>
  </button>
  <select bind:this={element} bind:value style="display:none">
    {#if placeholder}
      <option disabled selected value="">{placeholder}</option>
    {/if}
    <slot />
  </select>
  {#if open}
    <div class="custom-options">
      {#each options as option}
        <button class="custom-option {option.value == value ? 'selected' : ''}" on:click={() => { value = option.value; open = false; dispatcher('change'); }} disabled={option.disabled}>{option.label ? option.label.replace(/<[^>]+>/g, '') : ''}</button>
      {/each}
    </div>
  {/if}
</div>
