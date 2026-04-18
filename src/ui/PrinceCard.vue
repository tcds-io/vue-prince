<template>
  <!-- Custom card: receives title + header/body/footer slots, owns everything -->
  <component :is="layout.card" v-if="layout.card" :title="title">
    <template #header>
      <slot name="header" />
    </template>
    <slot />
    <template #footer>
      <slot name="footer" />
    </template>
  </component>

  <!-- Default card -->
  <div v-else class="prince-card prince-card--default">
    <div v-if="$slots.header || title" class="vue-resource prince-card__header">
      <span v-if="title">{{ title }}</span>
      <slot name="header" />
    </div>
    <div class="vue-resource prince-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="vue-resource prince-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getConfig } from '../config'

defineProps<{ title?: string }>()

const layout = getConfig().layout ?? {}
</script>

<style>
/* Structural skeleton */
.prince-card {
  display: flex;
  flex-direction: column;
}

/* Default visual skin */
.prince-card--default {
  background: var(--prince-color-bg, #ffffff);
  border: 1px solid var(--prince-color-border, #dee2e6);
  border-radius: var(--prince-radius-lg, 8px);
  box-shadow: var(--prince-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.08));
  overflow: hidden;
}

/* Default sections */
.vue-resource.prince-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--prince-color-border, #dee2e6);
  background: var(--prince-color-surface, #f8f9fa);
  font-family: var(--prince-font-family, system-ui, -apple-system, sans-serif);
  color: var(--prince-color-text, #212529);
}

.vue-resource.prince-card__header > span:first-child {
  font-size: var(--prince-font-size-lg, 1rem);
  font-weight: 600;
}

.vue-resource.prince-card__body {
  padding: 24px;
  flex: 1;
  font-family: var(--prince-font-family, system-ui, -apple-system, sans-serif);
  color: var(--prince-color-text, #212529);
}

.vue-resource.prince-card__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 24px;
  border-top: 1px solid var(--prince-color-border, #dee2e6);
  background: var(--prince-color-surface, #f8f9fa);
  font-family: var(--prince-font-family, system-ui, -apple-system, sans-serif);
  color: var(--prince-color-text, #212529);
}
</style>
