<template>
  <component
    :is="customComponent"
    v-if="customComponent"
    :type="nativeType"
    :label="defaultLabel"
    :variant="variant"
    :prince-type="type"
    v-bind="$attrs"
  >
    <slot>{{ defaultLabel }}</slot>
  </component>
  <button
    v-else
    :type="nativeType"
    :class="['vue-resource', 'prince-btn', `prince-btn--${variant}`]"
    v-bind="$attrs"
  >
    <slot>{{ defaultLabel }}</slot>
  </button>
</template>

<script setup lang="ts">
import type { PrinceButtonProps } from '../button-props'
import { getConfig } from '../config'
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<PrinceButtonProps>()

const customComponent = computed(() => getConfig().buttons?.[props.type])
const nativeType = computed(() => (props.type === 'Submit' ? 'submit' : 'button'))
const variant = computed(() => {
  if (props.variant) return props.variant
  if (props.type === 'Submit' || props.type === 'Create') return 'primary'
  if (props.type === 'Delete') return 'danger'
  return 'secondary'
})
const defaultLabel = computed(
  () =>
    props.label ??
    {
      Submit: 'Save',
      Create: 'Create',
      Edit: 'Edit',
      Back: 'Back',
      Cancel: 'Cancel',
      Delete: 'Delete',
      Pagination: '',
    }[props.type],
)
</script>

<style>
.vue-resource.prince-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: var(--prince-radius-sm, 4px);
  font-family: inherit;
  font-size: var(--prince-font-size-base, 0.875rem);
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  text-decoration: none;
  transition:
    background-color var(--prince-transition, 150ms ease),
    border-color var(--prince-transition, 150ms ease);
}

.vue-resource.prince-btn:disabled,
.vue-resource.prince-btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.vue-resource.prince-btn--primary {
  background: var(--prince-color-primary, #2563eb);
  color: var(--prince-color-primary-text, #ffffff);
  border-color: var(--prince-color-primary, #2563eb);
}

.vue-resource.prince-btn--primary:hover:not(:disabled) {
  background: var(--prince-color-primary-hover, #1d4ed8);
  border-color: var(--prince-color-primary-hover, #1d4ed8);
}

.vue-resource.prince-btn--secondary {
  background: var(--prince-color-secondary, #e9ecef);
  color: var(--prince-color-secondary-text, #212529);
  border-color: var(--prince-color-border, #dee2e6);
}

.vue-resource.prince-btn--secondary:hover:not(:disabled) {
  background: var(--prince-color-secondary-hover, #ced4da);
}

.vue-resource.prince-btn--danger {
  background: var(--prince-color-danger, #dc3545);
  color: var(--prince-color-danger-text, #ffffff);
  border-color: var(--prince-color-danger, #dc3545);
}

.vue-resource.prince-btn--danger:hover:not(:disabled) {
  background: var(--prince-color-danger-hover, #b02a37);
  border-color: var(--prince-color-danger-hover, #b02a37);
}
</style>
