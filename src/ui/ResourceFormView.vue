<template>
  <PrinceCard :title="headerTitle">
    <div v-if="loading">Loading…</div>
    <form
      v-else
      id="prince-resource-form"
      class="vue-resource prince-form-body"
      @submit.prevent="handleSubmit"
    >
      <component
        :is="resolveFieldComponent(fields?.[field.name]?.type ?? field.type, 'form')"
        v-for="field in schema"
        :key="field.name"
        :value="displayFormValue(field.name)"
        :name="field.name"
        :type="resolveDisplayType(fields?.[field.name]?.type, field.type)"
        :resource="resource ?? 'field'"
        :label="labels?.[field.name] ?? toFieldLabel(field.name)"
        :page="page"
        :options="fields?.[field.name]?.values ?? field.values ?? []"
        :read-only="fields?.[field.name]?.form?.readOnly ?? false"
        :error="fieldErrors[field.name]"
        v-bind="getResourceFieldProps(fields?.[field.name]?.type)"
        @update:value="onFieldUpdate(field.name, $event)"
      />
      <div v-if="error" class="vue-resource prince-error">
        Failed to {{ actionVerb }} {{ resourceLabel }}
      </div>
    </form>

    <template #footer>
      <slot name="actions">
        <PrinceButton type="Cancel" @click="emit('cancel')" />
        <PrinceButton type="Submit" form="prince-resource-form" />
      </slot>
    </template>
  </PrinceCard>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { ResourceSchemaField } from '../api'
import type { ResourceFieldDef, ValidationSchema } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'
import type { FieldPage } from '../field-props'
import {
  resolveFieldComponent,
  normalizeFieldType,
  toFieldLabel,
  buildResourceFieldProps,
} from './fields'
import PrinceButton from './PrinceButton.vue'
import PrinceCard from './PrinceCard.vue'

function resolveDisplayType(
  specType: ResourceFieldDef['type'] | undefined,
  apiType: string,
): string {
  const resolved = specType != null ? resolveFieldType(specType) : specType
  if (isResourceRef(resolved)) return 'integer'
  return normalizeFieldType((resolved as string | undefined) ?? apiType)
}

function getResourceFieldProps(specType: ResourceFieldDef['type'] | undefined) {
  const resolved = specType != null ? resolveFieldType(specType) : specType
  const refSpec = isResourceRef(resolved) ? resolved : undefined
  return refSpec ? buildResourceFieldProps(refSpec) : {}
}

const props = defineProps<{
  item: Record<string, unknown> | null
  schema: ResourceSchemaField[]
  labels?: Record<string, string>
  fields?: Record<string, ResourceFieldDef>
  resource?: string
  loading: boolean
  error: string | null
  page: Extract<FieldPage, 'CREATE' | 'EDIT'>
  itemTitle?: string
  validationSchema?: ValidationSchema
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const resourceLabel = computed(() => {
  const name = props.resource ?? ''
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const actionVerb = computed(() => (props.page === 'CREATE' ? 'create' : 'update'))

const headerTitle = computed(() =>
  props.page === 'CREATE' ? `Create ${resourceLabel.value}` : `Edit ${resourceLabel.value}`,
)

function displayFormValue(name: string): unknown {
  const raw = formData[name]
  const fieldDef = props.fields?.[name]
  if (
    fieldDef?.form?.readOnly &&
    fieldDef.form.formatter &&
    !isResourceRef(resolveFieldType(fieldDef.type))
  )
    return fieldDef.form.formatter(raw)
  return raw
}

const formData = reactive<Record<string, unknown>>({})
const fieldErrors = reactive<Record<string, string>>({})

watch(
  () => props.item,
  (item) => {
    if (item) Object.assign(formData, item)
  },
  { immediate: true },
)

function onFieldUpdate(name: string, value: unknown) {
  formData[name] = value
  delete fieldErrors[name]
}

function handleSubmit() {
  if (props.validationSchema) {
    const result = props.validationSchema.safeParse({ ...formData })
    if (!result.success) {
      Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
      result.error?.issues.forEach(({ path, message }) => {
        const key = path[0] != null && typeof path[0] !== 'symbol' ? String(path[0]) : ''
        if (key && !fieldErrors[key]) fieldErrors[key] = message
      })
      return
    }
  }
  emit('submit', { ...formData })
}
</script>

<style>
.vue-resource.prince-error {
  color: var(--prince-color-danger, #dc3545);
  font-size: var(--prince-font-size-sm, 0.8125rem);
  padding: 8px 0;
}

.vue-resource.prince-form-body {
  display: flex;
  flex-direction: column;
}
</style>
