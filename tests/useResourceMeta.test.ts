import { describe, it, expect, vi } from 'vitest'
import { useResourceSchema, useResourceLabels } from '../src/pages/useResourceMeta'

vi.mock('vue-router', () => ({ useRoute: vi.fn() }))

import { useRoute } from 'vue-router'

function makeRoute(spec?: Record<string, unknown>) {
  return { meta: { spec }, params: {}, query: {} } as any
}

describe('useResourceSchema', () => {
  it('uses spec field order when spec defines fields', () => {
    vi.mocked(useRoute).mockReturnValue(
      makeRoute({ fields: { name: { type: 'string' }, id: { type: 'integer' } } }),
    )
    const apiSchema = () => [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
    ]
    const schema = useResourceSchema(apiSchema)
    expect(schema.value.map((f) => f.name)).toEqual(['name', 'id'])
  })

  it('prefers the API-provided type when both spec and API define the field', () => {
    vi.mocked(useRoute).mockReturnValue(makeRoute({ fields: { id: { type: 'string' } } }))
    const apiSchema = () => [{ name: 'id', type: 'integer' }]
    const schema = useResourceSchema(apiSchema)
    expect(schema.value[0].type).toBe('integer')
  })

  it('falls back to spec type when API schema does not include the field', () => {
    vi.mocked(useRoute).mockReturnValue(makeRoute({ fields: { custom_flag: { type: 'boolean' } } }))
    const schema = useResourceSchema(() => [])
    expect(schema.value[0]).toEqual({ name: 'custom_flag', type: 'boolean' })
  })

  it('falls back to full API schema when spec has no fields', () => {
    vi.mocked(useRoute).mockReturnValue(makeRoute({}))
    const apiFields = [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
    ]
    const schema = useResourceSchema(() => apiFields)
    expect(schema.value).toEqual(apiFields)
  })

  it('previewOnly filters fields with list.show === false', () => {
    vi.mocked(useRoute).mockReturnValue(
      makeRoute({
        fields: {
          id: { type: 'integer', list: { show: false } },
          name: { type: 'string' },
        },
      }),
    )
    const apiSchema = () => [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
    ]
    const schema = useResourceSchema(apiSchema, { previewOnly: true })
    expect(schema.value.map((f) => f.name)).toEqual(['name'])
  })

  it('does not filter any fields when previewOnly is false', () => {
    vi.mocked(useRoute).mockReturnValue(
      makeRoute({
        fields: {
          id: { type: 'integer', list: { show: false } },
          name: { type: 'string' },
        },
      }),
    )
    const apiSchema = () => [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
    ]
    const schema = useResourceSchema(apiSchema, { previewOnly: false })
    expect(schema.value).toHaveLength(2)
  })

  it('keeps all fields when no list.show=false entries exist', () => {
    vi.mocked(useRoute).mockReturnValue(
      makeRoute({ fields: { id: { type: 'integer' }, name: { type: 'string' } } }),
    )
    const apiSchema = () => [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
    ]
    const schema = useResourceSchema(apiSchema, { previewOnly: true })
    expect(schema.value).toHaveLength(2)
  })
})

describe('useResourceLabels', () => {
  it('extracts label overrides from spec fields', () => {
    vi.mocked(useRoute).mockReturnValue(
      makeRoute({
        fields: {
          id: { type: 'integer' },
          company_name: { type: 'string', label: 'Name' },
          created_at: { type: 'datetime', label: 'Created' },
        },
      }),
    )
    const labels = useResourceLabels()
    expect(labels.value).toEqual({ company_name: 'Name', created_at: 'Created' })
  })

  it('returns empty object when no fields have labels', () => {
    vi.mocked(useRoute).mockReturnValue(
      makeRoute({ fields: { id: { type: 'integer' }, name: { type: 'string' } } }),
    )
    expect(useResourceLabels().value).toEqual({})
  })

  it('returns empty object when spec has no fields', () => {
    vi.mocked(useRoute).mockReturnValue(makeRoute({}))
    expect(useResourceLabels().value).toEqual({})
  })

  it('returns empty object when spec is undefined', () => {
    vi.mocked(useRoute).mockReturnValue(makeRoute(undefined))
    expect(useResourceLabels().value).toEqual({})
  })
})
