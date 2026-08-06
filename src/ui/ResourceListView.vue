<template>
  <div>
    <div v-if="error" class="vue-resource prince-error">
      Failed to list {{ resourceLabelPlural }}
    </div>
    <div v-else :style="{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }">
      <component :is="tableWrapper ?? PassThrough" v-bind="props">
        <table :class="['vue-resource', 'resource-table', resource && `${resource}-table`]">
          <thead>
            <tr>
              <th v-if="selectable" class="field--selection">
                <input
                  v-if="onToggleAllSelection"
                  type="checkbox"
                  aria-label="Select all rows"
                  :checked="allSelected"
                  :indeterminate="someSelected && !allSelected"
                  @change="onToggleAllSelection?.(!allSelected)"
                />
              </th>
              <th
                v-for="field in schema"
                :key="field.name"
                :class="[
                  `field--${field.type}`,
                  `field-${resource}-${field.name}`,
                  `field-${field.name}`,
                  isSortable(field.name) && 'field--sortable',
                  sort?.column === field.name && 'field--sorted',
                ]"
                :style="thStyle(field.name)"
                :aria-sort="ariaSort(field.name)"
              >
                <button
                  v-if="isSortable(field.name)"
                  type="button"
                  class="vue-resource prince-sort-toggle"
                  @click="onSort?.(field.name)"
                >
                  {{ labels?.[field.name] ?? toFieldLabel(field.name) }}
                  <span class="vue-resource prince-sort-indicator" aria-hidden="true">{{
                    sortIndicator(field.name)
                  }}</span>
                </button>
                <template v-else>{{ labels?.[field.name] ?? toFieldLabel(field.name) }}</template>
              </th>
              <th v-if="visibleItemActions.length" class="field--actions" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              :class="{ selectable: !!onRowClick, 'row--selected': isSelected(item.id) }"
              @click="onRowClick?.(item)"
            >
              <td v-if="selectable" class="field--selection" @click.stop>
                <input
                  type="checkbox"
                  aria-label="Select row"
                  :checked="isSelected(item.id)"
                  @change="onToggleSelection?.(item.id)"
                />
              </td>
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
              <td v-if="visibleItemActions.length" class="field--actions" @click.stop>
                <component :is="dropdownComponent" :actions="resolveItemActions(item)" />
              </td>
            </tr>
          </tbody>
        </table>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent } from 'vue'
import type { ResourceId, ResourceListItem, ResourceSchemaField } from '../api'
import type { ResourceFieldDef, ResourceItemAction } from '../resource'
import { hasActionPermission } from '../resource'
import type { ResourceSort } from '../sort'
import { getConfig } from '../config'
import { toFieldLabel, slugify } from './fields'
import PrinceDropdown from './PrinceDropdown.vue'

const props = defineProps<{
  items: ResourceListItem<Record<string, unknown>>[]
  schema: ResourceSchemaField[]
  labels?: Record<string, string>
  fields?: Record<string, ResourceFieldDef>
  resource?: string
  loading: boolean
  error: string | null
  lastError?: Error | null
  onRowClick?: (item: ResourceListItem<Record<string, unknown>>) => void
  itemActions?: ResourceItemAction[]
  sort?: ResourceSort | null
  onSort?: (column: string) => void
  // Selection is controlled by the caller: pass the currently selected ids plus a toggle to
  // render the checkbox column. Omitting either leaves the table exactly as it was.
  selection?: ResourceId[]
  onToggleSelection?: (id: ResourceId) => void
  onToggleAllSelection?: (selected: boolean) => void
}>()

// Renders the table unwrapped when no `layout.table` is configured, so the markup below
// lives in one place instead of being duplicated across a v-if/v-else pair.
const PassThrough = defineComponent({
  name: 'PrinceTablePassThrough',
  inheritAttrs: false,
  setup:
    (_, { slots }) =>
    () =>
      slots.default?.(),
})

const tableWrapper = getConfig().layout?.table
const dropdownComponent = computed(() => getConfig().layout?.dropdown ?? PrinceDropdown)

function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (/(s|sh|ch|x|z)$/i.test(word)) return word + 'es'
  return word + 's'
}
const resourceLabel = computed(() => {
  const n = props.resource ?? ''
  return n.charAt(0).toUpperCase() + n.slice(1)
})
const resourceLabelPlural = computed(() => pluralize(resourceLabel.value))

const visibleItemActions = computed(() =>
  (props.itemActions ?? []).filter((a) => hasActionPermission(a.permission)),
)

function resolveItemActions(item: ResourceListItem<Record<string, unknown>>) {
  return visibleItemActions.value.map((a) => ({
    label: typeof a.label === 'function' ? a.label(item) : a.label,
    onClick: () => a.onClick(item),
  }))
}

const selectable = computed(() => !!props.selection && !!props.onToggleSelection)

function isSelected(id: ResourceId): boolean {
  return props.selection?.includes(id) ?? false
}

const allSelected = computed(
  () => props.items.length > 0 && props.items.every((item) => isSelected(item.id)),
)

const someSelected = computed(() => props.items.some((item) => isSelected(item.id)))

function isSortable(name: string): boolean {
  return !!props.onSort && props.fields?.[name]?.list?.sortable === true
}

function ariaSort(name: string): 'ascending' | 'descending' | 'none' | undefined {
  if (!isSortable(name)) return undefined
  if (props.sort?.column !== name) return 'none'

  return props.sort.direction === 'asc' ? 'ascending' : 'descending'
}

function sortIndicator(name: string): string {
  if (props.sort?.column !== name) return '↕'

  return props.sort.direction === 'asc' ? '↑' : '↓'
}

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
.vue-resource.prince-error {
  color: var(--prince-color-danger, #dc3545);
  font-size: var(--prince-font-size-sm, 0.8125rem);
  padding: 8px 0;
}

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

.vue-resource.resource-table th.field--actions,
.vue-resource.resource-table td.field--actions {
  width: 40px;
  white-space: nowrap;
  padding: 4px 8px;
  text-align: right;
}

.vue-resource.resource-table th.field--selection,
.vue-resource.resource-table td.field--selection {
  width: 32px;
  white-space: nowrap;
  padding: 4px 8px;
  text-align: left;
}

.vue-resource.resource-table .field--selection input[type='checkbox'] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--prince-color-primary, #2563eb);
  vertical-align: middle;
}

.vue-resource.resource-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--prince-color-border, #dee2e6);
  vertical-align: middle;
}

.vue-resource.resource-table tbody tr.row--selected {
  background: var(--prince-color-selected, #eff6ff);
}

.vue-resource.resource-table tbody tr.selectable.row--selected:hover {
  background: var(--prince-color-selected-hover, #dbeafe);
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

.vue-resource.prince-sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: inherit;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}

.vue-resource.prince-sort-toggle:hover {
  color: var(--prince-color-text, #212529);
}

.vue-resource.prince-sort-indicator {
  opacity: 0.4;
  font-size: 0.9em;
}

.vue-resource.resource-table th.field--sorted .prince-sort-indicator {
  opacity: 1;
}
</style>
