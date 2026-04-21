<template>
  <ResourceListView
    :items="items"
    :schema="schema"
    :labels="{}"
    :fields="spec.fields"
    :resource="spec.name"
    :loading="loading"
    :error="error"
    :on-row-click="(row) => navigate(row as { id: string | number })"
  />
  <div v-if="listMeta && listMeta.last_page > 1" class="vue-resource prince-pagination">
    <PrinceButton type="Pagination" label="|←" :disabled="page <= 1" @click="goToPage(1)" />
    <PrinceButton type="Pagination" label="←" :disabled="page <= 1" @click="goToPage(page - 1)" />
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
      :disabled="page >= listMeta.last_page"
      @click="goToPage(page + 1)"
    />
    <PrinceButton
      type="Pagination"
      label="→|"
      :disabled="page >= listMeta.last_page"
      @click="goToPage(listMeta.last_page)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ResourceListItem, ResourceListMetadata, ResourceSchemaField } from '../api'
import type { ResourceSpec } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'
import { createResourceApi } from '../resource-api'
import ResourceListView from '../ui/ResourceListView.vue'
import PrinceButton from '../ui/PrinceButton.vue'
import type { TabComponentProps } from './use-resource-tabs'

const props = defineProps<TabComponentProps & { spec: ResourceSpec }>()

const router = useRouter()

const items = ref<ResourceListItem<Record<string, unknown>>[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const listMeta = ref<ResourceListMetadata | null>(null)

const schema = computed<ResourceSchemaField[]>(() => {
  if (!props.spec.fields) return []
  return Object.entries(props.spec.fields)
    .filter(([name, def]) => def.list?.show !== false && name !== props.foreignKey)
    .map(([name, def]) => ({
      name,
      type: isResourceRef(resolveFieldType(def.type)) ? 'integer' : (def.type as string),
    }))
})

const pages = computed(() => {
  const last = listMeta.value?.last_page ?? 1
  const p = page.value
  const start = Math.min(Math.max(1, p - 1), Math.max(1, last - 2))
  const end = Math.min(start + 2, last)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

async function fetchItems(parentId: string | number, pg: number) {
  loading.value = true
  error.value = null
  try {
    const res = await createResourceApi(props.spec).list({
      [props.foreignKey]: String(parentId),
      page: String(pg),
    })
    items.value = res.data as ResourceListItem<Record<string, unknown>>[]
    listMeta.value = res.meta as ResourceListMetadata
    page.value = pg
  } catch (err) {
    error.value = String(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.parentId,
  (id) => {
    if (id != null) {
      page.value = 1
      fetchItems(id, 1)
    }
  },
  { immediate: true },
)

function goToPage(p: number) {
  if (props.parentId != null) fetchItems(props.parentId, p)
}

function navigate(row: { id: string | number }) {
  const segment = props.spec.endpoints.route.split('/').pop()
  router.push({ name: `${segment}-detail`, params: { id: row.id } })
}
</script>
