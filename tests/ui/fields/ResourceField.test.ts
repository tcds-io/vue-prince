import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ResourceField from '../../../src/ui/fields/ResourceField.vue'
import type { FieldPage } from '../../../src/field-props'
import type { ResourceSpec } from '../../../src/resource'

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ resolve: (path: string) => ({ href: path }) })),
  RouterLink: { name: 'RouterLink', props: ['to'], template: '<a :href="to"><slot /></a>' },
}))

const refSpec: ResourceSpec = { name: 'user', route: '/users', api: () => ({}) as any }

function makeMockSearch(results = [{ id: 1, label: 'Alice' }]) {
  return vi.fn().mockResolvedValue(results)
}

function makeMockFetchLabel(label = 'Alice') {
  return vi.fn().mockResolvedValue(label)
}

function mountField(
  page: FieldPage,
  value: number | null = null,
  overrides: Record<string, unknown> = {},
) {
  return mount(ResourceField, {
    props: {
      value,
      label: 'Owner',
      name: 'owner_id',
      type: 'resource',
      resource: 'order',
      page,
      refSpec,
      search: makeMockSearch(),
      fetchLabel: makeMockFetchLabel(),
      title: (item: any) => item.name,
      ...overrides,
    },
  })
}

describe('ResourceField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field--resource class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--resource')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('order--owner_id')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Owner')
    })
  })

  describe('display mode (LIST / VIEW)', () => {
    it('renders an open-link anchor with the resource URL', () => {
      const wrapper = mountField('LIST', 42)
      const link = wrapper.find('a.open-link')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('/users/42') // route + '/' + value
      expect(link.attributes('target')).toBe('_blank')
    })

    it('renders em dash when value is null', () => {
      const wrapper = mountField('LIST', null)
      expect(wrapper.find('span.field-value').text()).toBe('—')
      expect(wrapper.find('a.open-link').exists()).toBe(false)
    })

    it('does not render an input in display mode', () => {
      expect(mountField('VIEW', 1).find('input').exists()).toBe(false)
    })

    it('loads and shows the label via fetchLabel in display mode', async () => {
      const fetchLabel = vi.fn().mockResolvedValue('Alice')
      const wrapper = mountField('VIEW', 42, { fetchLabel })
      await flushPromises()
      expect(fetchLabel).toHaveBeenCalledWith(42)
      expect(wrapper.find('span.field-value').text()).toContain('Alice')
    })
  })

  describe('editable mode (EDIT / CREATE)', () => {
    it('renders a text input', () => {
      expect(mountField('EDIT').find('input[type="text"]').exists()).toBe(true)
    })

    it('does not render a RouterLink in editable mode', () => {
      expect(mountField('EDIT', 1).find('a').exists()).toBe(false)
    })

    it('initializes the label via fetchLabel on mount when value is set', async () => {
      const fetchLabel = vi.fn().mockResolvedValue('Alice')
      mountField('EDIT', 42, { fetchLabel })
      await flushPromises()
      expect(fetchLabel).toHaveBeenCalledWith(42)
    })

    it('does not call fetchLabel on mount when value is null', async () => {
      const fetchLabel = vi.fn().mockResolvedValue('Alice')
      mountField('EDIT', null, { fetchLabel })
      await flushPromises()
      expect(fetchLabel).not.toHaveBeenCalled()
    })
  })

  describe('readOnly', () => {
    it('renders open-link instead of input when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', 5, { readOnly: true })
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('a.open-link').exists()).toBe(true)
    })
  })

  describe('autocomplete search', () => {
    it('shows options list after input triggers search', async () => {
      const search = vi.fn().mockResolvedValue([
        { id: 1, label: 'Alice' },
        { id: 2, label: 'Bob' },
      ])
      const wrapper = mountField('EDIT', null, { search })
      const input = wrapper.find('input')
      await input.setValue('al')
      await input.trigger('input')
      await flushPromises()
      await new Promise((r) => setTimeout(r, 350))
      await flushPromises()
      const items = wrapper.findAll('li')
      expect(items).toHaveLength(2)
      expect(items[0].text()).toBe('Alice')
      expect(items[1].text()).toBe('Bob')
    })

    it('emits update:value when an option is selected', async () => {
      const search = vi.fn().mockResolvedValue([{ id: 7, label: 'Carol' }])
      const wrapper = mountField('EDIT', null, { search })
      const input = wrapper.find('input')
      await input.setValue('ca')
      await input.trigger('input')
      await flushPromises()
      await new Promise((r) => setTimeout(r, 350))
      await flushPromises()
      await wrapper.find('li').trigger('mousedown')
      expect(wrapper.emitted('update:value')?.[0]).toEqual([7])
    })
  })
})
