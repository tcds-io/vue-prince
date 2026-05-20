import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type {
  ResourceApi,
  ResourceListResponse,
  ResourceResponse,
  ResourceSchemaField,
} from './api'
import { getConfig } from './config'

export class ResourceApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ResourceApiError'
    this.status = status
    this.body = body
  }
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // non-JSON or empty body — fall through to default message
  }
  const bodyMessage =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : null
  throw new ResourceApiError(bodyMessage || `HTTP ${response.status}`, response.status, body)
}

export function createResourceApi(options: {
  path: string
  baseUrl?: string
  headers?: MaybeRefOrGetter<Record<string, string>>
}): ResourceApi {
  const defaultHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' }

  // Evaluated on every request so reactive refs and getter functions always return fresh values.
  const getHeaders = () => ({
    ...defaultHeaders,
    ...toValue(options.headers ?? getConfig().api.headers ?? {}),
  })
  const getBase = () => options.baseUrl ?? getConfig().api.baseUrl

  return {
    async schema() {
      const response = await fetch(`${getBase()}${options.path}/_schema`, {
        headers: getHeaders(),
      })
      await assertOk(response)
      const body = (await response.json()) as {
        schema: ResourceSchemaField[]
        permissions?: Record<string, string>
      }
      return {
        fields: body.schema,
        permissions: body.permissions ?? {},
      }
    },

    async list(params) {
      const url = new URL(options.path, getBase())

      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
      }

      const response = await fetch(url, { headers: getHeaders() })
      await assertOk(response)
      return (await response.json()) as Promise<ResourceListResponse<Record<string, unknown>>>
    },

    async get(id) {
      const response = await fetch(`${getBase()}${options.path}/${id}`, {
        headers: getHeaders(),
      })
      await assertOk(response)
      return (await response.json()) as Promise<ResourceResponse<Record<string, unknown>>>
    },

    async create(data) {
      const response = await fetch(`${getBase()}${options.path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      })

      await assertOk(response)
      const body = await response.json()
      // Support both enveloped { data, meta } and bare { id, ... } responses
      return ('data' in body ? body : { data: body }) as ResourceResponse<Record<string, unknown>>
    },

    async update(id, data) {
      const response = await fetch(`${getBase()}${options.path}/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      })

      await assertOk(response)
      if (response.status === 204) return null
      return (await response.json()) as Promise<ResourceResponse<Record<string, unknown>>>
    },

    async remove(id) {
      const response = await fetch(`${getBase()}${options.path}/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      await assertOk(response)
    },

    async createMany(data) {
      const response = await fetch(`${getBase()}${options.path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ data }),
      })
      await assertOk(response)
      const body = await response.json()
      // Support { data: [...] } envelope or bare array
      return (Array.isArray(body) ? body : body.data) as ResourceResponse<Record<string, unknown>>[]
    },

    async updateMany(data) {
      const response = await fetch(`${getBase()}${options.path}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ data }),
      })
      await assertOk(response)
    },

    async removeMany(ids) {
      const response = await fetch(`${getBase()}${options.path}`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ data: ids }),
      })
      await assertOk(response)
    },
  }
}
