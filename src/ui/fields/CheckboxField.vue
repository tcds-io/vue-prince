<template>
  <div :class="['vue-resource', resource, `${resource}--${name}`, 'field', `field--${type}`]">
    <label>{{ label }}</label>
    <input
      v-if="(page === 'EDIT' || page === 'CREATE') && !readOnly"
      v-model="valueAsBool"
      type="checkbox"
    />
    <span v-else :class="['boolean', `boolean--${Boolean(value)}`]">
      {{ value ? '✓' : '✗' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FieldProps } from '../../field-props'

const value = defineModel<unknown>('value')
defineProps<FieldProps>()

const valueAsBool = computed({
  get: () => Boolean(value.value),
  set: (v) => (value.value = v),
})
</script>

<style>
@import './field-base.css';

.vue-resource.field--boolean {
  flex-direction: row;
  align-items: center;
}

.vue-resource.field--boolean > label {
  order: 2;
}

.vue-resource.field--boolean > input[type='checkbox'] {
  order: 1;
  width: 16px;
  height: 16px;
  padding: 0;
  cursor: pointer;
  accent-color: var(--prince-color-primary, #2563eb);
  flex-shrink: 0;
}
</style>
