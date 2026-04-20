<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <ResourceDetailView
    v-else
    :item="item"
    :schema="schema"
    :labels="labels"
    :fields="route.meta.spec?.fields"
    :resource="route.meta.spec?.name"
    :loading="store.loading"
    :error="store.error"
    :item-title="itemTitle"
  >
    <template #footer>
      <PrinceButton type="Back" @click="back" />
      <PrinceButton type="Edit" @click="edit" />
      <PrinceButton type="Delete" @click="remove" />
    </template>
  </ResourceDetailView>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResourceSchemaField } from '../api'
import type { ResourceViewPageProps } from '../page-props'
import ResourceDetailView from '../ui/ResourceDetailView.vue'
import PrinceButton from '../ui/PrinceButton.vue'
import { useResourceSchema, useResourceLabels } from './useResourceMeta'

const route = useRoute()
const router = useRouter()
const store = route.meta.useStore!()

const id = route.params.id as string
const segment = computed(() => route.meta.spec?.endpoints.route.split('/').pop())

const schema = useResourceSchema(() =>
  store.itemMeta?.schema?.length
    ? store.itemMeta.schema
    : (store.schemaFields as ResourceSchemaField[]),
)
const labels = useResourceLabels()

const item = computed(() => store.item as Record<string, unknown> | null)

const itemTitle = computed(() => {
  const titleFn = route.meta.spec?.title
  return titleFn && store.item ? titleFn(store.item as Record<string, unknown>) : undefined
})

onMounted(() => {
  const specFields = route.meta.spec?.fields
  if (!specFields || Object.keys(specFields).length === 0) store.fetchSchema()
  store.fetchItem(id)
})

function back() {
  router.push({ name: `${segment.value}-list` })
}

function edit() {
  router.push({ name: `${segment.value}-edit`, params: { id } })
}

async function remove() {
  await store.remove(id)
  router.push({ name: `${segment.value}-list` })
}

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
  remove,
}))
</script>
