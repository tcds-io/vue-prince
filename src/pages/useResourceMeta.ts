import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { ResourceId, ResourceListItem, ResourceSchemaField } from '../api'
import type { ResourceFieldDef, ResourceSpec } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'
import { createResourceApi } from '../resource-api'

function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (/(s|sh|ch|x|z)$/i.test(word)) return word + 'es'
  return word + 's'
}

export type ResolvedTab = {
  label: string
  spec: ResourceSpec
  schema: ResourceSchemaField[]
  items: ResourceListItem<Record<string, unknown>>[]
  loading: boolean
  error: string | null
}

// Module-level cache survives component remounts (navigation away and back).
// Keyed by refSpec.endpoints.api so two fields pointing at the same resource share entries.
const globalLabelCache = ref<Record<string, Record<string, string>>>({})
// Tracks IDs currently being fetched to prevent duplicate concurrent requests.
const inFlightIds = new Map<string, Set<string>>()

/** Resets the label cache. Intended for use in tests only. */
export function clearLabelCache() {
  globalLabelCache.value = {}
  inFlightIds.clear()
}

/**
 * Resolves the schema to render for a resource page.
 *
 * Priority:
 *   1. spec.fields keys → whitelist + ordering (API type used when available)
 *   2. Full API schema  → fallback when spec.fields is absent or empty
 *
 * For list views pass `previewOnly: true` to further filter to fields
 * marked with `preview: true` in the spec (when any are defined).
 */
export function useResourceSchema(
  apiSchema: () => ResourceSchemaField[],
  { previewOnly = false } = {},
) {
  const route = useRoute()

  return computed<ResourceSchemaField[]>(() => {
    const specFields = route.meta.spec?.fields
    const specKeys =
      specFields && Object.keys(specFields).length > 0 ? Object.keys(specFields) : null

    let result: ResourceSchemaField[] = specKeys
      ? specKeys.map(
          (name) =>
            apiSchema().find((f) => f.name === name) ??
            ({ name, type: specFields![name].type } as ResourceSchemaField),
        )
      : apiSchema()

    if (previewOnly && specFields) {
      const hiddenKeys = new Set(
        Object.entries(specFields)
          .filter(([, def]) => def.list?.show === false)
          .map(([key]) => key),
      )
      if (hiddenKeys.size > 0) {
        result = result.filter((f) => !hiddenKeys.has(f.name))
      }
    }

    return result
  })
}

/**
 * Batch-loads display labels for all resource-reference fields in a list.
 *
 * Returns a reactive map: field name → (stringified ID → resolved title).
 * Falls back to the raw ID string if the fetch fails for any field.
 * Incrementally caches: IDs already resolved are not re-fetched on page change.
 */
export function useResourceLabelMap(
  getItems: () => ResourceListItem<Record<string, unknown>>[],
  getSpecFields: () => Record<string, ResourceFieldDef> | undefined,
) {
  // Computed view: field name → (id → label), reading from the global cache.
  const labelMap = computed<Record<string, Record<string, string>>>(() => {
    const specFields = getSpecFields()
    if (!specFields) return {}
    const result: Record<string, Record<string, string>> = {}
    for (const [fieldName, def] of Object.entries(specFields)) {
      const resolved = resolveFieldType(def.type)
      if (isResourceRef(resolved)) {
        result[fieldName] = globalLabelCache.value[resolved.endpoints.api] ?? {}
      }
    }
    return result
  })

  watch(
    [() => getItems(), () => getSpecFields()],
    async ([items, specFields]) => {
      if (!specFields || !items.length) return

      const refFields = Object.entries(specFields).filter(([, def]) =>
        isResourceRef(resolveFieldType(def.type)),
      )
      if (!refFields.length) return

      await Promise.allSettled(
        refFields.map(async ([fieldName, def]) => {
          const refSpec = resolveFieldType(def.type) as ResourceSpec
          const cached = globalLabelCache.value[refSpec.endpoints.api] ?? {}
          const inflight = inFlightIds.get(refSpec.endpoints.api) ?? new Set<string>()

          const newIds = [
            ...new Set(
              items
                .map((item) => item[fieldName])
                .filter((id) => id != null && !cached[String(id)] && !inflight.has(String(id))),
            ),
          ]
          if (!newIds.length) return

          if (!inFlightIds.has(refSpec.endpoints.api))
            inFlightIds.set(refSpec.endpoints.api, new Set())
          const flightSet = inFlightIds.get(refSpec.endpoints.api)!
          newIds.forEach((id) => flightSet.add(String(id)))

          try {
            const res = await createResourceApi(refSpec).list({ id: newIds.join(',') })
            const titleFn = refSpec.title ?? ((item: Record<string, unknown>) => String(item.id))
            const entries = res.data.map((item) => [String(item.id), titleFn(item)])
            globalLabelCache.value = {
              ...globalLabelCache.value,
              [refSpec.endpoints.api]: { ...cached, ...Object.fromEntries(entries) },
            }
          } catch (err) {
            console.warn(`[vue-prince] Failed to resolve labels for "${fieldName}":`, err)
          } finally {
            newIds.forEach((id) => flightSet.delete(String(id)))
          }
        }),
      )
    },
    { immediate: true },
  )

  return { labelMap }
}

/** Extracts label overrides from spec.fields for use in view/form components. */
export function useResourceLabels() {
  const route = useRoute()

  return computed<Record<string, string>>(() => {
    const fields = route.meta.spec?.fields ?? {}
    return Object.fromEntries(
      Object.entries(fields)
        .filter(([, def]) => def.label)
        .map(([key, def]) => [key, def.label!]),
    )
  })
}

function resolveTabSpec(tab: { resource: ResourceSpec | (() => ResourceSpec) }): ResourceSpec {
  return typeof tab.resource === 'function' ? tab.resource() : tab.resource
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
      }
    }),
  )

  watch(
    () => getParentId(),
    async (parentId) => {
      if (parentId == null) return
      await Promise.allSettled(
        (parentSpec.tabs ?? []).map(async (tab, i) => {
          const spec = resolveTabSpec(tab)
          const foreignKey = tab.foreignKey ?? `${parentSpec.name}_id`
          tabs.value[i] = { ...tabs.value[i], loading: true, error: null }
          try {
            const res = await createResourceApi(spec).list({
              [foreignKey]: String(parentId),
            })
            tabs.value[i] = {
              ...tabs.value[i],
              items: res.data as ResourceListItem<Record<string, unknown>>[],
              loading: false,
            }
          } catch (err) {
            tabs.value[i] = { ...tabs.value[i], loading: false, error: String(err) }
          }
        }),
      )
    },
    { immediate: true },
  )

  return { tabs }
}
