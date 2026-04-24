import { describe, expect, expectTypeOf, it } from 'vitest'
import type { InferResourceListModel, InferResourceModel, ResourceSpec } from '../src'
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

describe('InferResourceModel', () => {
  const _userSpec = defineResource({
    name: 'user',
    endpoints: { api: '/api/users', route: '/users' },
    fields: {
      id: { type: 'integer' as const },
      name: { type: 'string' as const },
      bio: { type: 'text' as const },
      score: { type: 'number' as const },
      active: { type: 'boolean' as const },
      joined_at: { type: 'datetime' as const },
      role: { type: 'enum' as const },
    },
  })

  it('infers integer fields as number', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['id']>().toEqualTypeOf<number>()
  })

  it('infers string fields as string', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['name']>().toEqualTypeOf<string>()
  })

  it('infers text fields as string', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['bio']>().toEqualTypeOf<string>()
  })

  it('infers number fields as number', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['score']>().toEqualTypeOf<number>()
  })

  it('infers boolean fields as boolean', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['active']>().toEqualTypeOf<boolean>()
  })

  it('infers datetime fields as string', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['joined_at']>().toEqualTypeOf<string>()
  })

  it('infers enum fields as string', () => {
    type M = InferResourceModel<typeof _userSpec>
    expectTypeOf<M['role']>().toEqualTypeOf<string>()
  })

  it('infers resource-ref fields as number', () => {
    const _companySpec: ResourceSpec = {
      name: 'company',
      endpoints: { api: '/api/companies', route: '/companies' },
    }
    const _spec = defineResource({
      name: 'user',
      endpoints: { api: '/api/users', route: '/users' },
      fields: { company_id: { type: () => _companySpec } },
    })
    type M = InferResourceModel<typeof _spec>
    expectTypeOf<M['company_id']>().toEqualTypeOf<number>()
  })

  it('falls back to Record<string, unknown> when no fields defined', () => {
    const _spec = defineResource({
      name: 'user',
      endpoints: { api: '/api/users', route: '/users' },
    })
    type M = InferResourceModel<typeof _spec>
    expectTypeOf<M>().toEqualTypeOf<Record<string, unknown>>()
  })
})

describe('InferResourceListModel', () => {
  const _spec = defineResource({
    name: 'user',
    endpoints: { api: '/api/users', route: '/users' },
    fields: {
      id: { type: 'integer' as const },
      name: { type: 'string' as const },
      score: { type: 'number' as const },
    },
  })

  it('infers field types', () => {
    type M = InferResourceListModel<typeof _spec>
    expectTypeOf<M['id']>().toEqualTypeOf<number>()
    expectTypeOf<M['name']>().toEqualTypeOf<string>()
    expectTypeOf<M['score']>().toEqualTypeOf<number>()
  })

  it('falls back to Record<string, unknown> when no fields defined', () => {
    const _noFieldSpec = defineResource({
      name: 'user',
      endpoints: { api: '/api/users', route: '/users' },
    })
    type M = InferResourceListModel<typeof _noFieldSpec>
    expectTypeOf<M>().toEqualTypeOf<Record<string, unknown>>()
  })
})
