<template>
  <div v-if="actions.length > 0" ref="container" class="vue-resource prince-dropdown">
    <button class="vue-resource prince-dropdown-trigger" @click.stop="open = !open">⋮</button>
    <div v-if="open" class="vue-resource prince-dropdown-menu">
      <button
        v-for="(action, i) in actions"
        :key="i"
        class="vue-resource prince-dropdown-item"
        @click="run(action)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { LayoutDropdownProps } from '../config'

defineProps<LayoutDropdownProps>()

const open = ref(false)
const container = ref<HTMLElement>()

function run(action: { label: string; onClick: () => void }) {
  open.value = false
  action.onClick()
}

function handleOutsideClick(e: MouseEvent) {
  if (!container.value?.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>

<style>
.vue-resource.prince-dropdown {
  position: relative;
  display: inline-block;
}

.vue-resource.prince-dropdown-trigger {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--prince-color-text-muted, #6c757d);
  border-radius: var(--prince-border-radius, 4px);
  transition: background-color var(--prince-transition, 150ms ease);
}

.vue-resource.prince-dropdown-trigger:hover {
  background: var(--prince-color-surface, #f8f9fa);
  color: var(--prince-color-text, #212529);
}

.vue-resource.prince-dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  min-width: 160px;
  background: var(--prince-color-bg, #fff);
  border: 1px solid var(--prince-color-border, #dee2e6);
  border-radius: var(--prince-border-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  padding: 4px 0;
}

.vue-resource.prince-dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: var(--prince-font-size-base, 0.875rem);
  color: var(--prince-color-text, #212529);
  transition: background-color var(--prince-transition, 150ms ease);
  white-space: nowrap;
}

.vue-resource.prince-dropdown-item:hover {
  background: var(--prince-color-surface, #f8f9fa);
}
</style>
