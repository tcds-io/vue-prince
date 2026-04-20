<template>
  <div :class="`vue-resource field field--resource ${resource}-${name} ${resource}--${name}`">
    <label>{{ label }}</label>

    <template v-if="!editable">
      <span v-if="value == null" class="field-value">—</span>
      <span v-else class="field-value">
        {{ inputText || value }}
        <a
          :href="router.resolve(`${props.refSpec.endpoints.route}/${value}`).href"
          target="_blank"
          rel="noopener noreferrer"
          class="open-link"
          >↗</a
        >
      </span>
    </template>

    <div v-else>
      <input
        v-model="inputText"
        type="text"
        autocomplete="off"
        @input="inputText.length >= MIN_SEARCH_LENGTH ? search({ search: inputText }) : clear()"
        @blur="onBlur"
      />
      <ul v-if="open && options.length > 0">
        <li
          v-for="opt in options"
          :key="opt.id"
          @mousedown.prevent="selectOption(opt, (id) => (value = id))"
        >
          {{ opt.label }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ResourceFieldProps } from '../../field-props'
import { useAutocomplete, useFieldEditable } from '../../field-props'

const value = defineModel<number | null>('value')
const props = defineProps<ResourceFieldProps>()

const router = useRouter()
const editable = useFieldEditable(props)

const MIN_SEARCH_LENGTH = 2

const { options, inputText, open, search, clear, selectOption, onBlur, initLabel } =
  useAutocomplete(props)

onMounted(async () => {
  if (value.value != null) await initLabel(value.value)
})
</script>

<style>
@import './field-base.css';

/* Editable wrapper — position anchor for the dropdown */
.vue-resource.field--resource > div {
  position: relative;
}

/* Dropdown list */
.vue-resource.field--resource ul {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  background: var(--prince-color-bg, #ffffff);
  border: 1px solid var(--prince-color-border, #dee2e6);
  border-radius: var(--prince-radius-sm, 4px);
  box-shadow: var(--prince-shadow-dropdown, 0 4px 12px rgba(0, 0, 0, 0.12));
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.vue-resource.field--resource ul li {
  padding: 8px 12px;
  font-size: var(--prince-font-size-base, 0.875rem);
  color: var(--prince-color-text, #212529);
  cursor: pointer;
}

.vue-resource.field--resource ul li:hover {
  background: var(--prince-color-surface, #f8f9fa);
}

/* Open-in-new-tab link next to the displayed label */
.vue-resource.field--resource .open-link {
  margin-left: 4px;
  font-size: 0.75em;
  color: var(--prince-color-text-muted, #6c757d);
  text-decoration: none;
  opacity: 0.6;
}

.vue-resource.field--resource .open-link:hover {
  opacity: 1;
  color: var(--prince-color-primary, #2563eb);
}
</style>
