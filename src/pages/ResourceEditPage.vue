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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../resource-controller'
import type { ResourceMetadata, ResourceSchemaField } from '../api'
import type { ResourceEditPageProps } from '../page-props'
import ResourceFormView from '../ui/ResourceFormView.vue'
import { useResourceSchema, useResourceLabels } from './use-resource-meta'

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

const itemTitle = computed(() => {
  const titleFn = route.meta.spec?.title
  return titleFn && item.value ? titleFn(item.value) : undefined
})

async function submit(data: Record<string, unknown>) {
  const ok = await store.update(id, data)
  if (ok) router.push({ name: `${segment.value}-detail`, params: { id } })
}

function cancel() {
  router.push({ name: `${segment.value}-detail`, params: { id } })
}

onMounted(async () => {
  const specFields = route.meta.spec?.fields
  if (!specFields || Object.keys(specFields).length === 0) store.fetchSchema()
  const result = await store.get(id)
  if (result) {
    item.value = result.data as Record<string, unknown>
    itemMeta.value = result.meta
  }
})

const customComponent = computed(() => route.meta.spec?.components?.edit)

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
