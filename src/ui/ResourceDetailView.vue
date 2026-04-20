<template>
  <PrinceCard :title="headerTitle">
    <div v-if="loading">Loading…</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="item" class="vue-resource prince-detail-body">
      <component
        :is="resolveFieldComponent(fields?.[field.name]?.type ?? field.type, 'display')"
        v-for="field in schema"
        :key="field.name"
        :name="field.name"
        :type="resolveDisplayType(fields?.[field.name]?.type, field.type)"
        :resource="resource ?? 'field'"
        :value="fieldDisplayValue(field.name)"
        :label="labels?.[field.name] ?? toFieldLabel(field.name)"
        page="VIEW"
        :options="fields?.[field.name]?.values ?? field.values ?? []"
        v-bind="getResourceFieldProps(fields?.[field.name]?.type)"
      />
    </div>

    <template v-if="props.tabs && props.tabs.length > 0">
      <div class="vue-resource resource-tabs-frame">
        <div class="vue-resource resource-tabs">
          <button
            v-for="(tab, i) in props.tabs"
            :key="i"
            class="vue-resource resource-tab-btn"
            :class="{ active: activeTab === i }"
            @click="activeTab = i"
          >
            {{ tab.label }}
          </button>
        </div>
        <div v-for="(tab, i) in props.tabs" v-show="activeTab === i" :key="i" class="vue-resource resource-tab-content">
          <ResourceListView
            :items="tab.items"
            :schema="tab.schema"
            :fields="tab.spec.fields"
            :resource="tab.spec.name"
            :loading="tab.loading"
            :error="tab.error"
          />
        </div>
      </div>
    </template>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </PrinceCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ResourceSchemaField } from '../api'
import type { ResourceFieldDef } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'
import {
  resolveFieldComponent,
  normalizeFieldType,
  toFieldLabel,
  buildResourceFieldProps,
} from './fields'
import PrinceCard from './PrinceCard.vue'
import ResourceListView from './ResourceListView.vue'
import type { ResolvedTab } from '../pages/useResourceMeta'

function resolveDisplayType(
  specType: ResourceFieldDef['type'] | undefined,
  apiType: string,
): string {
  const resolved = specType != null ? resolveFieldType(specType) : specType
  if (isResourceRef(resolved)) return 'integer'
  return normalizeFieldType((resolved as string | undefined) ?? apiType)
}

function getResourceFieldProps(specType: ResourceFieldDef['type'] | undefined) {
  const resolved = specType != null ? resolveFieldType(specType) : specType
  const refSpec = isResourceRef(resolved) ? resolved : undefined
  return refSpec ? buildResourceFieldProps(refSpec) : {}
}

function fieldDisplayValue(name: string): unknown {
  const raw = props.item?.[name]
  const def = props.fields?.[name]
  if (!def || isResourceRef(resolveFieldType(def.type))) return raw
  return def.form?.formatter?.(raw) ?? raw
}

const props = defineProps<{
  item: Record<string, unknown> | null
  schema: ResourceSchemaField[]
  labels?: Record<string, string>
  fields?: Record<string, ResourceFieldDef>
  resource?: string
  loading: boolean
  error: string | null
  itemTitle?: string
  tabs?: ResolvedTab[]
}>()

const activeTab = ref(0)

const headerTitle = computed(() => {
  if (props.itemTitle) return props.itemTitle
  const name = props.resource ?? ''
  const label = name.charAt(0).toUpperCase() + name.slice(1)
  return props.item?.id != null ? `${label} ${props.item.id}` : label
})
</script>

<style>
.vue-resource.prince-detail-body {
  display: flex;
  flex-direction: column;
}

.vue-resource.resource-tabs-frame {
  margin-top: 16px;
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  border-top: 1px solid var(--prince-color-border, #dee2e6);
  overflow: hidden;
}

.vue-resource.resource-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid var(--prince-color-border, #dee2e6);
  background: var(--prince-color-surface, #f8f9fa);
}

.vue-resource.resource-tab-btn {
  padding: 10px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  cursor: pointer;
  font-family: var(--prince-font-family, system-ui, -apple-system, sans-serif);
  font-size: var(--prince-font-size-sm, 0.8125rem);
  font-weight: 500;
  color: var(--prince-color-text-muted, #6c757d);
  transition: color var(--prince-transition, 150ms ease), border-color var(--prince-transition, 150ms ease);
}

.vue-resource.resource-tab-btn:hover {
  color: var(--prince-color-text, #212529);
}

.vue-resource.resource-tab-btn.active {
  color: var(--prince-color-text, #212529);
  font-weight: 600;
  border-bottom-color: var(--prince-color-text, #212529);
}

.vue-resource.resource-tab-content {
  padding: 24px;
}
</style>
