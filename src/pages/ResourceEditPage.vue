<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <ResourceFormView
    v-else
    :item="item"
    :schema="schema"
    :labels="labels"
    :fields="route.meta.spec?.fields"
    :resource="route.meta.spec?.name"
    :loading="store.loading"
    :error="store.error"
    :item-title="itemTitle"
    :validation-schema="route.meta.spec?.validationSchema"
    page="EDIT"
    @submit="submit"
    @cancel="cancel"
  />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../resource-controller'
import type { ResourceSchemaField } from '../api'
import type { ResourceEditPageProps } from '../page-props'
import ResourceFormView from '../ui/ResourceFormView.vue'
import { useResourceSchema, useResourceLabels } from './use-resource-meta'

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

const itemTitle = computed(() => {
  const titleFn = route.meta.spec?.title
  return titleFn && store.item ? titleFn(store.item as Record<string, unknown>) : undefined
})

async function submit(data: Record<string, unknown>) {
  const updated = await store.update(id, data)
  if (updated) router.push({ name: `${segment.value}-detail`, params: { id } })
}

function cancel() {
  router.push({ name: `${segment.value}-detail`, params: { id } })
}

onMounted(() => {
  const specFields = route.meta.spec?.fields
  if (!specFields || Object.keys(specFields).length === 0) store.fetchSchema()
  store.fetchItem(id)
})

const customComponent = computed(() => route.meta.spec?.components?.edit)

const item = computed(() => store.item as Record<string, unknown> | null)

const customProps = computed<ResourceEditPageProps>(() => ({
  item: item.value,
  schema: schema.value,
  labels: labels.value,
  resource: route.meta.spec?.name,
  loading: store.loading,
  error: store.error,
  itemTitle: itemTitle.value,
  submit,
  cancel,
}))
</script>
