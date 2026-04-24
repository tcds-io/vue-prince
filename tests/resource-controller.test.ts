import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { configureVuePrince } from '../src'
import { createResourceController } from '../src'

const BASE_API = '/api/companies'

function makeSpec(api = BASE_API) {
  return { name: 'company', endpoints: { api, route: '/companies' } }
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  })
}

// Every CRUD action prefetches schema; this helper sets up both calls in sequence.
function mockFetchWithSchema(
  dataBody: unknown,
  dataStatus = 200,
  schemaPermissions: Record<string, string> = {},
) {
  return vi
    .fn()
    .mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ schema: [], permissions: schemaPermissions }),
    })
    .mockResolvedValue({
      status: dataStatus,
      json: () => Promise.resolve(dataBody),
    })
}

describe('createResourceController', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    configureVuePrince({ baseUrl: 'https://api.example.com' })
  })

  it('initializes with empty state', () => {
    const { useStore } = createResourceController(makeSpec())
    const store = useStore()
    expect(store.items).toEqual([])
    expect(store.itemsMeta).toBeNull()
    expect(store.itemsById).toEqual({})
    expect(store.item).toBeNull()
    expect(store.itemMeta).toBeNull()
    expect(store.schemaFields).toEqual([])
    expect(store.schemaPermissions).toEqual({})
    expect(store.schemaLoaded).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchSchema()', () => {
    it('fetches fields and permissions from /_schema', async () => {
      const schema = [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
      ]
      const permissions = { read: 'view_companies', create: 'create_company' }
      global.fetch = mockFetch({ schema, permissions })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchSchema()
      expect(store.schemaFields).toEqual(schema)
      expect(store.schemaPermissions).toEqual(permissions)
      expect(store.schemaLoaded).toBe(true)
    })

    it('defaults permissions to {} when not in response', async () => {
      global.fetch = mockFetch({ schema: [] })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.fetchSchema()
      expect(store.schemaPermissions).toEqual({})
    })

    it('skips fetch if schema is already loaded', async () => {
      global.fetch = mockFetch({ schema: [], permissions: {} })
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
      expect(store.schemaLoaded).toBe(false)
    })
  })

  describe('list()', () => {
    it('populates items and itemsMeta', async () => {
      const data = [{ id: 1, name: 'Acme', _resource: 'company' }]
      const meta = {
        resource: 'company',
        schema: [],
        current_page: 1,
        total: 1,
        last_page: 1,
        per_page: 15,
      }
      global.fetch = mockFetchWithSchema({ data, meta })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list()
      expect(store.items).toEqual(data)
      expect(store.itemsMeta).toEqual(meta)
    })

    it('forwards params to the API', async () => {
      global.fetch = mockFetchWithSchema({ data: [], meta: {} })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list({ page: '2', search: 'acme' })
      const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0])
      expect(url).toContain('page=2')
      expect(url).toContain('search=acme')
    })

    it('sets error on failure', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ schema: [], permissions: {} }),
        })
        .mockRejectedValueOnce(new Error('Timeout'))
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list()
      expect(store.error).toContain('Timeout')
    })
  })

  describe('get()', () => {
    it('populates item and itemMeta', async () => {
      const data = { id: 1, name: 'Acme' }
      const meta = { resource: 'company', schema: [], resources: [] }
      global.fetch = mockFetchWithSchema({ data, meta })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.get(1)
      expect(store.item).toEqual(data)
      expect(store.itemMeta).toEqual(meta)
    })
  })

  describe('create()', () => {
    it('POSTs data, stores item, and returns it', async () => {
      const data = { id: 1, name: 'Acme' }
      global.fetch = mockFetchWithSchema({ data, meta: {} })
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
      global.fetch = mockFetchWithSchema({ data, meta: {} })
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
          // schema
          status: 200,
          json: () => Promise.resolve({ schema: [], permissions: {} }),
        })
        .mockResolvedValueOnce({
          // get
          status: 200,
          json: () => Promise.resolve({ data: { id: 1, name: 'Acme' }, meta: {} }),
        })
        .mockResolvedValueOnce({
          // update (204)
          status: 204,
          json: () => Promise.resolve(null),
        })
      await store.get(1)
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
        .mockResolvedValueOnce({
          // schema (reused by both list and remove)
          status: 200,
          json: () => Promise.resolve({ schema: [], permissions: {} }),
        })
        .mockResolvedValueOnce({
          // list data
          status: 200,
          json: () => Promise.resolve({ data, meta: {} }),
        })
        .mockResolvedValueOnce({ status: 204 }) // remove
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list()
      await store.remove(1)
      expect(store.items).toHaveLength(1)
      expect((store.items[0] as any).id).toBe(2)
    })
  })

  describe('createMany()', () => {
    it('calls api.createMany and returns the created items', async () => {
      const createdItems = [{ id: 1, name: 'Acme' }, { id: 2, name: 'Beta' }]
      global.fetch = mockFetchWithSchema({ data: createdItems.map((d) => ({ data: d })) })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      const result = await store.createMany([{ name: 'Acme' }, { name: 'Beta' }])
      expect(result).toEqual(createdItems)
      expect(store.error).toBeNull()
    })

    it('sets error when create permission is missing', async () => {
      global.fetch = mockFetch({ schema: [], permissions: { create: 'c' } })
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => [] })
      const { useStore } = createResourceController(
        makeSpec('/api/companies-batch-create'),
      )
      const store = useStore()
      await store.createMany([{ name: 'Acme' }])
      expect(store.error).toContain('Permission denied: create')
    })
  })

  describe('updateMany()', () => {
    it('calls api.updateMany and clears error on success', async () => {
      global.fetch = mockFetchWithSchema(null, 204)
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.updateMany([{ id: 1, name: 'Updated' }])
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('sets error when update permission is missing', async () => {
      global.fetch = mockFetch({ schema: [], permissions: { update: 'u' } })
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => [] })
      const { useStore } = createResourceController(makeSpec('/api/companies-batch-update'))
      const store = useStore()
      await store.updateMany([{ id: 1, name: 'Updated' }])
      expect(store.error).toContain('Permission denied: update')
    })
  })

  describe('deleteMany()', () => {
    it('removes matching items from the list', async () => {
      const data = [
        { id: 1, name: 'Acme', _resource: 'company' },
        { id: 2, name: 'Beta', _resource: 'company' },
        { id: 3, name: 'Gamma', _resource: 'company' },
      ]
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ schema: [], permissions: {} }),
        })
        .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({ data, meta: {} }) })
        .mockResolvedValueOnce({ status: 204 })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list()
      await store.deleteMany([1, 3])
      expect(store.items).toHaveLength(1)
      expect((store.items[0] as any).id).toBe(2)
    })

    it('sets error when delete permission is missing', async () => {
      global.fetch = mockFetch({ schema: [], permissions: { delete: 'd' } })
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => [] })
      const { useStore } = createResourceController(makeSpec('/api/companies-batch-delete'))
      const store = useStore()
      await store.deleteMany([1, 2])
      expect(store.error).toContain('Permission denied: delete')
    })
  })

  describe('itemsById', () => {
    it('returns items indexed by id', async () => {
      const data = [
        { id: 1, name: 'Acme', _resource: 'company' },
        { id: 2, name: 'Beta', _resource: 'company' },
      ]
      global.fetch = mockFetchWithSchema({ data, meta: {} })
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list()
      expect(store.itemsById[1]).toEqual(data[0])
      expect(store.itemsById[2]).toEqual(data[1])
    })

    it('is empty when items list is empty', () => {
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      expect(store.itemsById).toEqual({})
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
      const promise = store.list()
      expect(store.loading).toBe(true)
      resolve!({ status: 200, json: () => Promise.resolve({ schema: [], data: [], meta: {} }) })
      await promise
      expect(store.loading).toBe(false)
    })

    it('resets to false after an error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fail'))
      const { useStore } = createResourceController(makeSpec())
      const store = useStore()
      await store.list()
      expect(store.loading).toBe(false)
    })
  })

  describe('permission enforcement', () => {
    // Permissions now come from the schema response, not the spec.
    // Each test mocks the schema endpoint to return the required permission strings.
    const restrictedApi = '/api/restricted'
    const restrictedSpec = { name: 'company', endpoints: { api: restrictedApi, route: '/restricted' } }

    function mockRestrictedSchema() {
      return mockFetch({
        schema: [],
        permissions: { read: 'r', create: 'c', update: 'u', delete: 'd' },
      })
    }

    beforeEach(() => {
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => [] })
    })

    it('list sets error when read permission is missing', async () => {
      global.fetch = mockRestrictedSchema()
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.list()
      expect(store.error).toContain('Permission denied: read')
    })

    it('get sets error when read permission is missing', async () => {
      global.fetch = mockRestrictedSchema()
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.get(1)
      expect(store.error).toContain('Permission denied: read')
    })

    it('create sets error when create permission is missing', async () => {
      global.fetch = mockRestrictedSchema()
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.create({ name: 'Acme' })
      expect(store.error).toContain('Permission denied: create')
    })

    it('update sets error when update permission is missing', async () => {
      global.fetch = mockRestrictedSchema()
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.update(1, { name: 'Acme' })
      expect(store.error).toContain('Permission denied: update')
    })

    it('remove sets error when delete permission is missing', async () => {
      global.fetch = mockRestrictedSchema()
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.remove(1)
      expect(store.error).toContain('Permission denied: delete')
    })

    it('resets loading to false after permission denial', async () => {
      global.fetch = mockRestrictedSchema()
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.list()
      expect(store.loading).toBe(false)
    })

    it('allows calls when user has the required permission', async () => {
      configureVuePrince({ baseUrl: 'https://api.example.com', userPermissions: () => ['r'] })
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ schema: [], permissions: { read: 'r' } }),
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ data: [], meta: {} }),
        })
      const { useStore } = createResourceController(restrictedSpec)
      const store = useStore()
      await store.list()
      expect(store.error).toBeNull()
    })
  })
})
