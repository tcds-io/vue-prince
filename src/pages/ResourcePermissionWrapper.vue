<template>
  <slot v-if="allowed" />
  <ResourcePermissionDeniedPage v-else-if="!schemaLoading" />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { createResourceController } from '../resource-controller'
import { hasPermission } from '../resource'
import ResourcePermissionDeniedPage from './ResourcePermissionDeniedPage.vue'

const props = defineProps<{ action?: string }>()

const route = useRoute()
const spec = route.meta.spec
const store = spec ? createResourceController(spec).useStore() : null

onMounted(() => {
  store?.fetchSchema()
})

// True only while the very first schema fetch is in flight
const schemaLoading = computed(() => !!store && !store.schemaLoaded && store.loading)

const allowed = computed(() => {
  if (!props.action || !store) return true
  // Optimistic while schema is still loading — show page, hide on denial once loaded
  if (!store.schemaLoaded) return true
  return hasPermission(store.schemaPermissions, props.action)
})
</script>
