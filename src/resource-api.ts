import type { ResourceId, ResourceListResponse, ResourceResponse, ResourceSchemaField } from './api'
import type { InferResourceModel, ResourceSpec } from './resource'
import { getConfig } from './config'

export type ResourceApi<Model extends object> = {
  schema(): Promise<ResourceSchemaField[]>
  list(params?: Record<string, string | number | boolean>): Promise<ResourceListResponse<Model>>
  get(id: ResourceId): Promise<ResourceResponse<Model>>
  create(data: Partial<Model>): Promise<ResourceResponse<Model>>
  update(id: ResourceId, data: Partial<Model>): Promise<ResourceResponse<Model> | null>
  remove(id: ResourceId): Promise<void>
  createMany(data: Partial<Model>[]): Promise<ResourceResponse<Model>[]>
  updateMany(data: (Partial<Model> & { id: ResourceId })[]): Promise<void>
  deleteMany(ids: ResourceId[]): Promise<void>
}

export function createResourceApi<const S extends ResourceSpec>(
  spec: S,
): ResourceApi<InferResourceModel<S>> {
  type Model = InferResourceModel<S>

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }

  return {
    async schema() {
      const response = await fetch(`${getConfig().baseUrl}${spec.endpoints.api}/_schema`, {
        headers,
      })
      const body = (await response.json()) as { schema: ResourceSchemaField[] }
      return body.schema
    },

    async list(params) {
      const url = new URL(spec.endpoints.api, getConfig().baseUrl)

      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
      }

      const response = await fetch(url, { headers })

      return (await response.json()) as Promise<ResourceListResponse<Model>>
    },

    async get(id) {
      const response = await fetch(`${getConfig().baseUrl}${spec.endpoints.api}/${id}`, { headers })

      return (await response.json()) as Promise<ResourceResponse<Model>>
    },

    async create(data) {
      const response = await fetch(`${getConfig().baseUrl}${spec.endpoints.api}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })

      const body = await response.json()
      // Support both enveloped { data, meta } and bare { id, ... } responses
      return ('data' in body ? body : { data: body }) as ResourceResponse<Model>
    },

    async update(id, data) {
      const response = await fetch(`${getConfig().baseUrl}${spec.endpoints.api}/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      })

      if (response.status === 204) return null
      return (await response.json()) as Promise<ResourceResponse<Model>>
    },

    async remove(id) {
      await fetch(`${getConfig().baseUrl}${spec.endpoints.api}/${id}`, {
        method: 'DELETE',
        headers,
      })
    },

    async createMany(data) {
      const response = await fetch(`${getConfig().baseUrl}${spec.endpoints.api}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      })
      const body = await response.json()
      // Support { data: [...] } envelope or bare array
      return (Array.isArray(body) ? body : body.data) as ResourceResponse<Model>[]
    },

    async updateMany(data) {
      await fetch(`${getConfig().baseUrl}${spec.endpoints.api}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ data }),
      })
    },

    async deleteMany(ids) {
      await fetch(`${getConfig().baseUrl}${spec.endpoints.api}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ data: ids }),
      })
    },
  }
}
