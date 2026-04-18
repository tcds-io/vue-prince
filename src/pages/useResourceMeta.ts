import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { ResourceSchemaField } from '../api'

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
