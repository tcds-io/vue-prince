<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <template v-else>
    <ResourceDetailView
      :item="item"
      :schema="schema"
      :labels="labels"
      :fields="route.meta.spec?.fields"
      :resource="route.meta.spec?.name"
      :loading="store.loading.get"
      :error="store.error"
      :item-title="itemTitle"
    >
      <template v-if="resourceActions.length" #header>
        <component :is="dropdownComponent" :actions="resourceActions" />
      </template>
      <template #footer>
        <PrinceButton type="Back" @click="back" />
        <PrinceButton v-if="canEdit" type="Edit" @click="edit" />
        <PrinceButton v-if="canDelete" type="Delete" @click="confirmDelete" />
      </template>
    </ResourceDetailView>

    <ResourceDetailTabs v-if="item" :tabs="tabs" :resource-id="id" :resource="item" />
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../resource-controller'
import type { ResourceMetadata, ResourceSchemaField } from '../api'
import type { ResourceViewPageProps } from '../page-props'
import ResourceDetailView from '../ui/ResourceDetailView.vue'
import ResourceDetailTabs from './ResourceDetailTabs.vue'
import PrinceButton from '../ui/PrinceButton.vue'
import { hasPermission, hasActionPermission } from '../resource'
import { getConfig } from '../config'
import { useResourceSchema, useResourceLabels } from './use-resource-meta'
import { useResourceTabs } from './use-resource-tabs'
import PrinceDropdown from '../ui/PrinceDropdown.vue'

const route = useRoute()
const router = useRouter()
const store = createResourceController(route.meta.spec!).store()

const id = route.params.id as string
const segment = computed(() => route.meta.spec?.route.split('/').pop())

const item = ref<Record<string, unknown> | null>(null)
const itemMeta = ref<ResourceMetadata | null>(null)

const schema = useResourceSchema(() =>
  itemMeta.value?.schema?.length
    ? itemMeta.value.schema
    : (store.schemaFields as ResourceSchemaField[]),
)
const labels = useResourceLabels()

const { tabs } = route.meta.spec ? useResourceTabs(route.meta.spec) : { tabs: [] }

const itemTitle = computed(() => {
  const titleFn = route.meta.spec?.title
  return titleFn && item.value ? titleFn(item.value) : undefined
})

onMounted(async () => {
  const specFields = route.meta.spec?.fields
  if (!specFields || Object.keys(specFields).length === 0) store.fetchSchema()
  const result = await store.get(id)
  if (result) {
    item.value = result.data as Record<string, unknown>
    itemMeta.value = result.meta
  }
})

function back() {
  router.push({ name: `${segment.value}-list` })
}

function edit() {
  router.push({ name: `${segment.value}-edit`, params: { id } })
}

function confirmDelete() {
  router.push({ name: `${segment.value}-delete-confirm`, params: { id } })
}

const canEdit = computed(() => hasPermission(store.schemaPermissions, 'update'))
const canDelete = computed(() => hasPermission(store.schemaPermissions, 'delete'))

const dropdownComponent = computed(() => getConfig().layout?.dropdown ?? PrinceDropdown)
const resourceActions = computed(() => {
  const actions = route.meta.spec?.actions?.resource ?? []
  const currentItem = item.value ?? {}
  return actions
    .filter((a) => hasActionPermission(a.permission))
    .map((a) => ({
      label: typeof a.label === 'function' ? a.label(currentItem) : a.label,
      onClick: () => a.onClick(currentItem),
    }))
})

const customComponent = computed(() => route.meta.spec?.components?.view)

const customProps = computed<ResourceViewPageProps>(() => ({
  item: item.value,
  schema: schema.value,
  labels: labels.value,
  resource: route.meta.spec?.name,
  loading: store.loading.get,
  error: store.error,
  itemTitle: itemTitle.value,
  back,
  edit,
  confirmDelete,
  canEdit: canEdit.value,
  canDelete: canDelete.value,
  tabs,
}))
</script>
