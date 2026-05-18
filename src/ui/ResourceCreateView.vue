<template>
  <ResourceFormView
    :item="item"
    :schema="schema"
    :labels="labels"
    :fields="fields"
    :resource="resource"
    :loading="loading"
    :error="error"
    :item-title="itemTitle"
    :validation-schema="validationSchema"
    page="CREATE"
    @submit="(data) => emit('submit', data)"
    @cancel="() => emit('cancel')"
  >
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
  </ResourceFormView>
</template>

<script setup lang="ts">
import type { ResourceSchemaField } from '../api'
import type { ResourceFieldDef, ValidationSchema } from '../resource'
import ResourceFormView from './ResourceFormView.vue'

defineProps<{
  item: Record<string, unknown> | null
  schema: ResourceSchemaField[]
  labels?: Record<string, string>
  fields?: Record<string, ResourceFieldDef>
  resource?: string
  loading: boolean
  error: string | null
  itemTitle?: string
  validationSchema?: ValidationSchema
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()
</script>
