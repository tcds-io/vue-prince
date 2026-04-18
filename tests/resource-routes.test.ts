import { describe, it, expect } from 'vitest'
import { createResourceRoutes } from '../src'
import type { ResourcePageStore } from '../src'
import type { ResourceSpec } from '../src'

const spec: ResourceSpec = { name: 'company', path: '/api/companies' }
const useStore = () => ({}) as ResourcePageStore

describe('createResourceRoutes', () => {
  it('generates exactly 4 routes', () => {
    expect(createResourceRoutes(spec, useStore)).toHaveLength(4)
  })

  it('derives the segment from the last path component', () => {
    const routes = createResourceRoutes(spec, useStore)
    const paths = routes.map((r) => r.path)
    expect(paths[0]).toBe('companies')
    expect(paths[1]).toBe('companies/create')
    expect(paths[2]).toBe('companies/:id')
    expect(paths[3]).toBe('companies/:id/edit')
  })

  it('assigns named routes using the segment', () => {
    const routes = createResourceRoutes(spec, useStore)
    expect(routes[0].name).toBe('companies-list')
    expect(routes[1].name).toBe('companies-create')
    expect(routes[2].name).toBe('companies-detail')
    expect(routes[3].name).toBe('companies-edit')
  })

  it('attaches useStore to every route meta', () => {
    const routes = createResourceRoutes(spec, useStore)
    routes.forEach((route) => expect(route.meta?.useStore).toBe(useStore))
  })

  it('attaches spec to every route meta', () => {
    const routes = createResourceRoutes(spec, useStore)
    routes.forEach((route) => expect(route.meta?.spec).toBe(spec))
  })

  it('works with deeply nested API paths', () => {
    const nested: ResourceSpec = { name: 'product', path: '/api/v2/backoffice/products' }
    const routes = createResourceRoutes(nested, useStore)
    expect(routes[0].path).toBe('products')
    expect(routes[0].name).toBe('products-list')
  })

  it('uses the correct Vue components per route', async () => {
    const routes = createResourceRoutes(spec, useStore)
    const { default: ListPage } = await import('../src/pages/ResourceListPage.vue')
    const { default: CreatePage } = await import('../src/pages/ResourceCreatePage.vue')
    const { default: DetailPage } = await import('../src/pages/ResourceDetailPage.vue')
    const { default: EditPage } = await import('../src/pages/ResourceEditPage.vue')
    expect(routes[0].component).toBe(ListPage)
    expect(routes[1].component).toBe(CreatePage)
    expect(routes[2].component).toBe(DetailPage)
    expect(routes[3].component).toBe(EditPage)
  })
})
