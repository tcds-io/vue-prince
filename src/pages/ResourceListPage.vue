<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <PrinceCard v-else :title="resourceLabelPlural">
    <template v-if="canCreate || listActions.length" #header>
      <div class="vue-resource prince-list-header-actions">
        <component :is="dropdownComponent" v-if="listActions.length" :actions="listActions" />
        <PrinceButton v-if="canCreate" type="Create" @click="createNew"
          >Create {{ resourceLabel }}</PrinceButton
        >
      </div>
    </template>

    <component
      :is="searchComponent"
      v-if="searchComponent"
      :value="search"
      :on-search="scheduleSearch"
    />
    <input
      v-else
      v-model="searchInput"
      type="search"
      placeholder="Search…"
      class="vue-resource prince-search-input"
      @input="onSearchInput"
    />

    <ResourceListView
      :items="items"
      :schema="schema"
      :labels="labels"
      :fields="enrichedFields"
      :resource="route.meta.spec?.name"
      :loading="store.loading.list"
      :error="store.error"
      :on-row-click="navigateToItem"
      :item-actions="route.meta.spec?.actions?.resource"
    />

    <template #footer>
      <div v-if="store.itemsMeta" class="vue-resource prince-pagination">
        <PrinceButton type="Pagination" label="|←" :disabled="page <= 1" @click="goToPage(1)" />
        <PrinceButton
          type="Pagination"
          label="←"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        />
        <PrinceButton
          v-for="p in pages"
          :key="p"
          type="Pagination"
          :label="String(p)"
          :variant="p === page ? 'primary' : undefined"
          @click="goToPage(p)"
        />
        <PrinceButton
          type="Pagination"
          label="→"
          :disabled="page >= store.itemsMeta.last_page"
          @click="goToPage(page + 1)"
        />
        <PrinceButton
          type="Pagination"
          label="→|"
          :disabled="page >= store.itemsMeta.last_page"
          @click="goToPage(store.itemsMeta.last_page)"
        />
      </div>
    </template>
  </PrinceCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../resource-controller'
import type { ResourceListItem, ResourceSchemaField } from '../api'
import type { ResourceListPageProps } from '../page-props'
import type { ResourceFieldDef } from '../resource'
import { hasPermission, hasActionPermission, isResourceRef, resolveFieldType } from '../resource'
import { getConfig } from '../config'
import PrinceButton from '../ui/PrinceButton.vue'
import PrinceCard from '../ui/PrinceCard.vue'
import PrinceDropdown from '../ui/PrinceDropdown.vue'

import ResourceListView from '../ui/ResourceListView.vue'
import { useResourceLabels, useResourceLabelMap, useResourceSchema } from './use-resource-meta'

const route = useRoute()
const router = useRouter()
const store = createResourceController(route.meta.spec!).store()

const segment = computed(() => route.meta.spec?.route.split('/').pop())
function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (/(s|sh|ch|x|z)$/i.test(word)) return word + 'es'
  return word + 's'
}

const resourceLabel = computed(() => {
  const name = route.meta.spec?.name ?? ''
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const resourceLabelPlural = computed(() => pluralize(resourceLabel.value))

const specFields = route.meta.spec?.fields
const hasSpecFields = specFields && Object.keys(specFields).length > 0

const schema = useResourceSchema(
  () =>
    store.itemsMeta?.schema?.length
      ? store.itemsMeta.schema
      : (store.schemaFields as ResourceSchemaField[]),
  { previewOnly: true },
)
const labels = useResourceLabels()

const page = computed(() => Number(route.query.page ?? 1))
const search = computed<Record<string, string>>(() => {
  const { page: _, ...rest } = route.query
  void _

  return Object.fromEntries(
    Object.entries(rest)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, v as string]),
  )
})

const searchInput = ref(((route.query.search as string) ?? '').replace(/%/g, ''))
watch(
  () => route.query.search,
  (val) => {
    searchInput.value = ((val as string) ?? '').replace(/%/g, '')
  },
)

