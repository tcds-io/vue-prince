import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useResourceTabs } from '../src/pages/use-resource-tabs'

vi.mock('../src/resource-api', () => ({ createResourceApi: vi.fn() }))

import { createResourceApi } from '../src/resource-api'

const userSpec = {
  name: 'user',
  endpoints: { api: '/api/users', route: '/users' },
  fields: { id: { type: 'integer' as const }, name: { type: 'string' as const } },
}
const companySpec = {
  name: 'company',
  endpoints: { api: '/api/companies', route: '/companies' },
  tabs: [{ resource: () => userSpec }],
}

beforeEach(() => {
  vi.mocked(createResourceApi).mockReset()
})

describe('useResourceTabs', () => {
  it('returns empty array when spec has no tabs', () => {
    const specWithNoTabs = { name: 'product', endpoints: { api: '/products', route: '/products' } }
    const { tabs } = useResourceTabs(specWithNoTabs, () => 1)
    expect(tabs.value).toHaveLength(0)
  })

  it('fetches items using foreignKey defaulting to parentSpec.name_id', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    useResourceTabs(companySpec, () => 42)
    await flushPromises()
    expect(mockList).toHaveBeenCalledWith({ company_id: '42', page: '1' })
  })

  it('uses custom foreignKey when provided', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const spec = { ...companySpec, tabs: [{ resource: () => userSpec, foreignKey: 'org_id' }] }
    useResourceTabs(spec, () => 7)
    await flushPromises()
    expect(mockList).toHaveBeenCalledWith({ org_id: '7', page: '1' })
  })

  it('uses custom label when provided', () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    } as any)
    const spec = { ...companySpec, tabs: [{ resource: () => userSpec, label: 'Members' }] }
    const { tabs } = useResourceTabs(spec, () => 1)
    expect(tabs.value[0].label).toBe('Members')
  })

  it('falls back to pluralized resource name when label is absent', () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    } as any)
    const { tabs } = useResourceTabs(companySpec, () => 1)
    expect(tabs.value[0].label).toBe('users')
  })

  it('stores fetched items in the tab', async () => {
    const users = [
      { id: 1, name: 'Alice', _resource: 'user' },
      { id: 2, name: 'Bob', _resource: 'user' },
    ]
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: users, meta: {} }),
    } as any)
    const { tabs } = useResourceTabs(companySpec, () => 1)
    await flushPromises()
    expect(tabs.value[0].items).toHaveLength(2)
    expect(tabs.value[0].loading).toBe(false)
  })

  it('sets loading true during fetch and false after', async () => {
    let resolve!: (v: unknown) => void
    const mockList = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)))
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const { tabs } = useResourceTabs(companySpec, () => 1)
    await Promise.resolve()
    expect(tabs.value[0].loading).toBe(true)
    resolve({ data: [], meta: {} })
    await flushPromises()
    expect(tabs.value[0].loading).toBe(false)
  })

  it('sets error on network failure', async () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockRejectedValue(new Error('network error')),
    } as any)
    const { tabs } = useResourceTabs(companySpec, () => 1)
    await flushPromises()
    expect(tabs.value[0].error).toContain('network error')
    expect(tabs.value[0].loading).toBe(false)
  })

  it('does not fetch when parentId is null', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    useResourceTabs(companySpec, () => null)
    await flushPromises()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('re-fetches when parent ID changes', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const parentId = ref<number | null>(null)
    useResourceTabs(companySpec, () => parentId.value)
    await flushPromises()
    expect(mockList).not.toHaveBeenCalled()
    parentId.value = 5
    await flushPromises()
    expect(mockList).toHaveBeenCalledWith({ company_id: '5', page: '1' })
  })

  it('builds schema from spec fields', () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    } as any)
    const { tabs } = useResourceTabs(companySpec, () => 1)
    expect(tabs.value[0].schema.map((f) => f.name)).toEqual(['id', 'name'])
  })

  it('excludes the foreignKey column from the tab schema', () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    } as any)
    const specWithFk = {
      name: 'user',
      endpoints: { api: '/api/users', route: '/users' },
      fields: {
        id: { type: 'integer' as const },
        name: { type: 'string' as const },
        company_id: { type: 'integer' as const },
      },
    }
    const spec = { ...companySpec, tabs: [{ resource: () => specWithFk }] }
    const { tabs } = useResourceTabs(spec, () => 1)
    expect(tabs.value[0].schema.map((f) => f.name)).toEqual(['id', 'name'])
  })

  it('excludes custom foreignKey column from the tab schema', () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    } as any)
    const specWithFk = {
      name: 'user',
      endpoints: { api: '/api/users', route: '/users' },
      fields: {
        id: { type: 'integer' as const },
        name: { type: 'string' as const },
        org_id: { type: 'integer' as const },
      },
    }
    const spec = { ...companySpec, tabs: [{ resource: () => specWithFk, foreignKey: 'org_id' }] }
    const { tabs } = useResourceTabs(spec, () => 1)
    expect(tabs.value[0].schema.map((f) => f.name)).toEqual(['id', 'name'])
  })

  it('stores listMeta after fetch', async () => {
    const meta = {
      resource: 'user',
      schema: [],
      current_page: 1,
      total: 10,
      last_page: 2,
      per_page: 5,
    }
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], meta }),
    } as any)
    const { tabs } = useResourceTabs(companySpec, () => 1)
    await flushPromises()
    expect(tabs.value[0].listMeta).toEqual(meta)
    expect(tabs.value[0].page).toBe(1)
  })

  it('resolves lazy tab resource (circular-safe thunk)', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const spec = { ...companySpec, tabs: [{ resource: () => userSpec }] }
    const { tabs } = useResourceTabs(spec, () => 1)
    await flushPromises()
    expect(tabs.value[0].spec.name).toBe(userSpec.name)
    expect(mockList).toHaveBeenCalled()
  })

  it('goToPage fetches the requested page', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const { goToPage } = useResourceTabs(companySpec, () => 1)
    await flushPromises()
    mockList.mockClear()
    goToPage(0, 2)
    await flushPromises()
    expect(mockList).toHaveBeenCalledWith({ company_id: '1', page: '2' })
  })

  it('goToPage updates the tab page number', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const { tabs, goToPage } = useResourceTabs(companySpec, () => 1)
    await flushPromises()
    goToPage(0, 3)
    await flushPromises()
    expect(tabs.value[0].page).toBe(3)
  })

  it('goToPage does nothing when parentId is null', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const parentId = ref<number | null>(null)
    const { goToPage } = useResourceTabs(companySpec, () => parentId.value)
    await flushPromises()
    mockList.mockClear()
    goToPage(0, 2)
    await flushPromises()
    expect(mockList).not.toHaveBeenCalled()
  })
})
