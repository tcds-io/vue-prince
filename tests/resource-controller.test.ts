import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { configureVuePrince } from '../src'
import { createResourceController } from '../src'

const BASE_API = '/api/companies'

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  })
}

function makeSpec(api = BASE_API) {
  return { name: 'company', endpoints: { api, route: '/companies' } }
}

describe('createResourceController', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    configureVuePrince({ baseUrl: 'https://api.example.com' })
  })

  it('initializes with empty state', () => {
    const { useStore } = createResourceController(makeSpec())
    const store = useStore()
    expect(store.list).toEqual([])
    expect(store.listMeta).toBeNull()
    expect(store.item).toBeNull()
    expect(store.itemMeta).toBeNull()
    expect(store.schemaFields).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchSchema()', () => {
    it('fetches and stores schema fields', async () => {
      const schema = [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
      ]
      global.fetch = mockFetch({ schema })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchSchema()
      expect(store.schemaFields).toEqual(schema)
    })

    it('skips fetch if schema is already loaded', async () => {
      const schema = [{ name: 'id', type: 'integer' }]
      global.fetch = mockFetch({ schema })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchSchema()
      await store.fetchSchema()
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('sets error on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchSchema()
      expect(store.error).toContain('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchList()', () => {
    it('populates list and listMeta', async () => {
      const data = [{ id: 1, name: 'Acme', _resource: 'company' }]
      const meta = {
        resource: 'company',
        schema: [],
        current_page: 1,
        total: 1,
        last_page: 1,
        per_page: 15,
      }
      global.fetch = mockFetch({ data, meta })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchList()
      expect(store.list).toEqual(data)
      expect(store.listMeta).toEqual(meta)
    })

    it('forwards params to the API', async () => {
      global.fetch = mockFetch({ data: [], meta: {} })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchList({ page: '2', search: 'acme' })
      const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url).toContain('page=2')
      expect(url).toContain('search=acme')
    })

    it('sets error on failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'))
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchList()
      expect(store.error).toContain('Timeout')
    })
  })

  describe('fetchItem()', () => {
    it('populates item and itemMeta', async () => {
      const data = { id: 1, name: 'Acme' }
      const meta = { resource: 'company', schema: [], resources: [] }
      global.fetch = mockFetch({ data, meta })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchItem(1)
      expect(store.item).toEqual(data)
      expect(store.itemMeta).toEqual(meta)
    })
  })

  describe('create()', () => {
    it('POSTs data, stores item, and returns it', async () => {
      const data = { id: 1, name: 'Acme' }
      global.fetch = mockFetch({ data, meta: {} })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      const result = await store.create({ name: 'Acme' })
      expect(result).toEqual(data)
      expect(store.item).toEqual(data)
    })
  })

  describe('update()', () => {
    it('PATCHes data and stores the updated item', async () => {
      const data = { id: 1, name: 'Updated' }
      global.fetch = mockFetch({ data, meta: {} })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.update(1, { name: 'Updated' })
      expect(store.item).toEqual(data)
    })

    it('merges patch data into item when API returns 204', async () => {
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ data: { id: 1, name: 'Acme' }, meta: {} }),
        })
        .mockResolvedValueOnce({ status: 204, json: () => Promise.resolve(null) })
      await store.fetchItem(1)
      await store.update(1, { name: 'Acme Updated' })
      expect((store.item as any)?.name).toBe('Acme Updated')
    })
  })

  describe('remove()', () => {
    it('DELETEs item and removes it from the list', async () => {
      const data = [
        { id: 1, name: 'Acme', _resource: 'company' },
        { id: 2, name: 'Beta', _resource: 'company' },
      ]
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({ data, meta: {} }) })
        .mockResolvedValueOnce({ status: 204 })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchList()
      await store.remove(1)
      expect(store.list).toHaveLength(1)
      expect((store.list[0] as any).id).toBe(2)
    })
  })

  describe('loading state', () => {
    it('is true while a fetch is in-flight and false after', async () => {
      let resolve: (v: any) => void
      const pending = new Promise((r) => {
        resolve = r
      })
      global.fetch = vi.fn().mockReturnValue(pending)
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      const promise = store.fetchList()
      expect(store.loading).toBe(true)
      resolve!({ status: 200, json: () => Promise.resolve({ data: [], meta: {} }) })
      await promise
      expect(store.loading).toBe(false)
    })

    it('resets to false after an error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fail'))
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchList()
      expect(store.loading).toBe(false)
    })
  })

  describe('permission enforcement', () => {
    const restrictedSpec = {
      name: 'company',
      endpoints: { api: '/api/restricted', route: '/restricted' },
      permissions: { read: 'r', create: 'c', update: 'u', delete: 'd' },
    }

    beforeEach(() => {
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => [] })
    })

    it('fetchList sets error when read permission is missing', async () => {
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.fetchList()
      expect(store.error).toContain('Permission denied: read')
    })

    it('fetchItem sets error when read permission is missing', async () => {
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.fetchItem(1)
      expect(store.error).toContain('Permission denied: read')
    })

    it('create sets error when create permission is missing', async () => {
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.create({ name: 'Acme' })
      expect(store.error).toContain('Permission denied: create')
    })

    it('update sets error when update permission is missing', async () => {
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.update(1, { name: 'Acme' })
      expect(store.error).toContain('Permission denied: update')
    })

    it('remove sets error when delete permission is missing', async () => {
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.remove(1)
      expect(store.error).toContain('Permission denied: delete')
    })

    it('resets loading to false after permission denial', async () => {
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.fetchList()
      expect(store.loading).toBe(false)
    })

    it('allows calls when user has the required permission', async () => {
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => ['r'] })
      global.fetch = mockFetch({ data: [], meta: {} })
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.fetchList()
      expect(store.error).toBeNull()
    })
  })
})
