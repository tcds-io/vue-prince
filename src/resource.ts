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
type FieldTypeToTs<T extends SpecFieldType | ResourceSpec> = T extends ResourceSpec
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
  type: SpecFieldType | ResourceSpec
  values?: Array<string | number>
  label?: string
  list?: ResourceFieldDefList
  form?: ResourceFieldDefForm
}

export function isResourceRef(type: unknown): type is ResourceSpec {
  return typeof type === 'object' && type !== null && 'endpoints' in type && 'name' in type
}

export type ResourcePermissions = {
  create?: string
  read?: string
  update?: string
  delete?: string
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
  permissions?: ResourcePermissions
  title?: (item: T) => string
  components?: ResourcePageComponents
}

type DefinedFields<S extends ResourceSpec> = Exclude<S['fields'], undefined>

type ListVisibleKeys<F extends Record<string, ResourceFieldDef>> = {
  [K in keyof F]: F[K]['list'] extends { show: false } ? never : K
}[keyof F]

export type InferResourceModel<S extends ResourceSpec> =
  S['fields'] extends Record<string, ResourceFieldDef>
    ? { [K in keyof DefinedFields<S>]: FieldTypeToTs<DefinedFields<S>[K]['type']> }
    : Record<string, unknown>

export type InferResourceListModel<S extends ResourceSpec> =
  S['fields'] extends Record<string, ResourceFieldDef>
    ? { [K in ListVisibleKeys<DefinedFields<S>>]: FieldTypeToTs<DefinedFields<S>[K]['type']> }
    : Record<string, unknown>

// Input type used by defineResource — formatters are contextually typed from `type`.
type FieldDefInput<T extends SpecFieldType | ResourceSpec> = Omit<
  ResourceFieldDef,
  'type' | 'list' | 'form'
> & {
  type: T
  list?: Omit<ResourceFieldDefList, 'formatter'> & {
    formatter?: (value: FieldTypeToTs<T>) => string
  }
  form?: Omit<ResourceFieldDefForm, 'formatter'> & {
    formatter?: (value: FieldTypeToTs<T>) => string
  }
}

type AnyFieldBase = { type: SpecFieldType | ResourceSpec }

type FieldsToModel<F extends Record<string, AnyFieldBase> | undefined> =
  F extends Record<string, AnyFieldBase>
    ? { [K in keyof F]: FieldTypeToTs<F[K]['type']> }
    : Record<string, unknown>

export function hasPermission(spec: ResourceSpec, action: keyof ResourcePermissions): boolean {
  const required = spec.permissions?.[action]
  if (!required) return true
  const perms = getConfig().userPermissions?.()
  return perms ? perms.includes(required) : true
}

export function defineResource<
  // Default to Record<never, ...> so omitting `fields` is valid (F is inferred as empty).
  const F extends Record<string, AnyFieldBase> = Record<never, AnyFieldBase>,
  const S extends Omit<ResourceSpec, 'fields' | 'title'> = Omit<ResourceSpec, 'fields' | 'title'>,
>(
  spec: S & {
    // Direct mapped type (no conditional) so TypeScript can infer F via homomorphic inference.
    fields?: { [K in keyof F]: FieldDefInput<F[K]['type']> }
    title?: (item: FieldsToModel<F>) => string
  },
): S & { fields?: F; title?: (item: Record<string, unknown>) => string } {
  return spec as S & { fields?: F; title?: (item: Record<string, unknown>) => string }
}
