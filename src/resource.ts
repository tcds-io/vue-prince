import type { Component } from 'vue'
import { getConfig } from './config'

export type SpecFieldType =
  | 'integer'
  | 'number'
  | 'string'
  | 'text'
  | 'boolean'
  | 'datetime'
  | 'enum'

type SpecFieldTypeToTs = {
  integer: number
  number: number
  string: string
  text: string
  boolean: boolean
  datetime: string
  enum: string
}

// Maps a field's `type` to its TypeScript value type.
type FieldTypeToTs<T extends SpecFieldType | (() => ResourceSpec)> = T extends () => ResourceSpec
  ? number
  : T extends SpecFieldType
    ? SpecFieldTypeToTs[T]
    : never

// `any` lets (v: string) => string be assignable to this slot (bypasses contravariance).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValue = any

export type ResourceFieldDefList = {
  show?: boolean
  align?: 'left' | 'center' | 'right'
  width?: number
  formatter?: (value: AnyValue) => string
}

export type ResourceFieldDefForm = {
  readOnly?: boolean
  formatter?: (value: AnyValue) => string
}

export type ResourceFieldDef = {
  type: SpecFieldType | (() => ResourceSpec)
  values?: Array<string | number>
  label?: string
  list?: ResourceFieldDefList
  form?: ResourceFieldDefForm
}

export function isResourceRef(type: unknown): type is ResourceSpec {
  return typeof type === 'object' && type !== null && 'endpoints' in type && 'name' in type
}

export function resolveFieldType(type: ResourceFieldDef['type']): SpecFieldType | ResourceSpec {
  return typeof type === 'function' ? type() : type
}

export type ResourceListAction = {
  label: string
  onClick: () => void
  permission?: string
}

export type ResourceItemAction<T = Record<string, unknown>> = {
  label: string | ((resource: T) => string)
  onClick: (resource: T) => void
  permission?: string
}

export function hasActionPermission(permission?: string): boolean {
  if (!permission) return true
  const perms = getConfig().userPermissions?.()
  return perms ? perms.includes(permission) : true
}

export type SuccessValidationResult = {
  success: true
}
export type FailValidationResult = {
  success: false
  error: { issues: Array<{ path: PropertyKey[]; message: string }> }
}

export type ValidationSchema = {
  safeParse: (data: unknown) => SuccessValidationResult | FailValidationResult
}

export type ResourceTab = {
  component: () => Component
  foreignKey?: string
  label?: string
}

export type ResourcePageComponents = {
  list?: Component
  view?: Component
  create?: Component
  edit?: Component
  delete?: Component
  search?: Component
}

export type ResourceSpec<T = Record<string, unknown>> = {
  name: string
  endpoints: { api: string; route: string }
  fields?: Record<string, ResourceFieldDef>
  title?: (item: T) => string
  components?: ResourcePageComponents
  tabs?: readonly ResourceTab[]
  actions?: {
    list?: ResourceListAction[]
    resource?: ResourceItemAction[]
  }
  validationSchema?: ValidationSchema
}

type DefinedFields<S extends ResourceSpec> = Exclude<S['fields'], undefined>

type ListVisibleKeys<F extends Record<string, ResourceFieldDef>> = {
  [K in keyof F]: F[K]['list'] extends { show: false } ? never : K
}[keyof F]

export type InferResourceModel<S extends ResourceSpec> = [keyof DefinedFields<S>] extends [never]
  ? Record<string, unknown>
  : string extends keyof DefinedFields<S> // generic string index = no specific fields known
    ? Record<string, unknown>
    : { [K in keyof DefinedFields<S>]: FieldTypeToTs<DefinedFields<S>[K]['type']> }

export type InferResourceListModel<S extends ResourceSpec> = [keyof DefinedFields<S>] extends [
  never,
]
  ? Record<string, unknown>
  : string extends keyof DefinedFields<S>
    ? Record<string, unknown>
    : { [K in ListVisibleKeys<DefinedFields<S>>]: FieldTypeToTs<DefinedFields<S>[K]['type']> }

// Alias for the field type discriminant — either a primitive kind or a lazy resource reference.
type AnyTypeRef = SpecFieldType | (() => ResourceSpec)

export function hasPermission(
  schemaPermissions: Record<string, string>,
  action: string,
): boolean {
  const required = schemaPermissions[action]
  if (!required) return true
  const perms = getConfig().userPermissions?.()
  return perms ? perms.includes(required) : true
}

// F maps field names to their type discriminants (e.g. { name: 'string', age: 'integer' }).
// Keeping F flat (not nested inside a field object) lets TypeScript resolve F[K] to the literal
// during contextual typing, so formatter/title parameter types are inferred precisely.
export function defineResource<
  const F extends Record<string, AnyTypeRef> = Record<never, AnyTypeRef>,
>(
  spec: Omit<ResourceSpec, 'fields' | 'title'> & {
    fields?: {
      [K in keyof F]: Omit<ResourceFieldDef, 'type' | 'list' | 'form'> & {
        type: F[K]
        list?: Omit<ResourceFieldDefList, 'formatter'> & {
          formatter?: (value: FieldTypeToTs<F[K]>) => string
        }
        form?: Omit<ResourceFieldDefForm, 'formatter'> & {
          formatter?: (value: FieldTypeToTs<F[K]>) => string
        }
      }
    }
    title?: (item: { [K in keyof F]: FieldTypeToTs<F[K]> }) => unknown
  },
): Omit<ResourceSpec, 'fields' | 'title'> & {
  fields?: { [K in keyof F]: Omit<ResourceFieldDef, 'type'> & { type: F[K] } }
  title?: (item: Record<string, unknown>) => string
} {
  return spec as Omit<ResourceSpec, 'fields' | 'title'> & {
    fields?: { [K in keyof F]: Omit<ResourceFieldDef, 'type'> & { type: F[K] } }
    title?: (item: Record<string, unknown>) => string
  }
}
