import { describe, it, expect } from 'vitest'
import { defineResource, isResourceRef } from '../src'
import type { ResourceSpec } from '../src'

describe('isResourceRef', () => {
  it('identifies a resource spec', () => {
    const spec: ResourceSpec = { name: 'user', path: '/api/users' }
    expect(isResourceRef(spec)).toBe(true)
  })

  it('rejects plain strings', () => {
    expect(isResourceRef('string')).toBe(false)
    expect(isResourceRef('integer')).toBe(false)
  })

  it('rejects objects missing path', () => {
    expect(isResourceRef({ name: 'user' })).toBe(false)
  })

  it('rejects objects missing name', () => {
    expect(isResourceRef({ path: '/api/users' })).toBe(false)
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
  it('returns the spec unchanged', () => {
    const spec = {
      name: 'company',
      path: '/api/companies',
      fields: {
        id: { type: 'integer' as const },
        name: { type: 'string' as const },
      },
    }
    expect(defineResource(spec)).toEqual(spec)
  })

  it('works without fields', () => {
    const result = defineResource({ name: 'company', path: '/api/companies' })
    expect(result.name).toBe('company')
    expect(result.path).toBe('/api/companies')
    expect(result.fields).toBeUndefined()
  })

  it('preserves the title function', () => {
    const title = (item: any) => item.name
    const result = defineResource({ name: 'company', path: '/api/companies', title })
    expect(result.title).toBe(title)
  })

  it('preserves permissions', () => {
    const permissions = { create: 'admin', delete: 'superadmin' }
    const result = defineResource({ name: 'company', path: '/api/companies', permissions })
    expect(result.permissions).toEqual(permissions)
  })

  it('preserves custom page components', () => {
    const MyList = {}
    const result = defineResource({
      name: 'company',
      path: '/api/companies',
      components: { list: MyList as any },
    })
    expect(result.components?.list).toBe(MyList)
  })

  it('accepts resource-ref fields', () => {
    const userSpec: ResourceSpec = { name: 'user', path: '/api/users' }
    const result = defineResource({
      name: 'company',
      path: '/api/companies',
      fields: { owner_id: { type: userSpec } },
    })
    expect(result.fields?.owner_id.type).toBe(userSpec)
  })
})
