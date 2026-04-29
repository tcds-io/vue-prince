export type ResourceId = number | string

export type ResourceSchemaResponse = {
  fields: ResourceSchemaField[]
  permissions: Record<string, string>
}

export type ResourceApi<Model extends object = Record<string, unknown>> = {
  schema(): Promise<ResourceSchemaResponse>
  list(params?: Record<string, string | number | boolean>): Promise<ResourceListResponse<Model>>
  get(id: ResourceId): Promise<ResourceResponse<Model>>
  create(data: Partial<Model>): Promise<ResourceResponse<Model>>
  update(id: ResourceId, data: Partial<Model>): Promise<ResourceResponse<Model> | null>
  remove(id: ResourceId): Promise<void>
  createMany(data: Partial<Model>[]): Promise<ResourceResponse<Model>[]>
  updateMany(data: (Partial<Model> & { id: ResourceId })[]): Promise<void>
  removeMany(ids: ResourceId[]): Promise<void>
}
export type ResourceFieldType = 'integer' | 'number' | 'text' | 'datetime' | 'enum' | (string & {})
export type ResourceSchemaField = { name: string; type: ResourceFieldType; values?: string[] }
export type ResourceMetadata = {
  resource: string
  schema: ResourceSchemaField[]
  resources: string[]
}

export type ResourceListMetadata = {
  resource: string
  schema: ResourceSchemaField[]
  current_page: number
  total: number
  last_page: number
  per_page: number
}

export type Resource<T> = { id: ResourceId } & T
export type ResourceListItem<T> = Resource<T> & { _resource: string }
export type ResourceResponse<T, M = ResourceMetadata> = { data: Resource<T>; meta: M }
export type ResourceListResponse<T, M = ResourceListMetadata> = {
  data: ResourceListItem<T>[]
  meta: M
}
