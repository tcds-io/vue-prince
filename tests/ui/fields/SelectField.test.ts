import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectField from '../../../src/ui/fields/SelectField.vue'
import type { FieldPage } from '../../../src/field-props'

function mountField(
  page: FieldPage,
  value: unknown = '',
  options: string[] = ['active', 'inactive', 'pending'],
  overrides: Record<string, unknown> = {},
) {
  return mount(SelectField, {
    props: {
      value,
      label: 'Status',
      name: 'status',
      type: 'enum',
      resource: 'order',
      page,
      options,
      ...overrides,
    },
  })
}

describe('SelectField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field type class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--enum')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('order--status')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Status')
    })
  })

  describe('editable (EDIT / CREATE)', () => {
    it('renders a select on EDIT', () => {
      expect(mountField('EDIT').find('select').exists()).toBe(true)
    })

    it('renders a select on CREATE', () => {
      expect(mountField('CREATE').find('select').exists()).toBe(true)
    })

    it('renders all options', () => {
      const wrapper = mountField('EDIT', '', ['active', 'inactive', 'pending'])
      const opts = wrapper.findAll('option')
      expect(opts).toHaveLength(3)
      expect(opts[0].text()).toBe('active')
      expect(opts[1].text()).toBe('inactive')
      expect(opts[2].text()).toBe('pending')
    })

    it('emits update:value when selection changes', async () => {
      const wrapper = mountField('EDIT', 'active')
      await wrapper.find('select').setValue('inactive')
      expect(wrapper.emitted('update:value')?.[0]).toEqual(['inactive'])
    })
  })

  describe('display (LIST / VIEW)', () => {
    it('renders a span on LIST', () => {
      const wrapper = mountField('LIST', 'active')
      expect(wrapper.find('span.enum').text()).toBe('active')
      expect(wrapper.find('select').exists()).toBe(false)
    })

    it('renders a span on VIEW', () => {
      expect(mountField('VIEW', 'pending').find('span.enum').exists()).toBe(true)
    })

    it('adds slugified enum class to the span', () => {
      const wrapper = mountField('LIST', 'In Progress', ['In Progress', 'Done'])
      expect(wrapper.find('span').classes()).toContain('enum--in-progress')
    })
  })

  describe('readOnly', () => {
    it('renders a span instead of select when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', 'active', ['active'], { readOnly: true })
      expect(wrapper.find('select').exists()).toBe(false)
      expect(wrapper.find('span.enum').exists()).toBe(true)
    })
  })
})
