<template>
  <slot v-if="allowed" />
  <ResourcePermissionDeniedPage v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getConfig } from '../config'
import ResourcePermissionDeniedPage from './ResourcePermissionDeniedPage.vue'

const props = defineProps<{ permission?: string }>()

const allowed = computed(() => {
  if (!props.permission) return true
  const perms = getConfig().userPermissions?.()
  return perms ? perms.includes(props.permission) : true
})
</script>
