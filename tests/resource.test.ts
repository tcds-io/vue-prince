import { describe, it, expect } from 'vitest'
import { defineResource, isResourceRef } from '../src'
import type { ResourceSpec } from '../src'

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

  it('accepts resource-ref fields', () => {
    const userSpec: ResourceSpec = { name: 'user', endpoints }
    const result = defineResource({
      name: 'company',
      endpoints: companyEndpoints,
      fields: { owner_id: { type: userSpec } },
    })
    expect(result.fields?.owner_id.type).toBe(userSpec)
  })
})
