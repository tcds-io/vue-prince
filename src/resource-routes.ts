import type { RouteRecordRaw } from 'vue-router'
import type { ResourceId, ResourceListMetadata, ResourceMetadata, ResourceSchemaField } from './api'
import type { ResourceSpec } from './resource'
import ResourceListPage from './pages/ResourceListPage.vue'
import ResourceDetailPage from './pages/ResourceDetailPage.vue'
import ResourceCreatePage from './pages/ResourceCreatePage.vue'
import ResourceEditPage from './pages/ResourceEditPage.vue'

export interface ResourcePageStore {
  list: unknown[]
  listMeta: ResourceListMetadata | null
  item: unknown
  itemMeta: ResourceMetadata | null
  schemaFields: ResourceSchemaField[]
  loading: boolean
  error: string | null
  fetchSchema(): Promise<void>
  fetchList(params?: Record<string, string>): Promise<void>
  fetchItem(id: ResourceId): Promise<void>
  create(data: Record<string, unknown>): Promise<unknown>
  update(id: ResourceId, data: Record<string, unknown>): Promise<unknown>
  remove(id: ResourceId): Promise<void>
}

declare module 'vue-router' {
  interface RouteMeta {
    useStore?: () => ResourcePageStore
    spec?: ResourceSpec
  }
}

export function createResourceRoutes(
  spec: ResourceSpec,
  useStore: () => ResourcePageStore,
): RouteRecordRaw[] {
  const segment = spec.path.split('/').pop()!

  return [
    {
      path: segment,
      name: `${segment}-list`,
      component: ResourceListPage,
      meta: { useStore, spec },
    },
    {
      path: `${segment}/create`,
      name: `${segment}-create`,
      component: ResourceCreatePage,
      meta: { useStore, spec },
    },
    {
      path: `${segment}/:id`,
      name: `${segment}-detail`,
      component: ResourceDetailPage,
      meta: { useStore, spec },
    },
    {
      path: `${segment}/:id/edit`,
      name: `${segment}-edit`,
      component: ResourceEditPage,
      meta: { useStore, spec },
    },
  ]
}
