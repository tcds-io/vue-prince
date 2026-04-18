import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CheckboxField from '../../../src/ui/fields/CheckboxField.vue'
import type { FieldPage } from '../../../src/field-props'

function mountField(
  page: FieldPage,
  value: unknown = false,
  overrides: Record<string, unknown> = {},
) {
  return mount(CheckboxField, {
    props: {
      value,
      label: 'Active',
      name: 'active',
      type: 'boolean',
      resource: 'user',
      page,
      ...overrides,
    },
  })
}

describe('CheckboxField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field type class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--boolean')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('user--active')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Active')
    })
  })

  describe('editable (EDIT / CREATE)', () => {
    it('renders a checkbox on EDIT', () => {
      expect(mountField('EDIT').find('input[type="checkbox"]').exists()).toBe(true)
    })

    it('renders a checkbox on CREATE', () => {
      expect(mountField('CREATE').find('input[type="checkbox"]').exists()).toBe(true)
    })

    it('checkbox is checked when value is true', () => {
      const wrapper = mountField('EDIT', true)
      expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
    })

    it('checkbox is unchecked when value is false', () => {
      const wrapper = mountField('EDIT', false)
      expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
    })

    it('emits update:value when checkbox is toggled', async () => {
      const wrapper = mountField('EDIT', false)
      await wrapper.find('input').setValue(true)
      expect(wrapper.emitted('update:value')?.[0]).toEqual([true])
    })
  })

  describe('display (LIST / VIEW)', () => {
    it('renders ✓ span when value is true on LIST', () => {
      const wrapper = mountField('LIST', true)
      expect(wrapper.find('span').text()).toBe('✓')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('renders ✗ span when value is false on LIST', () => {
      expect(mountField('LIST', false).find('span').text()).toBe('✗')
    })

    it('adds boolean--true class when true', () => {
      expect(mountField('VIEW', true).find('span').classes()).toContain('boolean--true')
    })

    it('adds boolean--false class when false', () => {
      expect(mountField('VIEW', false).find('span').classes()).toContain('boolean--false')
    })
  })

  describe('readOnly', () => {
    it('renders a span instead of checkbox when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', true, { readOnly: true })
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('span').exists()).toBe(true)
    })
  })
})
