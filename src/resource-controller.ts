import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  ResourceId,
  ResourceListItem,
  ResourceListMetadata,
  ResourceMetadata,
  ResourceSchemaField,
} from './api'
import type { InferResourceListModel, InferResourceModel, ResourceSpec } from './resource'
import { hasPermission } from './resource'
import { createResourceApi } from './resource-api'

export function createResourceController<const S extends ResourceSpec>(spec: S) {
  type Model = InferResourceModel<S>
  type ListModel = InferResourceListModel<S>

  const api = createResourceApi(spec)

  const useStore = defineStore(`resource:${spec.endpoints.api}`, () => {
    const items = ref<ResourceListItem<ListModel>[]>([])
    const itemsMeta = ref<ResourceListMetadata | null>(null)
    const item = ref<Model | null>(null)
    const itemMeta = ref<ResourceMetadata | null>(null)
    const schemaFields = ref<ResourceSchemaField[]>([])
    const schemaPermissions = ref<Record<string, string>>({})
    const schemaLoaded = ref(false)
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
          schemaPermissions.value = result.permissions
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
      } finally {
        loading.value = false
      }
    }

    async function get(id: ResourceId) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'read'))
          throw new Error('Permission denied: read')
        const res = await api.get(id)
        item.value = res.data
        itemMeta.value = res.meta
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function create(data: Partial<Model>) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'create'))
          throw new Error('Permission denied: create')
        const res = await api.create(data)
        item.value = res.data
        return res.data
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function update(id: ResourceId, data: Partial<Model>) {
      await fetchSchema()
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(schemaPermissions.value, 'update'))
          throw new Error('Permission denied: update')
        const res = await api.update(id, data)
        if (res) {
          item.value = res.data
        } else if (item.value) {
          Object.assign(item.value, data)
        }
        return item.value
      } catch (e) {
        error.value = String(e)
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
      item,
      itemMeta,
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

  return { useStore }
}
