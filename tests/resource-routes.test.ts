import { describe, it, expect, beforeEach } from 'vitest'
import { createResourceRoutes, configureVuePrince } from '../src'
import type { ResourceSpec } from '../src'

const spec: ResourceSpec = {
  name: 'company',
  endpoints: { api: '/api/companies', route: '/companies' },
}

describe('createResourceRoutes', () => {
  beforeEach(() => {
    configureVuePrince({ baseUrl: '' })
  })

  it('generates exactly 5 routes', () => {
    expect(createResourceRoutes(spec)).toHaveLength(5)
  })

  it('derives paths from endpoints.route', () => {
    const routes = createResourceRoutes(spec)
    const paths = routes.map((r) => r.path)
    expect(paths[0]).toBe('companies')
    expect(paths[1]).toBe('companies/:id')
    expect(paths[2]).toBe('companies/create')
    expect(paths[3]).toBe('companies/:id/edit')
    expect(paths[4]).toBe('companies/:id/delete/confirm')
  })

  it('assigns named routes using the segment', () => {
    const routes = createResourceRoutes(spec)
    expect(routes[0].name).toBe('companies-list')
    expect(routes[1].name).toBe('companies-detail')
    expect(routes[2].name).toBe('companies-create')
    expect(routes[3].name).toBe('companies-edit')
    expect(routes[4].name).toBe('companies-delete-confirm')
  })

  it('attaches spec to every route meta', () => {
    const routes = createResourceRoutes(spec)
    routes.forEach((route) => expect(route.meta?.spec).toBe(spec))
  })

  it('does not attach beforeEnter guards (permission is handled by wrapper component)', () => {
    const routes = createResourceRoutes(spec)
    routes.forEach((route) => expect(route.beforeEnter).toBeUndefined())
  })

  it('works with nested route paths', () => {
    const nested: ResourceSpec = {
      name: 'product',
      endpoints: { api: '/api/v2/backoffice/products', route: '/admin/products' },
    }
    const routes = createResourceRoutes(nested)
    expect(routes[0].path).toBe('admin/products')
    expect(routes[1].path).toBe('admin/products/:id')
    expect(routes[2].path).toBe('admin/products/create')
    expect(routes[3].path).toBe('admin/products/:id/edit')
    expect(routes[4].path).toBe('admin/products/:id/delete/confirm')
    expect(routes[0].name).toBe('products-list')
  })

  it('always registers all 5 routes regardless of userPermissions', () => {
    configureVuePrince({ baseUrl: '', userPermissions: () => [] })
    expect(createResourceRoutes(spec)).toHaveLength(5)
  })
})
