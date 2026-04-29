import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { ResourceId, ResourceListMetadata, ResourceMetadata, ResourceSchemaField } from './api'
import type { ResourcePermissions, ResourceSpec } from './resource'
import type { ResourceLoadingState } from './resource-controller'
import ResourceListPage from './pages/ResourceListPage.vue'
import ResourceDetailPage from './pages/ResourceDetailPage.vue'
import ResourceCreatePage from './pages/ResourceCreatePage.vue'
import ResourceEditPage from './pages/ResourceEditPage.vue'
import ResourceDeletePage from './pages/ResourceDeletePage.vue'
import ResourcePermissionWrapper from './pages/ResourcePermissionWrapper.vue'

export interface ResourcePageStore {
  items: unknown[]
  itemsMeta: ResourceListMetadata | null
  itemsById: Record<ResourceId, unknown>
  schemaFields: ResourceSchemaField[]
  schemaPermissions: Record<string, string>
  schemaLoaded: boolean
  loading: ResourceLoadingState
  error: string | null
  fetchSchema(): Promise<void>
  list(params?: Record<string, string | number | boolean>): Promise<void>
  get(id: ResourceId): Promise<{ data: unknown; meta: ResourceMetadata } | null>
  create(data: Record<string, unknown>): Promise<unknown>
  update(id: ResourceId, data: Record<string, unknown>): Promise<boolean>
  remove(id: ResourceId): Promise<void>
  createMany(data: Partial<Record<string, unknown>>[]): Promise<unknown[] | undefined>
  updateMany(data: (Partial<Record<string, unknown>> & { id: ResourceId })[]): Promise<void>
  removeMany(ids: ResourceId[]): Promise<void>
}

declare module 'vue-router' {
  interface RouteMeta {
    spec?: ResourceSpec
  }
}

function withPermission(inner: Component, action: keyof ResourcePermissions): Component {
  return defineComponent({
    render() {
      return h(ResourcePermissionWrapper, { action }, { default: () => h(inner) })
    },
  })
}

export function createResourceRoutes(spec: ResourceSpec): RouteRecordRaw[] {
  const basePath = spec.route.replace(/^\//, '')
  const segment = basePath.split('/').pop()!

  return [
    {
      path: basePath,
      name: `${segment}-list`,
      component: withPermission(ResourceListPage, 'read'),
      meta: { spec },
    },
    {
      path: `${basePath}/:id`,
      name: `${segment}-detail`,
      component: withPermission(ResourceDetailPage, 'read'),
      meta: { spec },
    },
    {
      path: `${basePath}/create`,
      name: `${segment}-create`,
      component: withPermission(ResourceCreatePage, 'create'),
      meta: { spec },
    },
    {
      path: `${basePath}/:id/edit`,
      name: `${segment}-edit`,
      component: withPermission(ResourceEditPage, 'update'),
      meta: { spec },
    },
    {
      path: `${basePath}/:id/delete/confirm`,
      name: `${segment}-delete-confirm`,
      component: withPermission(ResourceDeletePage, 'delete'),
      meta: { spec },
    },
  ]
}
