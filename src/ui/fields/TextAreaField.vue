<template>
  <div :class="['vue-resource', resource, `${resource}--${name}`, 'field', `field--${type}`]">
    <label>{{ label }}</label>
    <textarea v-if="(page === 'EDIT' || page === 'CREATE') && !readOnly" v-model="valueAsString" />
    <span v-else class="field-value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FieldProps } from '../../field-props'

const value = defineModel<unknown>('value')
defineProps<FieldProps>()

const valueAsString = computed({
  get: () => String(value.value ?? ''),
  set: (v) => (value.value = v),
})
</script>

<style>
@import './field-base.css';

.vue-resource.field--text > textarea {
  min-height: 100px;
  resize: vertical;
}
</style>
