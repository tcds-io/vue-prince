<template>
  <component :is="tabsWrapper" v-if="tabs.length > 0" :labels="tabs.map((t) => t.label)">
    <template #default="{ activeTab }">
      <div
        v-for="(tab, i) in tabs"
        v-show="activeTab === i"
        :key="i"
        class="vue-resource resource-tab-content"
      >
        <ResourceListView
          :items="tab.items"
          :schema="tab.schema"
          :labels="{}"
          :fields="tab.spec.fields"
          :resource="tab.spec.name"
          :loading="tab.loading"
          :error="tab.error"
          :on-row-click="(item) => navigateToTabItem(tab.spec, item)"
        />
        <div
          v-if="tab.listMeta && tab.listMeta.last_page > 1"
          class="vue-resource prince-pagination"
        >
          <PrinceButton
            type="Pagination"
            label="|←"
            :disabled="tab.page <= 1"
            @click="goToPage(i, 1)"
          />
          <PrinceButton
            type="Pagination"
            label="←"
            :disabled="tab.page <= 1"
            @click="goToPage(i, tab.page - 1)"
          />
          <PrinceButton
            v-for="p in tabPages(tab)"
            :key="p"
            type="Pagination"
            :label="String(p)"
            :variant="p === tab.page ? 'primary' : undefined"
            @click="goToPage(i, p)"
          />
          <PrinceButton
            type="Pagination"
            label="→"
            :disabled="tab.page >= tab.listMeta.last_page"
            @click="goToPage(i, tab.page + 1)"
          />
          <PrinceButton
            type="Pagination"
            label="→|"
            :disabled="tab.page >= tab.listMeta.last_page"
            @click="goToPage(i, tab.listMeta.last_page)"
          />
        </div>
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ResolvedTab } from './useResourceTabs'
import ResourceListView from '../ui/ResourceListView.vue'
import PrinceTabs from '../ui/PrinceTabs.vue'
import PrinceButton from '../ui/PrinceButton.vue'
import { getConfig } from '../config'

defineProps<{
  tabs: ResolvedTab[]
  goToPage: (tabIndex: number, page: number) => void
}>()

const router = useRouter()

const tabsWrapper = computed(() => getConfig().layout?.tabs ?? PrinceTabs)

function tabPages(tab: ResolvedTab): number[] {
  const last = tab.listMeta?.last_page ?? 1
  const p = tab.page
  const start = Math.min(Math.max(1, p - 1), Math.max(1, last - 2))
  const end = Math.min(start + 2, last)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function navigateToTabItem(spec: ResolvedTab['spec'], item: { id: string | number }) {
  const segment = spec.endpoints.route.split('/').pop()
  router.push({ name: `${segment}-detail`, params: { id: item.id } })
}
</script>
