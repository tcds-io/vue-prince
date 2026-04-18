export type ResourceId = number | string
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
