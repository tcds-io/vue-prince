<template>
  <div :class="['vue-resource', resource, `${resource}--${name}`, 'field', `field--${type}`]">
    <label>{{ label }}</label>
    <input
      v-if="(page === 'EDIT' || page === 'CREATE') && !readOnly"
      type="datetime-local"
      :value="toDatetimeLocal(value)"
      @input="value = ($event.target as HTMLInputElement).value"
    />
    <span v-else class="field-value">{{ value }}</span>
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import type { FieldProps } from '../../field-props'

const value = defineModel<unknown>('value')
defineProps<FieldProps>()

function toDatetimeLocal(value: unknown): string {
  if (!value || typeof value !== 'string') return ''
  return value.slice(0, 16)
}
</script>

<style>
@import './field-base.css';
</style>
