import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberField from '../../../src/ui/fields/NumberField.vue'
import type { FieldPage } from '../../../src/field-props'

function mountField(page: FieldPage, value: unknown = 0, overrides: Record<string, unknown> = {}) {
  return mount(NumberField, {
    props: {
      value,
      label: 'Amount',
      name: 'amount',
      type: 'number',
      resource: 'order',
      page,
      ...overrides,
    },
  })
}

describe('NumberField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field type class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--number')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('order--amount')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Amount')
    })
  })

  describe('editable (EDIT / CREATE)', () => {
    it('renders a number input on EDIT', () => {
      expect(mountField('EDIT', 42).find('input[type="number"]').exists()).toBe(true)
    })

    it('renders a number input on CREATE', () => {
      expect(mountField('CREATE').find('input[type="number"]').exists()).toBe(true)
    })

    it('input reflects the value', () => {
      const wrapper = mountField('EDIT', 99)
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('99')
    })

    it('emits update:value as a Number when input changes', async () => {
      const wrapper = mountField('EDIT', 0)
      await wrapper.find('input').setValue('42')
      expect(wrapper.emitted('update:value')?.[0]).toEqual([42])
    })
  })

  describe('display (LIST / VIEW)', () => {
    it('renders a span on LIST', () => {
      const wrapper = mountField('LIST', 7)
      expect(wrapper.find('span.field-value').text()).toBe('7')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('renders a span on VIEW', () => {
      expect(mountField('VIEW', 7).find('span.field-value').exists()).toBe(true)
    })
  })

  describe('readOnly', () => {
    it('renders a span instead of input when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', 5, { readOnly: true })
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('span.field-value').exists()).toBe(true)
    })
  })
})
