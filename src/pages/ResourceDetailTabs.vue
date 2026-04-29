<template>
  <component
    :is="tabsWrapper"
    v-if="visibleTabs.length > 0"
    :labels="visibleTabs.map((t) => t.label)"
    :model-value="activeTab"
    @update:model-value="onTabChange"
  >
    <template #default>
      <div v-if="visibleTabs[activeTab]" class="vue-resource resource-tab-content">
        <component
          :is="visibleTabs[activeTab].component"
          :key="activeTab"
          :resource-id="resourceId"
          :foreign-key="visibleTabs[activeTab].foreignKey"
          :resource="resource"
        />
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResourceId } from '../api'
import type { ResolvedTab } from './use-resource-tabs'
import PrinceTabs from '../ui/PrinceTabs.vue'
import { getConfig } from '../config'
import { hasActionPermission } from '../resource'

const props = defineProps<{
  tabs: ResolvedTab[]
  resourceId: ResourceId | null | undefined
  resource: Record<string, unknown>
}>()

const route = useRoute()
const router = useRouter()

const tabsWrapper = computed(() => getConfig().layout?.tabs ?? PrinceTabs)

const visibleTabs = computed(() => props.tabs.filter((t) => hasActionPermission(t.permission)))

function slugify(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-')
}

const activeTab = computed(() => {
  const slug = route.query.tab as string | undefined
  if (!slug) return 0
  const i = visibleTabs.value.findIndex((t) => slugify(t.label) === slug)
  return i >= 0 ? i : 0
})

function onTabChange(i: number) {
  router.replace({ query: { ...route.query, tab: slugify(visibleTabs.value[i].label) } })
}
</script>
