<template>
  <PrinceCard :title="headerTitle">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <div v-if="loading">Loading…</div>
    <div v-else-if="error" class="vue-resource prince-error">
      Failed to load {{ resourceLabel }}
    </div>
    <div v-else-if="item" class="vue-resource prince-detail-body">
      <component
        :is="resolveFieldComponent(fields?.[field.name]?.type ?? field.type, 'display')"
        v-for="field in schema"
        :key="field.name"
        :name="field.name"
        :type="resolveDisplayType(fields?.[field.name]?.type, field.type)"
        :resource="resource ?? 'field'"
        :value="fieldDisplayValue(field.name)"
        :label="labels?.[field.name] ?? toFieldLabel(field.name)"
        page="VIEW"
        :options="fields?.[field.name]?.values ?? field.values ?? []"
        v-bind="getResourceFieldProps(fields?.[field.name]?.type)"
      />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </PrinceCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ResourceSchemaField } from '../api'
import type { ResourceFieldDef } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'
import {
  resolveFieldComponent,
  normalizeFieldType,
  toFieldLabel,
  buildResourceFieldProps,
} from './fields'
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

function fieldDisplayValue(name: string): unknown {
  const raw = props.item?.[name]
  const def = props.fields?.[name]
  if (!def || isResourceRef(resolveFieldType(def.type))) return raw
  return def.form?.formatter?.(raw) ?? raw
}

const props = defineProps<{
  item: Record<string, unknown> | null
  schema: ResourceSchemaField[]
  labels?: Record<string, string>
  fields?: Record<string, ResourceFieldDef>
  resource?: string
  loading: boolean
  error: string | null
  itemTitle?: string
}>()

const resourceLabel = computed(() => {
  const n = props.resource ?? ''
  return n.charAt(0).toUpperCase() + n.slice(1)
})

const headerTitle = computed(() => {
  if (props.itemTitle) return props.itemTitle
  const name = props.resource ?? ''
  const label = name.charAt(0).toUpperCase() + name.slice(1)
  return props.item?.id != null ? `${label} ${props.item.id}` : label
})
</script>

<style>
.vue-resource.prince-error {
  color: var(--prince-color-danger, #dc3545);
  font-size: var(--prince-font-size-sm, 0.8125rem);
  padding: 8px 0;
}

.vue-resource.prince-detail-body {
  display: flex;
  flex-direction: column;
}
</style>
