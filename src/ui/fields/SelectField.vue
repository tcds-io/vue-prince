<template>
  <div :class="['vue-resource', resource, `${resource}--${name}`, 'field', `field--${type}`]">
    <label>{{ label }}</label>
    <select v-if="(page === 'EDIT' || page === 'CREATE') && !readOnly" v-model="value">
      <option v-for="(option, i) in options" :key="i">{{ option }}</option>
    </select>
    <span v-else :class="['enum', `enum--${slugify(value)}`]">{{ value }}</span>
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import type { SelectFieldProps } from '../../field-props'
import { slugify } from './index'

const value = defineModel<unknown>('value')
defineProps<SelectFieldProps<unknown>>()
</script>

<style>
@import './field-base.css';

.vue-resource.field--enum > select {
  cursor: pointer;
}
</style>
