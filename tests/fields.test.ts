import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureVuePrince } from '../src'
import {
  normalizeFieldType,
  toFieldLabel,
  slugify,
  resolveFieldComponent,
  buildResourceFieldProps,
  defaultFieldComponents,
  NumberField,
  TextField,
  TextAreaField,
  CheckboxField,
  DateTimeField,
  SelectField,
  ResourceField,
} from '../src/ui/fields'

describe('normalizeFieldType', () => {
  it.each(['integer', 'number', 'string', 'text', 'boolean', 'datetime', 'enum'] as const)(
    'passes through known type: %s',
    (type) => expect(normalizeFieldType(type)).toBe(type),
  )

  it('falls back to string for unknown types', () => {
    expect(normalizeFieldType('uuid')).toBe('string')
    expect(normalizeFieldType('json')).toBe('string')
    expect(normalizeFieldType('custom')).toBe('string')
  })

  it('falls back to string for null', () => {
    expect(normalizeFieldType(null)).toBe('string')
  })

  it('falls back to string for undefined', () => {
    expect(normalizeFieldType(undefined)).toBe('string')
  })
})

describe('toFieldLabel', () => {
  it('converts camelCase to title case', () => {
    expect(toFieldLabel('firstName')).toBe('First Name')
    expect(toFieldLabel('createdAt')).toBe('Created At')
    expect(toFieldLabel('companyName')).toBe('Company Name')
  })

  it('converts snake_case to title case', () => {
    expect(toFieldLabel('first_name')).toBe('First Name')
    expect(toFieldLabel('created_at')).toBe('Created At')
  })

  it('converts kebab-case to title case', () => {
    expect(toFieldLabel('first-name')).toBe('First Name')
  })

  it('handles a single word', () => {
    expect(toFieldLabel('name')).toBe('Name')
    expect(toFieldLabel('id')).toBe('Id')
  })

  it('returns empty string for empty input', () => {
    expect(toFieldLabel('')).toBe('')
  })

  it('returns empty string for null', () => {
    expect(toFieldLabel(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(toFieldLabel(undefined)).toBe('')
  })
})

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces underscores with hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
  })

  it('preserves numbers', () => {
    expect(slugify('Status 404')).toBe('status-404')
  })

  it('handles null', () => {
    expect(slugify(null)).toBe('')
  })

  it('handles undefined', () => {
    expect(slugify(undefined)).toBe('')
  })

  it('handles numbers as input', () => {
    expect(slugify(42)).toBe('42')
  })
})

describe('defaultFieldComponents', () => {
  it('maps integer and number to NumberField', () => {
    expect(defaultFieldComponents.integer).toBe(NumberField)
    expect(defaultFieldComponents.number).toBe(NumberField)
  })

  it('maps string to TextField', () => {
    expect(defaultFieldComponents.string).toBe(TextField)
  })

  it('maps text to TextAreaField', () => {
    expect(defaultFieldComponents.text).toBe(TextAreaField)
  })

  it('maps boolean to CheckboxField', () => {
    expect(defaultFieldComponents.boolean).toBe(CheckboxField)
  })

  it('maps datetime to DateTimeField', () => {
    expect(defaultFieldComponents.datetime).toBe(DateTimeField)
  })

  it('maps enum to SelectField', () => {
    expect(defaultFieldComponents.enum).toBe(SelectField)
  })
})

