import type { Component } from 'vue'
import type { ResourceSpec, SpecFieldType } from '../../resource'
import { isResourceRef, resolveFieldType } from '../../resource'
import type { ResourceFieldDef } from '../../resource'
import type { FieldComponentEntry } from '../../config'
import { getConfig } from '../../config'
import type { ResourceOption } from '../../field-props'
import NumberField from './NumberField.vue'
import TextField from './TextField.vue'
import TextAreaField from './TextAreaField.vue'
import CheckboxField from './CheckboxField.vue'
import DateTimeField from './DateTimeField.vue'
import SelectField from './SelectField.vue'
import ResourceField from './ResourceField.vue'

export {
  NumberField,
  TextField,
  TextAreaField,
  CheckboxField,
  DateTimeField,
  SelectField,
  ResourceField,
}

export type FieldContext = 'form' | 'display'

export const defaultFieldComponents: Record<SpecFieldType, Component> = {
  integer: NumberField,
  number: NumberField,
  string: TextField,
  text: TextAreaField,
  boolean: CheckboxField,
  datetime: DateTimeField,
  enum: SelectField,
}

const knownFieldTypes = new Set<string>(Object.keys(defaultFieldComponents))

export function normalizeFieldType(type: string | null | undefined): SpecFieldType {
  return (type && knownFieldTypes.has(type) ? type : 'string') as SpecFieldType
}

export function toFieldLabel(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → words
    .replace(/[_-]+/g, ' ') // snake_case / kebab-case → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalise each word
    .trim()
}

export function slugify(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function resolveEntry(entry: FieldComponentEntry, context: FieldContext): Component | undefined {
  if (typeof entry === 'object' && ('form' in entry || 'display' in entry)) {
    const keyed = entry as { form?: Component; display?: Component }
    return context === 'form' ? (keyed.form ?? keyed.display) : (keyed.display ?? keyed.form)
  }
  return entry as Component
}

async function fetchJson(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  const body = (await res.json()) as Record<string, unknown>
  return (Array.isArray(body) ? body : ((body.data ?? []) as unknown[])) as Record<
    string,
    unknown
  >[]
}

/**
 * Builds the search/title/fetchLabel props for AutocompleteFieldProps.
 * Pass the result as v-bind to any field component that handles a resource ref.
 */
export function buildResourceFieldProps(refSpec: ResourceSpec) {
  const baseUrl = getConfig().baseUrl
  const titleFn = refSpec.title ?? ((item: Record<string, unknown>) => String(item.id))

  const search = async (params: Record<string, string>): Promise<ResourceOption[]> => {
    try {
      const qs = new URLSearchParams(params).toString()
      const items = await fetchJson(`${baseUrl}${refSpec.endpoints.api}?${qs}`)
      return items.map((item) => ({ id: item.id as number, label: titleFn(item) }))
    } catch {
      return []
    }
  }

  const fetchLabel = async (id: number): Promise<string> => {
    try {
      const res = await fetch(`${baseUrl}${refSpec.endpoints.api}/${id}`, {
        headers: { 'Content-Type': 'application/json' },
      })
      const body = (await res.json()) as Record<string, unknown>
      const item = (body.data ?? body) as Record<string, unknown>
      return titleFn(item)
    } catch {
      return String(id)
    }
  }

  return { refSpec, search, title: titleFn, fetchLabel }
}

export function resolveFieldComponent(
  type: ResourceFieldDef['type'] | string | null | undefined,
  context: FieldContext = 'display',
): Component {
  const resolved =
    type != null && typeof type !== 'string'
      ? resolveFieldType(type as ResourceFieldDef['type'])
      : type
  if (isResourceRef(resolved)) {
    const entry = (getConfig().fields ?? {})['resource']
    return (entry && resolveEntry(entry, context)) ?? ResourceField
  }
  const normalized = normalizeFieldType(resolved as string | null | undefined)
  const entry = (getConfig().fields ?? {})[normalized]
  if (entry) return resolveEntry(entry, context) ?? defaultFieldComponents[normalized]
  return defaultFieldComponents[normalized]
}
