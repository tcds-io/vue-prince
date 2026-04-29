import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
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

export type ResourceLoadingState = {
  schema: boolean
  list: boolean
  get: boolean
  create: boolean
  update: boolean
  remove: boolean
  createMany: boolean
  updateMany: boolean
  removeMany: boolean
}

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
    const loading = reactive<ResourceLoadingState>({
      schema: false,
      list: false,
      get: false,
      create: false,
      update: false,
      remove: false,
      createMany: false,
      updateMany: false,
      removeMany: false,
    })
    const error = ref<string | null>(null)

    // Dedup: if a schema fetch is already in flight, reuse the same promise.
    let schemaFetchPromise: Promise<void> | null = null

    async function fetchSchema() {
      if (schemaLoaded.value) return
      if (schemaFetchPromise) return schemaFetchPromise
      schemaFetchPromise = (async () => {
        loading.schema = true
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
          loading.schema = false
          schemaFetchPromise = null
        }
      })()
      return schemaFetchPromise
    }

    async function list(params?: Record<string, string | number | boolean>) {
      loading.list = true
      await fetchSchema()
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
        loading.list = false
      }
    }

    async function get(id: ResourceId): Promise<{ data: Model; meta: ResourceMetadata } | null> {
      loading.get = true
      await fetchSchema()
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
        loading.get = false
      }
    }

    async function create(data: Partial<Model>): Promise<Model | null> {
      loading.create = true
      await fetchSchema()
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
        loading.create = false
      }
    }

    async function update(id: ResourceId, data: Partial<Model>): Promise<boolean> {
      loading.update = true
      await fetchSchema()
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
        loading.update = false
      }
    }

    async function remove(id: ResourceId) {
      loading.remove = true
      await fetchSchema()
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'delete'))
          throw new Error('Permission denied: delete')
        await api.remove(id)
        items.value = items.value.filter((r) => !('id' in r) || r.id !== id)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.remove = false
      }
    }

    async function createMany(data: Partial<Model>[]) {
      loading.createMany = true
      await fetchSchema()
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'create'))
          throw new Error('Permission denied: create')
        const results = await api.createMany(data)
        return results.map((r) => r.data)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.createMany = false
      }
    }

    async function updateMany(data: (Partial<Model> & { id: ResourceId })[]) {
      loading.updateMany = true
      await fetchSchema()
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'update'))
          throw new Error('Permission denied: update')
        await api.updateMany(data)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.updateMany = false
      }
    }

    async function removeMany(ids: ResourceId[]) {
      loading.removeMany = true
      await fetchSchema()
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'delete'))
          throw new Error('Permission denied: delete')
        await api.removeMany(ids)
        items.value = items.value.filter((r) => !('id' in r) || !ids.includes(r.id as ResourceId))
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.removeMany = false
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
      removeMany,
    }
  })

  return { store: useStore, api }
}
