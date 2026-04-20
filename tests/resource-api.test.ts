import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureVuePrince } from '../src'
import { createResourceApi } from '../src'

const spec = { name: 'company', endpoints: { api: '/api/companies', route: '/api/companies' } }

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  })
}

describe('createResourceApi', () => {
  beforeEach(() => {
    configureVuePrince({ baseUrl: 'https://api.example.com' })
  })

  describe('schema()', () => {
    it('GETs /_schema and returns the schema array', async () => {
      const schema = [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
      ]
      global.fetch = mockFetch({ schema })
      const result = await createResourceApi(spec).schema()
      expect(result).toEqual(schema)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/companies/_schema',
        expect.objectContaining({ headers: expect.any(Object) }),
      )
    })
  })

  describe('list()', () => {
    it('GETs the resource path', async () => {
      const response = { data: [], meta: { current_page: 1, total: 0, last_page: 1, per_page: 15 } }
      global.fetch = mockFetch(response)
      const result = await createResourceApi(spec).list()
      expect(result).toEqual(response)
    })

    it('appends query params to the URL', async () => {
      global.fetch = mockFetch({ data: [], meta: {} })
      await createResourceApi(spec).list({ page: '2', search: 'foo' })
      const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url).toContain('page=2')
      expect(url).toContain('search=foo')
    })

    it('calls the correct base URL', async () => {
      global.fetch = mockFetch({ data: [], meta: {} })
      await createResourceApi(spec).list()
      const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url).toContain('https://api.example.com/api/companies')
    })
  })

  describe('get()', () => {
    it('GETs /{id}', async () => {
      const response = { data: { id: 1, name: 'Acme' }, meta: {} }
      global.fetch = mockFetch(response)
      const result = await createResourceApi(spec).get(1)
      expect(result).toEqual(response)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/companies/1',
        expect.any(Object),
      )
    })

    it('works with string ids', async () => {
      global.fetch = mockFetch({ data: { id: 'abc' }, meta: {} })
      await createResourceApi(spec).get('abc')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/companies/abc',
        expect.any(Object),
      )
    })
  })

  describe('create()', () => {
    it('POSTs JSON data', async () => {
      global.fetch = mockFetch({ data: { id: 1, name: 'Acme' }, meta: {} })
      await createResourceApi(spec).create({ name: 'Acme' } as any)
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ name: 'Acme' })
    })

    it('returns enveloped { data, meta } response', async () => {
      const response = { data: { id: 1, name: 'Acme' }, meta: {} }
      global.fetch = mockFetch(response)
      const result = await createResourceApi(spec).create({ name: 'Acme' } as any)
      expect(result).toEqual(response)
    })

    it('wraps bare API responses in { data }', async () => {
      const bare = { id: 1, name: 'Acme' }
      global.fetch = mockFetch(bare)
      const result = await createResourceApi(spec).create({ name: 'Acme' } as any)
      expect(result.data).toEqual(bare)
    })
  })

  describe('update()', () => {
    it('PATCHes /{id} with JSON data', async () => {
      global.fetch = mockFetch({ data: { id: 1, name: 'Updated' }, meta: {} })
      await createResourceApi(spec).update(1, { name: 'Updated' } as any)
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies/1')
      expect(options.method).toBe('PATCH')
      expect(JSON.parse(options.body)).toEqual({ name: 'Updated' })
    })

    it('returns the response body on success', async () => {
      const response = { data: { id: 1, name: 'Updated' }, meta: {} }
      global.fetch = mockFetch(response)
      const result = await createResourceApi(spec).update(1, {} as any)
      expect(result).toEqual(response)
    })

    it('returns null on 204 No Content', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204, json: () => Promise.resolve(null) })
      const result = await createResourceApi(spec).update(1, {} as any)
      expect(result).toBeNull()
    })
  })

  describe('remove()', () => {
    it('DELETEs /{id}', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204 })
      await createResourceApi(spec).remove(1)
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('https://api.example.com/api/companies/1')
      expect(options.method).toBe('DELETE')
    })

    it('sends the correct Accept and Content-Type headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 204 })
      await createResourceApi(spec).remove(1)
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(options.headers['Accept']).toBe('application/json')
      expect(options.headers['Content-Type']).toBe('application/json')
    })
  })
})
