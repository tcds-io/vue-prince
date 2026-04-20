import { describe, expect, it } from 'vitest'
import type { ResourceSpec } from '../src'
import { defineResource, isResourceRef } from '../src'

const endpoints = { api: '/api/users', route: '/users' }

describe('isResourceRef', () => {
  it('identifies a resource spec', () => {
    const spec: ResourceSpec = { name: 'user', endpoints }
    expect(isResourceRef(spec)).toBe(true)
  })

  it('rejects plain strings', () => {
    expect(isResourceRef('string')).toBe(false)
    expect(isResourceRef('integer')).toBe(false)
  })

  it('rejects objects missing endpoints', () => {
    expect(isResourceRef({ name: 'user' })).toBe(false)
  })

  it('rejects objects missing name', () => {
    expect(isResourceRef({ endpoints })).toBe(false)
  })

  it('rejects null', () => {
    expect(isResourceRef(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isResourceRef(undefined)).toBe(false)
  })

  it('rejects numbers', () => {
    expect(isResourceRef(42)).toBe(false)
  })
})

describe('defineResource', () => {
  const companyEndpoints = { api: '/api/companies', route: '/companies' }

  it('returns the spec unchanged', () => {
    const spec = {
      name: 'company',
      endpoints: companyEndpoints,
      fields: {
        id: { type: 'integer' as const },
        name: { type: 'string' as const },
      },
    }
    expect(defineResource(spec)).toEqual(spec)
  })

  it('works without fields', () => {
    const result = defineResource({ name: 'company', endpoints: companyEndpoints })
    expect(result.name).toBe('company')
    expect(result.endpoints).toEqual(companyEndpoints)
    expect(result.fields).toBeUndefined()
  })

  it('preserves the title function', () => {
    const title = (item: any) => item.name
    const result = defineResource({ name: 'company', endpoints: companyEndpoints, title })
    expect(result.title).toBe(title)
  })

  it('preserves permissions', () => {
    const permissions = { create: 'admin', delete: 'superadmin' }
    const result = defineResource({ name: 'company', endpoints: companyEndpoints, permissions })
    expect(result.permissions).toEqual(permissions)
  })

  it('preserves custom page components', () => {
    const MyList = {}
    const result = defineResource({
      name: 'company',
      endpoints: companyEndpoints,
      components: { list: MyList as any },
    })
    expect(result.components?.list).toBe(MyList)
  })

  it('infers title item type from fields', () => {
    // Would be a compile error if item.name were not string (.toUpperCase is string-only)
    defineResource({
      name: 'user',
      endpoints: { api: '/users', route: '/users' },
      fields: {
        name: { type: 'string' as const },
        age: { type: 'integer' as const },
      },
      title: (item) => item.name.toUpperCase(),
    })
  })

  it('infers list formatter value type from field type', () => {
    // Each method only exists on the expected primitive type
    defineResource({
      name: 'user',
      endpoints: { api: '/users', route: '/users' },
      fields: {
        name: { type: 'string' as const, list: { formatter: (v) => v.toUpperCase() } },
        age: { type: 'integer' as const, list: { formatter: (v) => v.toFixed(2) } },
        active: { type: 'boolean' as const, list: { formatter: (v) => (v ? 'yes' : 'no') } },
      },
    })
  })

  it('infers form formatter value type from field type', () => {
    defineResource({
      name: 'user',
      endpoints: { api: '/users', route: '/users' },
      fields: {
        name: { type: 'string' as const, form: { formatter: (v) => v.toUpperCase() } },
        age: { type: 'integer' as const, form: { formatter: (v) => v.toFixed(2) } },
      },
    })
  })

  it('infers resource-ref formatter value type as number', () => {
    const otherSpec: ResourceSpec = {
      name: 'company',
      endpoints: { api: '/companies', route: '/companies' },
    }
    defineResource({
      name: 'user',
      endpoints: { api: '/users', route: '/users' },
      fields: {
        company_id: { type: () => otherSpec, list: { formatter: (v) => v.toFixed(0) } },
      },
    })
  })

  it('accepts resource-ref fields', () => {
    const userSpec: ResourceSpec = { name: 'user', endpoints }
    const result = defineResource({
      name: 'company',
      endpoints: companyEndpoints,
      fields: { owner_id: { type: () => userSpec } },
    })
    const typeRef = result.fields?.owner_id.type
    expect(typeof typeRef).toBe('function')
    expect((typeRef as () => typeof userSpec)()).toBe(userSpec)
  })
})
