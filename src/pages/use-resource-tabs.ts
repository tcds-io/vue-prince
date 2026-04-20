import { ref, watch } from 'vue'
import type {
  ResourceId,
  ResourceListItem,
  ResourceListMetadata,
  ResourceSchemaField,
} from '../api'
import type { ResourceSpec } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'
import { createResourceApi } from '../resource-api'

function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (/(s|sh|ch|x|z)$/i.test(word)) return word + 'es'
  return word + 's'
}

function resolveTabSpec(tab: { resource: () => ResourceSpec }): ResourceSpec {
  return tab.resource()
}

function specToSchema(spec: ResourceSpec): ResourceSchemaField[] {
  if (!spec.fields) return []
  return Object.entries(spec.fields)
    .filter(([, def]) => def.list?.show !== false)
    .map(([name, def]) => ({
      name,
      type: isResourceRef(resolveFieldType(def.type)) ? 'integer' : (def.type as string),
    }))
}

export type ResolvedTab = {
  label: string
  spec: ResourceSpec
  schema: ResourceSchemaField[]
  items: ResourceListItem<Record<string, unknown>>[]
  loading: boolean
  error: string | null
  page: number
  listMeta: ResourceListMetadata | null
}

/**
 * Loads related resource lists for each tab declared on a parent spec.
 * Fetches using `foreignKey` (defaults to `${parentSpec.name}_id`) as a query param.
 * `tab.resource` may be a function to break circular spec references.
 */
export function useResourceTabs(
  parentSpec: ResourceSpec,
  getParentId: () => ResourceId | null | undefined,
) {
  const tabs = ref<ResolvedTab[]>(
    (parentSpec.tabs ?? []).map((tab) => {
      const spec = resolveTabSpec(tab)
      const foreignKey = tab.foreignKey ?? `${parentSpec.name}_id`
      return {
        label: tab.label ?? pluralize(spec.name),
        spec,
        schema: specToSchema(spec).filter((f) => f.name !== foreignKey),
        items: [],
        loading: false,
        error: null,
        page: 1,
        listMeta: null,
      }
    }),
  )

  const currentParentId = ref<ResourceId | null | undefined>(null)

  async function fetchTabItems(
    tab: NonNullable<ResourceSpec['tabs']>[number],
    i: number,
    parentId: ResourceId,
    page: number,
  ) {
    const spec = resolveTabSpec(tab)
    const foreignKey = tab.foreignKey ?? `${parentSpec.name}_id`
    tabs.value[i] = { ...tabs.value[i], loading: true, error: null }
    try {
      const res = await createResourceApi(spec).list({
        [foreignKey]: String(parentId),
        page: String(page),
      })
      tabs.value[i] = {
        ...tabs.value[i],
        items: res.data as ResourceListItem<Record<string, unknown>>[],
        loading: false,
        page,
        listMeta: res.meta as ResourceListMetadata,
      }
    } catch (err) {
      tabs.value[i] = { ...tabs.value[i], loading: false, error: String(err) }
    }
  }

  watch(
    () => getParentId(),
    async (parentId) => {
      currentParentId.value = parentId
      if (parentId == null) return
      await Promise.allSettled(
        (parentSpec.tabs ?? []).map((tab, i) => fetchTabItems(tab, i, parentId, 1)),
      )
    },
    { immediate: true },
  )

  function goToPage(tabIndex: number, page: number) {
    const tab = parentSpec.tabs?.[tabIndex]
    if (!tab || currentParentId.value == null) return
    fetchTabItems(tab, tabIndex, currentParentId.value, page)
  }

  return { tabs, goToPage }
}
