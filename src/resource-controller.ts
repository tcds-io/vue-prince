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
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchSchema() {
      if (schemaFields.value.length > 0) return
      loading.value = true
      error.value = null
      try {
        schemaFields.value = await api.schema()
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function list(params?: Record<string, string | number | boolean>) {
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'read')) throw new Error('Permission denied: read')
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
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'read')) throw new Error('Permission denied: read')
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
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'create')) throw new Error('Permission denied: create')
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
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'update')) throw new Error('Permission denied: update')
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
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'delete')) throw new Error('Permission denied: delete')
        await api.remove(id)
        items.value = items.value.filter((r) => !('id' in r) || r.id !== id)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function createMany(data: Partial<Model>[]) {
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'create')) throw new Error('Permission denied: create')
        const results = await api.createMany(data)
        return results.map((r) => r.data)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function updateMany(data: (Partial<Model> & { id: ResourceId })[]) {
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'update')) throw new Error('Permission denied: update')
        await api.updateMany(data)
      } catch (e) {
        error.value = String(e)
      } finally {
        loading.value = false
      }
    }

    async function deleteMany(ids: ResourceId[]) {
      loading.value = true
      error.value = null
      try {
        if (!hasPermission(spec, 'delete')) throw new Error('Permission denied: delete')
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
