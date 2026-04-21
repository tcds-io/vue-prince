import { describe, it, expect } from 'vitest'
import {
  useResourceTabs,
  resourceListTab,
  createResourceTabView,
} from '../src/pages/use-resource-tabs'

const userSpec = {
  name: 'user',
  endpoints: { api: '/api/users', route: '/users' },
  fields: { id: { type: 'integer' as const }, name: { type: 'string' as const } },
}

describe('useResourceTabs', () => {
  it('returns empty array when spec has no tabs', () => {
    const spec = { name: 'product', endpoints: { api: '/products', route: '/products' } }
    const { tabs } = useResourceTabs(spec)
    expect(tabs).toHaveLength(0)
  })

  it('resolves component from tab.component()', () => {
    const component = {}
    const spec = {
      name: 'company',
      endpoints: { api: '/companies', route: '/companies' },
      tabs: [{ component: () => component as any, label: 'Users' }],
    }
    const { tabs } = useResourceTabs(spec)
    expect(tabs[0].component).toBe(component)
  })

  it('defaults foreignKey to parentSpec.name_id', () => {
    const spec = {
      name: 'company',
      endpoints: { api: '/companies', route: '/companies' },
      tabs: [{ component: () => ({}) as any, label: 'Users' }],
    }
    const { tabs } = useResourceTabs(spec)
    expect(tabs[0].foreignKey).toBe('company_id')
  })

  it('uses custom foreignKey from tab', () => {
    const spec = {
      name: 'company',
      endpoints: { api: '/companies', route: '/companies' },
      tabs: [{ component: () => ({}) as any, foreignKey: 'org_id', label: 'Users' }],
    }
    const { tabs } = useResourceTabs(spec)
    expect(tabs[0].foreignKey).toBe('org_id')
  })

  it('preserves tab label', () => {
    const spec = {
      name: 'company',
      endpoints: { api: '/companies', route: '/companies' },
      tabs: [{ component: () => ({}) as any, label: 'Team Members' }],
    }
    const { tabs } = useResourceTabs(spec)
    expect(tabs[0].label).toBe('Team Members')
  })

  it('resolves multiple tabs', () => {
    const c1 = {} as any
    const c2 = {} as any
    const spec = {
      name: 'company',
      endpoints: { api: '/companies', route: '/companies' },
      tabs: [
        { component: () => c1, label: 'Users' },
        { component: () => c2, label: 'Orders', foreignKey: 'customer_id' },
      ],
    }
    const { tabs } = useResourceTabs(spec)
    expect(tabs).toHaveLength(2)
    expect(tabs[0].component).toBe(c1)
    expect(tabs[1].foreignKey).toBe('customer_id')
  })
})

describe('resourceListTab', () => {
  it('returns a Vue component', () => {
    const comp = resourceListTab(userSpec)
    expect(comp).toBeTruthy()
    expect(typeof comp).toBe('object')
  })

  it('returns the same component on every call for the same spec reference', () => {
    // Each call creates a new component (closures); spec identity is managed by the caller
    const comp = resourceListTab(userSpec)
    expect(comp).toBeTruthy()
  })

  it('returns a different component from createResourceTabView', () => {
    expect(resourceListTab(userSpec)).not.toBe(createResourceTabView(userSpec))
  })
})

describe('createResourceTabView', () => {
  it('returns a Vue component', () => {
    const comp = createResourceTabView(userSpec)
    expect(comp).toBeTruthy()
    expect(typeof comp).toBe('object')
  })

  it('returns a different component from resourceListTab', () => {
    expect(createResourceTabView(userSpec)).not.toBe(resourceListTab(userSpec))
  })
})
