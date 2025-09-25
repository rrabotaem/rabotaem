<script lang="ts">
  export let small: boolean = false
</script>

<div
  {...$$restProps}
  class="{!small ? 'text-lg' : 'text-xs'} font-normal {$$props.class}"
>
  <slot />
</div>
