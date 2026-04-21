<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <ResourceFormView
    v-else
    :item="initialItem"
    :schema="schema"
    :labels="labels"
    :fields="route.meta.spec?.fields"
    :resource="route.meta.spec?.name"
    :loading="store.loading"
    :error="store.error"
    page="CREATE"
    @submit="submit"
    @cancel="cancel"
  />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResourceSchemaField } from '../api'
import type { ResourceCreatePageProps } from '../page-props'
import { resolveFieldType } from '../resource'
import ResourceFormView from '../ui/ResourceFormView.vue'
import { useResourceSchema, useResourceLabels } from './use-resource-meta'

const route = useRoute()
const router = useRouter()
const store = route.meta.useStore!()

const segment = computed(() => route.meta.spec?.endpoints.route.split('/').pop())

const initialItem = computed(() => {
  const fields = route.meta.spec?.fields
  const entries = Object.entries(route.query).filter(([, v]) => v != null)
  if (entries.length === 0) return null
  return Object.fromEntries(
    entries.map(([k, v]) => {
      const fieldType = fields?.[k] ? resolveFieldType(fields[k].type) : null
      const numeric = fieldType === 'integer' || fieldType === 'number'
      return [k, numeric ? Number(v) : v]
    }),
  )
})

const schema = useResourceSchema(() => store.schemaFields as ResourceSchemaField[])
const labels = useResourceLabels()

onMounted(() => {
  const specFields = route.meta.spec?.fields
  if (!specFields || Object.keys(specFields).length === 0) store.fetchSchema()
})

async function submit(data: Record<string, unknown>) {
  const created = await store.create(data)
  if (created)
    router.push({
      name: `${segment.value}-detail`,
      params: { id: String((created as { id: unknown }).id) },
    })
}

function cancel() {
  router.push({ name: `${segment.value}-list` })
}

const customComponent = computed(() => route.meta.spec?.components?.create)

const customProps = computed<ResourceCreatePageProps>(() => ({
  schema: schema.value,
  labels: labels.value,
  resource: route.meta.spec?.name,
  loading: store.loading,
  error: store.error,
  submit,
  cancel,
}))
</script>
