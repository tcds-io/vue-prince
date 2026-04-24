<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <template v-else>
    <ResourceDetailView
      :item="item"
      :schema="schema"
      :labels="labels"
      :fields="route.meta.spec?.fields"
      :resource="route.meta.spec?.name"
      :loading="store.loading"
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

    <ResourceDetailTabs :tabs="tabs" :resource-id="id" :resource="item ?? {}" />
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../resource-controller'
import type { ResourceSchemaField } from '../api'
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
const store = createResourceController(route.meta.spec!).useStore()

const id = route.params.id as string
const segment = computed(() => route.meta.spec?.endpoints.route.split('/').pop())

const schema = useResourceSchema(() =>
  store.itemMeta?.schema?.length
    ? store.itemMeta.schema
    : (store.schemaFields as ResourceSchemaField[]),
)
const labels = useResourceLabels()

const item = computed(() => store.item as Record<string, unknown> | null)

const { tabs } = route.meta.spec ? useResourceTabs(route.meta.spec) : { tabs: [] }

const itemTitle = computed(() => {
  const titleFn = route.meta.spec?.title
  return titleFn && store.item ? titleFn(store.item as Record<string, unknown>) : undefined
})

onMounted(() => {
  const specFields = route.meta.spec?.fields
  if (!specFields || Object.keys(specFields).length === 0) store.fetchSchema()
  store.get(id)
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

const canEdit = computed(() => !route.meta.spec || hasPermission(route.meta.spec, 'update'))
const canDelete = computed(() => !route.meta.spec || hasPermission(route.meta.spec, 'delete'))

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
  item: store.item as Record<string, unknown> | null,
  schema: schema.value,
  labels: labels.value,
  resource: route.meta.spec?.name,
  loading: store.loading,
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