describe('resolveFieldComponent', () => {
  beforeEach(() => configureVuePrince({ baseUrl: '' }))

  it('returns the default component for each built-in type', () => {
    expect(resolveFieldComponent('integer')).toBe(NumberField)
    expect(resolveFieldComponent('string')).toBe(TextField)
    expect(resolveFieldComponent('text')).toBe(TextAreaField)
    expect(resolveFieldComponent('boolean')).toBe(CheckboxField)
    expect(resolveFieldComponent('datetime')).toBe(DateTimeField)
    expect(resolveFieldComponent('enum')).toBe(SelectField)
  })

  it('falls back to TextField for unknown type strings', () => {
    expect(resolveFieldComponent('uuid')).toBe(TextField)
  })

  it('returns ResourceField for a resource-ref type', () => {
    const refSpec = { name: 'user', path: '/api/users' }
    expect(resolveFieldComponent(refSpec)).toBe(ResourceField)
  })

  it('uses a custom component registered in config', () => {
    const MyField = {}
    configureVuePrince({ baseUrl: '', fields: { string: MyField as any } })
    expect(resolveFieldComponent('string')).toBe(MyField)
  })

  it('resolves form context from a split entry', () => {
    const FormComp = {}
    const DisplayComp = {}
    configureVuePrince({
      baseUrl: '',
      fields: { datetime: { form: FormComp as any, display: DisplayComp as any } },
    })
    expect(resolveFieldComponent('datetime', 'form')).toBe(FormComp)
    expect(resolveFieldComponent('datetime', 'display')).toBe(DisplayComp)
  })

  it('falls back to the other context when one is missing from a split entry', () => {
    const DisplayOnly = {}
    configureVuePrince({ baseUrl: '', fields: { string: { display: DisplayOnly as any } } })
    expect(resolveFieldComponent('string', 'form')).toBe(DisplayOnly)
  })

  it('uses a custom resource component when registered', () => {
    const MyResourceField = {}
    configureVuePrince({ baseUrl: '', fields: { resource: MyResourceField as any } })
    const refSpec = { name: 'user', path: '/api/users' }
    expect(resolveFieldComponent(refSpec)).toBe(MyResourceField)
  })
})

describe('buildResourceFieldProps', () => {
  beforeEach(() => configureVuePrince({ baseUrl: 'https://api.example.com' }))

  it('returns refSpec, search, fetchLabel, and title', () => {
    const refSpec = { name: 'user', path: '/api/users' }
    const props = buildResourceFieldProps(refSpec)
    expect(props.refSpec).toBe(refSpec)
    expect(typeof props.search).toBe('function')
    expect(typeof props.fetchLabel).toBe('function')
    expect(typeof props.title).toBe('function')
  })

  it('search calls the resource path with params', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: 1, name: 'Alice' }]),
    })
    const refSpec = { name: 'user', path: '/api/users', title: (u: any) => u.name }
    const { search } = buildResourceFieldProps(refSpec)
    const results = await search({ search: 'ali' })
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('/api/users')
    expect(url).toContain('search=ali')
    expect(results).toEqual([{ id: 1, label: 'Alice' }])
  })

  it('search handles enveloped { data: [] } responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: [{ id: 2, name: 'Bob' }] }),
    })
    const refSpec = { name: 'user', path: '/api/users', title: (u: any) => u.name }
    const { search } = buildResourceFieldProps(refSpec)
    const results = await search({ search: 'bo' })
    expect(results).toEqual([{ id: 2, label: 'Bob' }])
  })

  it('search returns [] on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network'))
    const refSpec = { name: 'user', path: '/api/users' }
    const { search } = buildResourceFieldProps(refSpec)
    const results = await search({ search: 'bo' })
    expect(results).toEqual([])
  })

  it('fetchLabel GETs /{id} and returns the title', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { id: 1, name: 'Alice' } }),
    })
    const refSpec = { name: 'user', path: '/api/users', title: (u: any) => u.name }
    const { fetchLabel } = buildResourceFieldProps(refSpec)
    const label = await fetchLabel(1)
    expect(label).toBe('Alice')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/users/1',
      expect.any(Object),
    )
  })

  it('fetchLabel handles bare (non-enveloped) responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: 1, name: 'Alice' }),
    })
    const refSpec = { name: 'user', path: '/api/users', title: (u: any) => u.name }
    const { fetchLabel } = buildResourceFieldProps(refSpec)
    expect(await fetchLabel(1)).toBe('Alice')
  })

  it('fetchLabel falls back to String(id) on error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network'))
    const { fetchLabel } = buildResourceFieldProps({ name: 'user', path: '/api/users' })
    expect(await fetchLabel(42)).toBe('42')
  })

  it('title defaults to String(item.id) when spec has no title', () => {
    const { title } = buildResourceFieldProps({ name: 'user', path: '/api/users' })
    expect(title({ id: 99 })).toBe('99')
  })
})
