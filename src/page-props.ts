import type { ResourceListItem, ResourceListMetadata, ResourceSchemaField } from './api'
import type { ResourceFieldDef } from './resource'
import type { ResolvedTab } from './pages/use-resource-tabs'

export interface ResourceListPageProps<T = Record<string, unknown>> {
  items: ResourceListItem<T>[]
  schema: ResourceSchemaField[]
  labels: Record<string, string>
  fields: Record<string, ResourceFieldDef> | undefined
  resource: string | undefined
  loading: boolean
  error: string | null
  listMeta: ResourceListMetadata | null
  page: number
  search: Record<string, string>
  navigateToItem: (item: ResourceListItem<T>) => void
  goToPage: (p: number) => void
  createNew: () => void
  onSearch: (params: Record<string, string>) => void
  canCreate: boolean
}

export interface ResourceViewPageProps {
  item: Record<string, unknown> | null
  schema: ResourceSchemaField[]
  labels: Record<string, string>
  resource: string | undefined
  loading: boolean
  error: string | null
  itemTitle: string | undefined
  back: () => void
  edit: () => void
  confirmDelete: () => void
  canEdit: boolean
  canDelete: boolean
  tabs?: ResolvedTab[]
}

export interface ResourceDeletePageProps {
  item: Record<string, unknown> | null
  resource: string | undefined
  loading: boolean
  error: string | null
  itemTitle: string | undefined
  cancel: () => void
  confirm: () => Promise<void>
}

export interface ResourceCreatePageProps {
  schema: ResourceSchemaField[]
  labels: Record<string, string>
  resource: string | undefined
  loading: boolean
  error: string | null
  submit: (data: Record<string, unknown>) => Promise<void>
  cancel: () => void
}

export interface ResourceSearchProps<T = Record<string, unknown>> {
  value: T
  onSearch: (params: T) => void
}

export interface ResourceEditPageProps {
  item: Record<string, unknown> | null
  schema: ResourceSchemaField[]
  labels: Record<string, string>
  resource: string | undefined
  loading: boolean
  error: string | null
  itemTitle: string | undefined
  submit: (data: Record<string, unknown>) => Promise<void>
  cancel: () => void
}
