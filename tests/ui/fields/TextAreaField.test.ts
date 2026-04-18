import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextAreaField from '../../../src/ui/fields/TextAreaField.vue'
import type { FieldPage } from '../../../src/field-props'

function mountField(page: FieldPage, value: unknown = '', overrides: Record<string, unknown> = {}) {
  return mount(TextAreaField, {
    props: {
      value,
      label: 'Bio',
      name: 'bio',
      type: 'text',
      resource: 'user',
      page,
      ...overrides,
    },
  })
}

describe('TextAreaField', () => {
  describe('wrapper CSS classes', () => {
    it('includes field type class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('field--text')
    })

    it('includes resource-field class', () => {
      expect(mountField('LIST').find('div').classes()).toContain('user--bio')
    })
  })

  describe('label', () => {
    it('renders the label', () => {
      expect(mountField('LIST').find('label').text()).toBe('Bio')
    })
  })

  describe('editable (EDIT / CREATE)', () => {
    it('renders a textarea on EDIT', () => {
      expect(mountField('EDIT', 'hello').find('textarea').exists()).toBe(true)
    })

    it('renders a textarea on CREATE', () => {
      expect(mountField('CREATE').find('textarea').exists()).toBe(true)
    })

    it('textarea reflects the value', () => {
      const wrapper = mountField('EDIT', 'hello')
      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('hello')
    })

    it('coerces null to empty string in textarea', () => {
      const wrapper = mountField('EDIT', null)
      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    })

    it('emits update:value when textarea changes', async () => {
      const wrapper = mountField('EDIT', '')
      await wrapper.find('textarea').setValue('world')
      expect(wrapper.emitted('update:value')?.[0]).toEqual(['world'])
    })
  })

  describe('display (LIST / VIEW)', () => {
    it('renders a span on LIST', () => {
      const wrapper = mountField('LIST', 'hello')
      expect(wrapper.find('span.field-value').text()).toBe('hello')
      expect(wrapper.find('textarea').exists()).toBe(false)
    })

    it('renders a span on VIEW', () => {
      expect(mountField('VIEW', 'hello').find('span.field-value').exists()).toBe(true)
    })
  })

  describe('readOnly', () => {
    it('renders a span instead of textarea when readOnly on EDIT', () => {
      const wrapper = mountField('EDIT', 'hello', { readOnly: true })
      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(wrapper.find('span.field-value').exists()).toBe(true)
    })
  })
})