let searchDebounce: ReturnType<typeof setTimeout>
function scheduleSearch(params: Record<string, string>) {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    router.push({ query: { page: '1', ...params } })
  }, 300)
}
function onSearchInput() {
  scheduleSearch(searchInput.value ? { search: `%${searchInput.value}%` } : {})
}

const pages = computed<number[]>(() => {
  const last = store.itemsMeta?.last_page ?? 1
  const p = page.value
  const start = Math.min(Math.max(1, p - 1), Math.max(1, last - 2))
  const end = Math.min(start + 2, last)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

watch([page, search], ([p, s]) => store.list({ page: String(p), ...s }), { immediate: true })

onMounted(() => {
  if (!hasSpecFields) store.fetchSchema()
})

function goToPage(p: number) {
  router.push({ query: { ...route.query, page: String(p) } })
}

function navigateToItem(item: ResourceListItem<Record<string, unknown>>) {
  router.push({ name: `${segment.value}-detail`, params: { id: String(item.id) } })
}

function createNew() {
  router.push({ name: `${segment.value}-create` })
}

const canCreate = computed(() => hasPermission(store.schemaPermissions, 'create'))

const dropdownComponent = computed(() => getConfig().layout?.dropdown ?? PrinceDropdown)
const listActions = computed(() =>
  (route.meta.spec?.actions?.list ?? []).filter((a) => hasActionPermission(a.permission)),
)

const customComponent = computed(() => route.meta.spec?.components?.list)
const searchComponent = computed(() => route.meta.spec?.components?.search)

const items = computed(() => store.items as ResourceListItem<Record<string, unknown>>[])

const { labelMap } = useResourceLabelMap(
  () => items.value,
  () => route.meta.spec?.fields,
)

const enrichedFields = computed(() => {
  const specFields = route.meta.spec?.fields
  if (!specFields) return specFields
  const result: Record<string, ResourceFieldDef> = {}
  for (const [name, def] of Object.entries(specFields)) {
    if (isResourceRef(resolveFieldType(def.type)) && !def.list?.formatter) {
      const map = labelMap.value
      result[name] = {
        ...def,
        list: {
          ...def.list,
          formatter: (id) => (id != null ? (map[name]?.[String(id)] ?? String(id)) : '—'),
        },
      }
    } else {
      result[name] = def
    }
  }
  return result
})

const customProps = computed<ResourceListPageProps>(() => ({
  items: items.value,
  schema: schema.value,
  labels: labels.value,
  fields: enrichedFields.value,
  resource: route.meta.spec?.name,
  loading: store.loading.list,
  error: store.error,
  itemsMeta: store.itemsMeta,
  page: page.value,
  search: search.value,
  navigateToItem,
  goToPage,
  createNew,
  onSearch: scheduleSearch,
  canCreate: canCreate.value,
}))
</script>

<style>
.vue-resource.prince-search-input {
  padding: 5px 10px;
  border: 1px solid var(--prince-color-border, #dee2e6);
  border-radius: 4px;
  font-size: var(--prince-font-size-sm, 0.8125rem);
  font-family: var(--prince-font-family, system-ui, -apple-system, sans-serif);
  color: var(--prince-color-text, #212529);
  background: var(--prince-color-bg, #fff);
  width: 100%;
  margin-bottom: 16px;
  transition:
    border-color var(--prince-transition, 150ms ease),
    box-shadow var(--prince-transition, 150ms ease);
}

.vue-resource.prince-search-input:focus {
  outline: none;
  border-color: var(--prince-color-border-focus, #4a90d9);
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
}

.vue-resource.prince-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.vue-resource.prince-pagination .prince-btn {
  padding: 4px 8px;
  min-width: 2rem;
  font-size: var(--prince-font-size-sm, 0.8125rem);
}

.vue-resource.prince-list-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
