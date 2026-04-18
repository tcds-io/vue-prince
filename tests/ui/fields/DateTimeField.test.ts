import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateTimeField from '../../../src/ui/fields/DateTimeField.vue'
import type { FieldPage } from '../../../src/field-props'

function mountField(page: FieldPage, value: unknown = '', overrides: Record<string, unknown> = {}) {
  return mount(DateTimeField, {
    props: {
      value,
      label: 'Created At',
      name: 'created_at',
      type: 'datetime',
      resource: 'order',
      page,
      ...overrides,
    },
  })
}

describe('DateTimeField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field type class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--datetime')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('order--created_at')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Created At')
    })
  })

  describe('editable (EDIT / CREATE)', () => {
    it('renders a datetime-local input on EDIT', () => {
      expect(mountField('EDIT').find('input[type="datetime-local"]').exists()).toBe(true)
    })

    it('renders a datetime-local input on CREATE', () => {
      expect(mountField('CREATE').find('input[type="datetime-local"]').exists()).toBe(true)
    })

    it('slices ISO string to 16 chars for the input value', () => {
      const wrapper = mountField('EDIT', '2024-06-15T14:30:00.000Z')
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('2024-06-15T14:30')
    })

    it('sets empty string for null value', () => {
      const wrapper = mountField('EDIT', null)
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    })

    it('emits update:value when input changes', async () => {
      const wrapper = mountField('EDIT', '')
      await wrapper.find('input').setValue('2024-06-15T14:30')
      expect(wrapper.emitted('update:value')?.[0]).toEqual(['2024-06-15T14:30'])
    })
  })

  describe('display (LIST / VIEW)', () => {
    it('renders a span on LIST', () => {
      const wrapper = mountField('LIST', '2024-06-15T14:30:00')
      expect(wrapper.find('span.field-value').text()).toBe('2024-06-15T14:30:00')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('renders a span on VIEW', () => {
      expect(mountField('VIEW', '2024-06-15').find('span.field-value').exists()).toBe(true)
    })
  })

  describe('readOnly', () => {
    it('renders a span instead of input when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', '2024-06-15', { readOnly: true })
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('span.field-value').exists()).toBe(true)
    })
  })
})
