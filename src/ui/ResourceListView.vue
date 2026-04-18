<template>
  <div>
    <div v-if="error">{{ error }}</div>
    <div v-else :style="{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }">
      <component :is="tableWrapper" v-if="tableWrapper" v-bind="props">
        <table :class="['vue-resource', 'resource-table', resource && `${resource}-table`]">
          <thead>
            <tr>
              <th
                v-for="field in schema"
                :key="field.name"
                :class="[
                  `field--${field.type}`,
                  `field-${resource}-${field.name}`,
                  `field-${field.name}`,
                ]"
                :style="thStyle(field.name)"
              >
                {{ labels?.[field.name] ?? toFieldLabel(field.name) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              :class="{ selectable: !!onRowClick }"
              @click="onRowClick?.(item)"
            >
              <td
                v-for="field in schema"
                :key="field.name"
                :class="[
                  `field--${field.type}`,
                  `field-${resource}-${field.name}`,
                  `field-${field.name}`,
                  item[field.name] != null && `field--${field.name}-${slugify(item[field.name])}`,
                ]"
                :style="tdStyle(field.name)"
              >
                {{
                  props.fields?.[field.name]?.list?.formatter?.(item[field.name]) ??
                  item[field.name]
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </component>
      <table v-else :class="['vue-resource', 'resource-table', resource && `${resource}-table`]">
        <thead>
          <tr>
            <th
              v-for="field in schema"
              :key="field.name"
              :class="[
                `field--${field.type}`,
                `field-${resource}-${field.name}`,
                `field-${field.name}`,
              ]"
              :style="thStyle(field.name)"
            >
              {{ labels?.[field.name] ?? toFieldLabel(field.name) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            :class="{ selectable: !!onRowClick }"
            @click="onRowClick?.(item)"
          >
            <td
              v-for="field in schema"
              :key="field.name"
              :class="[
                `field--${field.type}`,
                `field-${resource}-${field.name}`,
                `field-${field.name}`,
                item[field.name] != null && `field--${field.name}-${slugify(item[field.name])}`,
              ]"
              :style="tdStyle(field.name)"
            >
              {{
                props.fields?.[field.name]?.list?.formatter?.(item[field.name]) ?? item[field.name]
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceListItem, ResourceSchemaField } from '../api'
import type { ResourceFieldDef } from '../resource'
import { getConfig } from '../config'
import { toFieldLabel, slugify } from './fields'

const props = defineProps<{
  items: ResourceListItem<Record<string, unknown>>[]
  schema: ResourceSchemaField[]
  labels?: Record<string, string>
  fields?: Record<string, ResourceFieldDef>
  resource?: string
  loading: boolean
  error: string | null
  onRowClick?: (item: ResourceListItem<Record<string, unknown>>) => void
}>()

const tableWrapper = getConfig().layout?.table

function thStyle(name: string): Record<string, string> {
  const list = props.fields?.[name]?.list
  const style: Record<string, string> = {}
  if (list?.width != null) style.width = `${list.width}px`
  if (list?.align) style.textAlign = list.align
  return style
}

function tdStyle(name: string): Record<string, string> {
  const align = props.fields?.[name]?.list?.align
  return align ? { textAlign: align } : {}
}
</script>

<style>
.vue-resource.resource-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--prince-font-family, system-ui, -apple-system, sans-serif), serif;
  font-size: var(--prince-font-size-base, 0.875rem);
  color: var(--prince-color-text, #212529);
}

.vue-resource.resource-table thead tr {
  border-bottom: 2px solid var(--prince-color-border, #dee2e6);
}

.vue-resource.resource-table th {
  padding: 8px 12px;
  text-align: left;
  font-size: var(--prince-font-size-sm, 0.8125rem);
  font-weight: 600;
  color: var(--prince-color-text-muted, #6c757d);
  white-space: nowrap;
}

.vue-resource.resource-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--prince-color-border, #dee2e6);
  vertical-align: middle;
}

.vue-resource.resource-table tbody tr:last-child td {
  border-bottom: none;
}

.vue-resource.resource-table tbody tr.selectable {
  cursor: pointer;
  transition: background-color var(--prince-transition, 150ms ease);
}

.vue-resource.resource-table tbody tr.selectable:hover {
  background: var(--prince-color-surface, #f8f9fa);
}
</style>
