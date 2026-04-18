import type { Component } from 'vue'

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

export type ResourceFieldDefList = {
  show?: boolean
  align?: 'left' | 'center' | 'right'
  width?: number
  formatter?: (value: unknown) => string
}
export type ResourceFieldDefForm = {
  readOnly?: boolean
}

export type ResourceFieldDef = {
  type: SpecFieldType | ResourceSpec
  values?: Array<string | number>
  label?: string
  list?: ResourceFieldDefList
  form?: ResourceFieldDefForm
}

export function isResourceRef(type: unknown): type is ResourceSpec {
  return typeof type === 'object' && type !== null && 'path' in type && 'name' in type
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
  search?: Component
}

export type ResourceSpec<T = Record<string, unknown>> = {
  name: string
  path: string
  fields?: Record<string, ResourceFieldDef>
  permissions?: ResourcePermissions
  title?: (item: T) => string
  components?: ResourcePageComponents
}

type FieldTypeToTs<T extends SpecFieldType | ResourceSpec> = T extends ResourceSpec
  ? number
  : T extends SpecFieldType
    ? SpecFieldTypeToTs[T]
    : number

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

type FieldsToModel<F extends Record<string, ResourceFieldDef> | undefined> =
  F extends Record<string, ResourceFieldDef>
    ? { [K in keyof F]: FieldTypeToTs<F[K]['type']> }
    : Record<string, unknown>

export function defineResource<
  const F extends Record<string, ResourceFieldDef> | undefined = undefined,
  const S extends Omit<ResourceSpec, 'fields' | 'title'> = Omit<ResourceSpec, 'fields' | 'title'>,
>(
  spec: S & { fields?: F; title?: (item: FieldsToModel<F>) => string },
): S & { fields?: F; title?: (item: Record<string, unknown>) => string } {
  return spec as S & { fields?: F; title?: (item: Record<string, unknown>) => string }
}
