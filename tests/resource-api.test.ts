import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureVuePrince } from '../src'
import { createResourceApi } from '../src'

const BASE_URL = '/api/companies'

function makeApi(path = BASE_URL) {
  return createResourceApi({ path })
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  })
}

describe('createResourceApi', () => {
  beforeEach(() => {
    configureVuePrince({ api: { baseUrl: 'https://api.example.com' } })
  })

  describe('schema()', () => {
    it('GETs /_schema and returns fields and permissions', async () => {
      const schema = [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
      ]
      const permissions = { read: 'view_companies', create: 'create_company' }
      global.fetch = mockFetch({ schema, permissions })
      const result = await makeApi().schema()
      expect(result.fields).toEqual(schema)
      expect(result.permissions).toEqual(permissions)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/companies/_schema',
        expect.objectContaining({ headers: expect.any(Object) }),
      )
    })

    it('defaults permissions to {} when not present in response', async () => {
      global.fetch = mockFetch({ schema: [] })
      const result = await makeApi().schema()
      expect(result.permissions).toEqual({})
    })
  })

  describe('list()', () => {
    it('GETs the resource path', async () => {
      const response = { data: [], meta: { current_page: 1, total: 0, last_page: 1, per_page: 15 } }
      global.fetch = mockFetch(response)
      const result = await makeApi().list()
      expect(result).toEqual(response)
    })

    it('appends query params to the URL', async () => {
      global.fetch = mockFetch({ data: [], meta: {} })
      await makeApi().list({ page: '2', search: 'foo' })
      const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url).toContain('page=2')
      expect(url).toContain('search=foo')
    })

    it('calls the correct base URL', async () => {
      global.fetch = mockFetch({ data: [], meta: {} })
      await makeApi().list()
      const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url).toContain('https://api.example.com/api/companies')
    })
  })

  describe('get()', () => {
    it('GETs /{id}', async () => {
      const response = { data: { id: 1, name: 'Acme' }, meta: {} }
      global.fetch = mockFetch(response)
      const result = await makeApi().get(1)
      expect(result).toEqual(response)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/companies/1',
        expect.any(Object),
      )
    })

    it('works with string ids', async () => {
      global.fetch = mockFetch({ data: { id: 'abc' }, meta: {} })
      await makeApi().get('abc')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/companies/abc',
        expect.any(Object),
      )
    })
  })

  describe('create()', () => {
    it('POSTs JSON data', async () => {
      global.fetch = mockFetch({ data: { id: 1, name: 'Acme' }, meta: {} })
      await makeApi().create({ name: 'Acme' } as any)
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ name: 'Acme' })
    })

    it('returns enveloped { data, meta } response', async () => {
      const response = { data: { id: 1, name: 'Acme' }, meta: {} }
      global.fetch = mockFetch(response)
      const result = await makeApi().create({ name: 'Acme' } as any)
      expect(result).toEqual(response)
    })

    it('wraps bare API responses in { data }', async () => {
      const bare = { id: 1, name: 'Acme' }
      global.fetch = mockFetch(bare)
      const result = await makeApi().create({ name: 'Acme' } as any)
      expect(result.data).toEqual(bare)
    })
  })

  describe('update()', () => {
    it('PATCHes /{id} with JSON data', async () => {
      global.fetch = mockFetch({ data: { id: 1, name: 'Updated' }, meta: {} })
      await makeApi().update(1, { name: 'Updated' } as any)
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies/1')
      expect(options.method).toBe('PATCH')
      expect(JSON.parse(options.body)).toEqual({ name: 'Updated' })
    })

    it('returns the response body on success', async () => {
      const response = { data: { id: 1, name: 'Updated' }, meta: {} }
      global.fetch = mockFetch(response)
      const result = await makeApi().update(1, {} as any)
      expect(result).toEqual(response)
    })

    it('returns null on 204 No Content', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue({ status: 204, ok: true, json: () => Promise.resolve(null) })
      const result = await makeApi().update(1, {} as any)
      expect(result).toBeNull()
    })
  })

  describe('remove()', () => {
    it('DELETEs /{id}', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true })
      await makeApi().remove(1)
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies/1')
      expect(options.method).toBe('DELETE')
    })

    it('sends the correct Accept and Content-Type headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true })
      await makeApi().remove(1)
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(options.headers['Accept']).toBe('application/json')
      expect(options.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('error responses', () => {
    it('throws on non-2xx status for create()', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 422,
        ok: false,
        json: () => Promise.resolve({ message: 'Validation failed' }),
      })
      await expect(makeApi().create({ name: 'Acme' } as any)).rejects.toThrow('HTTP 422')
    })

    it('throws on non-2xx status for list()', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 500, ok: false, json: vi.fn() })
      await expect(makeApi().list()).rejects.toThrow('HTTP 500')
    })

    it('throws on non-2xx status for get()', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false, json: vi.fn() })
      await expect(makeApi().get(1)).rejects.toThrow('HTTP 404')
    })

    it('throws on non-2xx status for update()', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 400, ok: false, json: vi.fn() })
      await expect(makeApi().update(1, {} as any)).rejects.toThrow('HTTP 400')
    })

    it('throws on non-2xx status for remove()', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 403, ok: false })
      await expect(makeApi().remove(1)).rejects.toThrow('HTTP 403')
    })
  })

  describe('createMany()', () => {
    it('POSTs to the base URL (no /{id}) with { data: [...] } body', async () => {
      global.fetch = mockFetch({
        data: [
          { id: 1, name: 'Acme' },
          { id: 2, name: 'Beta' },
        ],
      })
      await makeApi().createMany([{ name: 'Acme' }, { name: 'Beta' }] as any)
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ data: [{ name: 'Acme' }, { name: 'Beta' }] })
    })

    it('returns array from { data: [...] } enveloped response', async () => {
      const items = [{ data: { id: 1, name: 'Acme' } }, { data: { id: 2, name: 'Beta' } }]
      global.fetch = mockFetch({ data: items })
      const result = await makeApi().createMany([{ name: 'Acme' }] as any)
      expect(result).toEqual(items)
    })

    it('returns bare array response as-is', async () => {
      const items = [{ data: { id: 1, name: 'Acme' } }]
      global.fetch = mockFetch(items)
      const result = await makeApi().createMany([{ name: 'Acme' }] as any)
      expect(result).toEqual(items)
    })
  })

  describe('updateMany()', () => {
    it('PATCHes the base URL with { data: [...] } body', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true })
      const payload = [
        { id: 1, name: 'Updated' },
        { id: 2, name: 'Also Updated' },
      ]
      await makeApi().updateMany(payload as any)
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies')
      expect(options.method).toBe('PATCH')
      expect(JSON.parse(options.body)).toEqual({ data: payload })
    })
  })

  describe('deleteMany()', () => {
    it('DELETEs the base URL with { data: [...] } body (no /{id} in URL)', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true })
      await makeApi().deleteMany([1, 2, 3])
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies')
      expect(options.method).toBe('DELETE')
      expect(JSON.parse(options.body)).toEqual({ data: [1, 2, 3] })
    })
  })

  describe('reactive headers', () => {
    it('merges custom headers on top of defaults', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true })
      const api = createResourceApi({
        path: '/api/companies',
        headers: { Authorization: 'Bearer token123' },
      })
      await api.remove(1)
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer token123')
      expect(options.headers['Content-Type']).toBe('application/json')
    })

    it('re-evaluates getter headers on each request', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true })
      let token = 'first'
      const api = createResourceApi({
        path: '/api/companies',
        headers: () => ({ Authorization: `Bearer ${token}` }),
      })
      await api.remove(1)
      token = 'second'
      await api.remove(2)
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      expect(calls[0][1].headers['Authorization']).toBe('Bearer first')
      expect(calls[1][1].headers['Authorization']).toBe('Bearer second')
    })
  })
})
