import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextField from '../../../src/ui/fields/TextField.vue'
import type { FieldPage } from '../../../src'

function mountField(page: FieldPage, value: unknown = '', overrides: Record<string, unknown> = {}) {
  return mount(TextField, {
    props: {
      value,
      label: 'Name',
      name: 'name',
      type: 'string',
      resource: 'company',
      page,
      ...overrides,
    },
  })
}

describe('TextField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field type class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--string')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('company--name')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Name')
    })
  })

  describe('editable (EDIT / CREATE)', () => {
    it('renders a text input on EDIT', () => {
      const wrapper = mountField('EDIT', 'hello')
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    })

    it('renders a text input on CREATE', () => {
      expect(mountField('CREATE').find('input[type="text"]').exists()).toBe(true)
    })

    it('input reflects the value', () => {
      const wrapper = mountField('EDIT', 'hello')
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('hello')
    })

    it('emits update:value when input changes', async () => {
      const wrapper = mountField('EDIT', '')
      await wrapper.find('input').setValue('world')
      expect(wrapper.emitted('update:value')?.[0]).toEqual(['world'])
    })
  })

  describe('display (LIST / VIEW)', () => {
    it('renders a span on LIST', () => {
      const wrapper = mountField('LIST', 'hello')
      expect(wrapper.find('span.field-value').text()).toBe('hello')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('renders a span on VIEW', () => {
      expect(mountField('VIEW', 'hello').find('span.field-value').exists()).toBe(true)
    })
  })

  describe('readOnly', () => {
    it('renders a span instead of input when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', 'hello', { readOnly: true })
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('span.field-value').exists()).toBe(true)
    })

    it('renders a span instead of input when readOnly on CREATE', () => {
      const wrapper = mountField('CREATE', '', { readOnly: true })
      expect(wrapper.find('input').exists()).toBe(false)
    })
  })
})
