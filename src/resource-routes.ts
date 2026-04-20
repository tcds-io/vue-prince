import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { ResourceId, ResourceListMetadata, ResourceMetadata, ResourceSchemaField } from './api'
import type { ResourceSpec } from './resource'
import ResourceListPage from './pages/ResourceListPage.vue'
import ResourceDetailPage from './pages/ResourceDetailPage.vue'
import ResourceCreatePage from './pages/ResourceCreatePage.vue'
import ResourceEditPage from './pages/ResourceEditPage.vue'
import ResourceDeletePage from './pages/ResourceDeletePage.vue'
import ResourcePermissionWrapper from './pages/ResourcePermissionWrapper.vue'

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

function withPermission(inner: Component, permission?: string): Component {
  return defineComponent({
    render() {
      return h(ResourcePermissionWrapper, { permission }, { default: () => h(inner) })
    },
  })
}

export function createResourceRoutes(
  spec: ResourceSpec,
  useStore: () => ResourcePageStore,
): RouteRecordRaw[] {
  const basePath = spec.endpoints.route.replace(/^\//, '')
  const segment = basePath.split('/').pop()!

  return [
    {
      path: basePath,
      name: `${segment}-list`,
      component: withPermission(ResourceListPage, spec.permissions?.read),
      meta: { useStore, spec },
    },
    {
      path: `${basePath}/:id`,
      name: `${segment}-detail`,
      component: withPermission(ResourceDetailPage, spec.permissions?.read),
      meta: { useStore, spec },
    },
    {
      path: `${basePath}/create`,
      name: `${segment}-create`,
      component: withPermission(ResourceCreatePage, spec.permissions?.create),
      meta: { useStore, spec },
    },
    {
      path: `${basePath}/:id/edit`,
      name: `${segment}-edit`,
      component: withPermission(ResourceEditPage, spec.permissions?.update),
      meta: { useStore, spec },
    },
    {
      path: `${basePath}/:id/delete/confirm`,
      name: `${segment}-delete-confirm`,
      component: withPermission(ResourceDeletePage, spec.permissions?.delete),
      meta: { useStore, spec },
    },
  ]
}
