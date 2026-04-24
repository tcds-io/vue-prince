<template>
  <div class="vue-resource resource-tabs-card prince-card prince-card--default">
    <div class="vue-resource resource-tabs">
      <button
        v-for="(label, i) in labels"
        :key="i"
        class="vue-resource resource-tab-btn"
        :class="{ active: activeTab === i }"
        @click="setTab(i)"
      >
        {{ label }}
      </button>
    </div>
    <slot :active-tab="activeTab" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ labels: string[]; modelValue?: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const internalTab = ref(0)
const activeTab = computed(() => props.modelValue ?? internalTab.value)

function setTab(i: number) {
  internalTab.value = i
  emit('update:modelValue', i)
}
</script>

<style>
.vue-resource.resource-tabs-card {
  margin-top: 16px;
}

.vue-resource.resource-tabs {
  display: flex;
  gap: 4px;
  padding: 6px 24px 0;
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
  transition:
    color var(--prince-transition, 150ms ease),
    border-color var(--prince-transition, 150ms ease);
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
