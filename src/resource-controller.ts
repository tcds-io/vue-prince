import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  ResourceApi,
  ResourceId,
  ResourceListItem,
  ResourceListMetadata,
  ResourceMetadata,
  ResourceSchemaField,
} from './api'
import type {
  InferResourceListModel,
  InferResourceModel,
  ResourcePermissions,
  ResourceSpec,
} from './resource'
import { hasPermission } from './resource'

export function createResourceController<const S extends ResourceSpec>(spec: S) {
  type Model = InferResourceModel<S>
  type ListModel = InferResourceListModel<S>

  const api = spec.api() as ResourceApi<Model>

  const useStore = defineStore(`resource:${spec.route}`, () => {
    const items = ref<ResourceListItem<ListModel>[]>([])
    const itemsMeta = ref<ResourceListMetadata | null>(null)
    const schemaFields = ref<ResourceSchemaField[]>([])
    const schemaPermissions = ref<ResourcePermissions | null>(spec.permissions ?? null)
    // Schema is already complete when the spec supplies both fields and permissions.
    const schemaLoaded = ref(!!(spec.fields && spec.permissions))
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Dedup: if a schema fetch is already in flight, reuse the same promise.
    let schemaFetchPromise: Promise<void> | null = null

    async function fetchSchema() {
      if (schemaLoaded.value) return
      if (schemaFetchPromise) return schemaFetchPromise
      schemaFetchPromise = (async () => {
        loading.value = true
        error.value = null
        try {
          const result = await api.schema()
          schemaFields.value = result.fields
          // Spec-level permissions take precedence over the API response.
          if (!spec.permissions) schemaPermissions.value = result.permissions as ResourcePermissions
          schemaLoaded.value = true
        } catch (e) {
          error.value = String(e)
        } finally {
          loading.value = false
          schemaFetchPromise = null
        }
      })()
      return schemaFetchPromise
    }

    async function list(params?: Record<string, string | number | boolean>) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'read'))
          throw new Error('Permission denied: read')
        const res = await api.list(params)
        items.value = res.data
        itemsMeta.value = res.meta
      } catch (e) {
        error.value = String(e)
        items.value = []
        itemsMeta.value = null
      } finally {
        loading.value = false
      }
    }

    async function get(id: ResourceId): Promise<{ data: Model; meta: ResourceMetadata } | null> {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'read'))
          throw new Error('Permission denied: read')
        const res = await api.get(id)
        return { data: res.data, meta: res.meta }
      } catch (e) {
        error.value = String(e)
        return null
      } finally {
        loading.value = false
      }
    }

    async function create(data: Partial<Model>): Promise<Model | null> {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'create'))
          throw new Error('Permission denied: create')
        const res = await api.create(data)
        return res.data
      } catch (e) {
        error.value = String(e)
        return null
      } finally {
        loading.value = false
      }
    }

    async function update(id: ResourceId, data: Partial<Model>): Promise<boolean> {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'update'))
          throw new Error('Permission denied: update')
        await api.update(id, data)
        return true
      } catch (e) {
        error.value = String(e)
        return false
      } finally {
        loading.value = false
      }
    }

    async function remove(id: ResourceId) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'delete'))
          throw new Error('Permission denied: delete')
        await api.remove(id)
        items.value = items.value.filter((r) => !('id' in r) || r.id !== id)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function createMany(data: Partial<Model>[]) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'create'))
          throw new Error('Permission denied: create')
        const results = await api.createMany(data)
        return results.map((r) => r.data)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function updateMany(data: (Partial<Model> & { id: ResourceId })[]) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'update'))
          throw new Error('Permission denied: update')
        await api.updateMany(data)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function deleteMany(ids: ResourceId[]) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'delete'))
          throw new Error('Permission denied: delete')
        await api.deleteMany(ids)
        items.value = items.value.filter((r) => !('id' in r) || !ids.includes(r.id as ResourceId))
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    const itemsById = computed(() =>
      Object.fromEntries(
        items.value.filter((r) => 'id' in r).map((r) => [(r as { id: ResourceId }).id, r]),
      ),
    )

    return {
      items,
      itemsMeta,
      itemsById,
      schemaFields,
      schemaPermissions,
      schemaLoaded,
      loading,
      error,
      fetchSchema,
      list,
      get,
      create,
      update,
      remove,
      createMany,
      updateMany,
      deleteMany,
    }
  })

  return { store: useStore, api }
}
