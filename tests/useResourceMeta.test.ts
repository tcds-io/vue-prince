import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useResourceSchema, useResourceLabels, useResourceLabelMap } from '../src/pages/useResourceMeta'

vi.mock('vue-router', () => ({ useRoute: vi.fn() }))
vi.mock('../src/resource-api', () => ({ createResourceApi: vi.fn() }))

import { useRoute } from 'vue-router'
import { createResourceApi } from '../src/resource-api'

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

describe('useResourceLabelMap', () => {
  const companySpec = { name: 'company', path: '/companies', title: (i: any) => i.name }
  const specFields = { company_id: { type: companySpec } }

  function mockApi(data: unknown[]) {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data, meta: {} }),
    } as any)
  }

  beforeEach(() => {
    vi.mocked(createResourceApi).mockReset()
  })

  it('resolves labels from a batch API response', async () => {
    mockApi([
      { id: 1, name: 'Acme', _resource: 'company' },
      { id: 2, name: 'Beta', _resource: 'company' },
    ])
    const items = [
      { id: 10, company_id: 1, _resource: 'order' },
      { id: 11, company_id: 2, _resource: 'order' },
    ] as any[]
    const { labelMap } = useResourceLabelMap(() => items, () => specFields)
    await flushPromises()
    expect(labelMap.value['company_id']['1']).toBe('Acme')
    expect(labelMap.value['company_id']['2']).toBe('Beta')
  })

  it('passes unique IDs as comma-separated "id" param', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: {} })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const items = [
      { id: 1, company_id: 3, _resource: 'order' },
      { id: 2, company_id: 3, _resource: 'order' },
      { id: 3, company_id: 5, _resource: 'order' },
    ] as any[]
    useResourceLabelMap(() => items, () => specFields)
    await flushPromises()
    const calledWith = mockList.mock.calls[0][0] as Record<string, string>
    const ids = calledWith.id.split(',').map(Number).sort((a, b) => a - b)
    expect(ids).toEqual([3, 5])
  })

  it('skips fetch when items is empty', async () => {
    const mockList = vi.fn()
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    useResourceLabelMap(() => [], () => specFields)
    await flushPromises()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('skips fetch when spec has no resource-ref fields', async () => {
    const mockList = vi.fn()
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const plainFields = { name: { type: 'string' as const } }
    const items = [{ id: 1, name: 'foo', _resource: 'x' }] as any[]
    useResourceLabelMap(() => items, () => plainFields)
    await flushPromises()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('skips fetch when specFields is undefined', async () => {
    const mockList = vi.fn()
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const items = [{ id: 1, _resource: 'x' }] as any[]
    useResourceLabelMap(() => items, () => undefined)
    await flushPromises()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('falls back gracefully on network error', async () => {
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockRejectedValue(new Error('network error')),
    } as any)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const items = [{ id: 1, company_id: 9, _resource: 'order' }] as any[]
    const { labelMap } = useResourceLabelMap(() => items, () => specFields)
    await flushPromises()
    expect(labelMap.value['company_id']).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('company_id'),
      expect.any(Error),
    )
    warnSpy.mockRestore()
  })

  it('does not re-fetch IDs already cached when items change', async () => {
    const mockList = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Acme', _resource: 'company' }],
      meta: {},
    })
    vi.mocked(createResourceApi).mockReturnValue({ list: mockList } as any)
    const itemsRef = ref([{ id: 10, company_id: 1, _resource: 'order' }] as any[])
    useResourceLabelMap(() => itemsRef.value, () => specFields)
    await flushPromises()
    // same ID, different row
    itemsRef.value = [
      { id: 10, company_id: 1, _resource: 'order' },
      { id: 11, company_id: 1, _resource: 'order' },
    ] as any[]
    await flushPromises()
    expect(mockList).toHaveBeenCalledTimes(1)
  })

  it('uses String(item.id) as title when spec.title is absent', async () => {
    const specWithoutTitle = { name: 'tag', path: '/tags' }
    const fieldsWithoutTitle = { tag_id: { type: specWithoutTitle } }
    vi.mocked(createResourceApi).mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [{ id: 42, _resource: 'tag' }], meta: {} }),
    } as any)
    const items = [{ id: 1, tag_id: 42, _resource: 'post' }] as any[]
    const { labelMap } = useResourceLabelMap(() => items, () => fieldsWithoutTitle)
    await flushPromises()
    expect(labelMap.value['tag_id']['42']).toBe('42')
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
