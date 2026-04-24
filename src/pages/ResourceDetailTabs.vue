<template>
  <component
    :is="tabsWrapper"
    v-if="tabs.length > 0"
    :labels="tabs.map((t) => t.label)"
    :model-value="activeTab"
    @update:model-value="onTabChange"
  >
    <template #default>
      <div v-if="tabs[activeTab]" class="vue-resource resource-tab-content">
        <component
          :is="tabs[activeTab].component"
          :key="activeTab"
          :resource-id="resourceId"
          :foreign-key="tabs[activeTab].foreignKey"
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

const props = defineProps<{
  tabs: ResolvedTab[]
  resourceId: ResourceId | null | undefined
  resource: Record<string, unknown>
}>()

const route = useRoute()
const router = useRouter()

const tabsWrapper = computed(() => getConfig().layout?.tabs ?? PrinceTabs)

function slugify(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-')
}

const activeTab = computed(() => {
  const slug = route.query.tab as string | undefined
  if (!slug) return 0
  const i = props.tabs.findIndex((t) => slugify(t.label) === slug)
  return i >= 0 ? i : 0
})

function onTabChange(i: number) {
  router.replace({ query: { ...route.query, tab: slugify(props.tabs[i].label) } })
}
</script>
