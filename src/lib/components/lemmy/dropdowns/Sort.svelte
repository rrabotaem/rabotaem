<script lang="ts">
  import { page } from '$app/stores'
  import { userSettings } from '$lib/settings'
  import { t } from '$lib/translations'
  import { searchParam } from '$lib/util.js'
  import type { SortType } from 'lemmy-js-client'
  import { Select } from 'mono-svelte'
  import SelectSort from 'mono-svelte/forms/SelectSort.svelte'
  import {
    ArrowTrendingDown,
    ArrowTrendingUp,
    Calendar,
    CalendarDays,
    ChartBar,
    ChatBubbleLeftRight,
    ChatBubbleOvalLeft,
    Clock,
    Fire,
    Icon,
    PlusCircle,
    Scale,
    Star,
    Sun,
    Trophy,
  } from 'svelte-hero-icons'
  import { backOut } from 'svelte/easing'
  import { fly, slide } from 'svelte/transition'

  export let selected: string
  export let navigate: boolean = true
  export let changeDefault: boolean = false
  export let showLabel: boolean = false

  let sort: string = selected?.startsWith('Top') ? 'TopAll' : selected
  $: if (selected) {
    sort = selected?.startsWith('Top') ? 'TopAll' : selected
  }
  const setSelected = () => (selected = sort)
  $: changeDefault
    ? ($userSettings.defaultSort.sort = selected as SortType)
    : undefined
</script>

<SelectSort
  {...$$restProps}
  class={selected?.startsWith('Top') ? 'rounded-r-none' : ''}
  bind:value={sort}
  on:change={(e) => {
    setSelected()
    if (navigate) searchParam($page.url, 'sort', selected, 'page', 'cursor')
  }}
>
  <option value="TopAll">{$t('filter.sort.top.label')}</option>
  <option value="Active">{$t('filter.sort.active')}</option>
  <option value="Hot">{$t('filter.sort.hot')}</option>
  <option value="Scaled">{$t('filter.sort.scaled')}</option>
  <option value="New">{$t('filter.sort.new')}</option>
  <option value="Old">{$t('filter.sort.old')}</option>
  <option value="Controversial">{$t('filter.sort.controversial')}</option>
  <option value="MostComments">{$t('filter.sort.mostcomments')}</option>
  <option value="NewComments">{$t('filter.sort.newcomments')}</option>
</SelectSort>

{#if selected?.startsWith('Top')}
  <SelectSort
    class="border-l-0 rounded-l-none"
    bind:value={selected}
    on:change={(e) => {
      sort = 'TopAll'
      if (navigate)
        searchParam($page.url, 'sort', selected, 'page', 'cursor')
    }}
  >
    <option value="TopAll">{$t('filter.sort.top.time.all')}</option>
    <option value="TopNineMonths">{$t('filter.sort.top.time.9months')}</option>
    <option value="TopSixMonths">{$t('filter.sort.top.time.6months')}</option>
    <option value="TopThreeMonths">{$t('filter.sort.top.time.3months')}</option>
    <option value="TopMonth">{$t('filter.sort.top.time.month')}</option>
    <option value="TopWeek">{$t('filter.sort.top.time.week')}</option>
    <option value="TopDay">{$t('filter.sort.top.time.day')}</option>
    <option value="TopTwelveHours">{$t('filter.sort.top.time.12hours')}</option>
    <option value="TopSixHours">{$t('filter.sort.top.time.6hours')}</option>
    <option value="TopHour">{$t('filter.sort.top.time.hour')}</option>
  </SelectSort>
{/if}
