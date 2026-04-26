import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { ResourceListItem, ResourceSchemaField } from '../api'
import type { ResourceFieldDef, ResourceSpec } from '../resource'
import { isResourceRef, resolveFieldType } from '../resource'

// Module-level cache survives component remounts (navigation away and back).
// Keyed by refSpec.name so two fields pointing at the same resource share entries.
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
        result[fieldName] = globalLabelCache.value[resolved.name] ?? {}
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
          const cached = globalLabelCache.value[refSpec.name] ?? {}
          const inflight = inFlightIds.get(refSpec.name) ?? new Set<string>()

          const newIds = [
            ...new Set(
              items
                .map((item) => item[fieldName])
                .filter((id) => id != null && !cached[String(id)] && !inflight.has(String(id))),
            ),
          ]
          if (!newIds.length) return

          if (!inFlightIds.has(refSpec.name)) inFlightIds.set(refSpec.name, new Set())
          const flightSet = inFlightIds.get(refSpec.name)!
          newIds.forEach((id) => flightSet.add(String(id)))

          try {
            const res = await refSpec.api().list({ id: newIds.join(',') })
            const titleFn = refSpec.title ?? ((item: Record<string, unknown>) => String(item.id))
            const entries = res.data.map((item) => [String(item.id), titleFn(item)])
            globalLabelCache.value = {
              ...globalLabelCache.value,
              [refSpec.name]: { ...cached, ...Object.fromEntries(entries) },
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
