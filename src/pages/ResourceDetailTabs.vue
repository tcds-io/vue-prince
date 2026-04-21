<template>
  <component :is="tabsWrapper" v-if="tabs.length > 0" :labels="tabs.map((t) => t.label)">
    <template #default="{ activeTab }">
      <div
        v-for="(tab, i) in tabs"
        v-show="activeTab === i"
        :key="i"
        class="vue-resource resource-tab-content"
      >
        <component
          :is="tab.component"
          :parent-id="parentId"
          :foreign-key="tab.foreignKey"
          :resource="resource"
        />
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ResourceId } from '../api'
import type { ResolvedTab } from './use-resource-tabs'
import PrinceTabs from '../ui/PrinceTabs.vue'
import { getConfig } from '../config'

defineProps<{
  tabs: ResolvedTab[]
  parentId: ResourceId | null | undefined
  resource: Record<string, unknown>
}>()

const tabsWrapper = computed(() => getConfig().layout?.tabs ?? PrinceTabs)
</script>
