import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceFormView from '../../src/ui/ResourceFormView.vue'
import { configureVuePrince } from '../../src/config'

// PrinceCard stub that renders all named slots so buttons are accessible
const cardStub = {
  name: 'PrinceCard',
  props: ['title'],
  template: '<div><slot name="header"/><slot/><slot name="footer"/></div>',
}

const schema = [
  { name: 'name', type: 'string' },
  { name: 'status', type: 'enum', values: ['active', 'inactive'] },
]

function mountForm(overrides: Record<string, unknown> = {}) {
  return shallowMount(ResourceFormView, {
    global: { stubs: { PrinceCard: cardStub } },
    props: {
      item: null,
      schema,
      labels: {},
      loading: false,
      error: null,
      page: 'CREATE' as const,
      resource: 'company',
      ...overrides,
    },
  })
}

describe('ResourceFormView', () => {
  beforeEach(() => configureVuePrince({ api: { baseUrl: '' } }))

  describe('loading state', () => {
    it('shows Loading… text', () => {
      const wrapper = mountForm({ loading: true })
      expect(wrapper.text()).toContain('Loading')
    })

    it('does not render the form', () => {
      const wrapper = mountForm({ loading: true })
      expect(wrapper.find('form').exists()).toBe(false)
    })
  })

  describe('error state', () => {
    it('shows a friendly error message', () => {
      const wrapper = mountForm({ error: 'Server error' })
      expect(wrapper.text()).toContain('Failed to create Company')
    })

    it('still renders the form', () => {
      const wrapper = mountForm({ error: 'Server error' })
      expect(wrapper.find('form').exists()).toBe(true)
    })
  })

  describe('CREATE mode', () => {
    it('renders the form', () => {
      const wrapper = mountForm()
      expect(wrapper.find('form').exists()).toBe(true)
    })

    it('renders a field component for each schema entry', () => {
      const wrapper = mountForm()
      // each field renders as a stub
      expect(wrapper.findAll('[name]')).toHaveLength(schema.length)
    })

    it('emits submit with collected formData on form submit', async () => {
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')?.[0][0]).toEqual({ name: undefined, status: undefined })
    })

    it('emits cancel when cancel is triggered', async () => {
      const wrapper = mountForm()
      // Cancel button is the first PrinceButton; @click is wired to emit('cancel')
      await wrapper.findComponent({ name: 'PrinceButton' }).vm.$emit('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('EDIT mode', () => {
    const item = { id: 1, name: 'Acme', status: 'active' }

    it('pre-fills formData from item prop', async () => {
      const wrapper = mountForm({ page: 'EDIT', item })
      await flushPromises()
      const emittedSubmit = async () => {
        await wrapper.find('form').trigger('submit')
        return wrapper.emitted('submit')?.[0][0] as Record<string, unknown>
      }
      const data = await emittedSubmit()
      expect(data.name).toBe('Acme')
      expect(data.status).toBe('active')
    })

    it('passes page=EDIT to each field', () => {
      const wrapper = mountForm({ page: 'EDIT', item })
      const fields = wrapper
        .findAllComponents({ name: 'TextField' })
        .concat(wrapper.findAllComponents({ name: 'SelectField' }))
      fields.forEach((f) => expect(f.props('page')).toBe('EDIT'))
    })
  })

  describe('header title', () => {
    it('shows "Create {resource}" in CREATE mode', () => {
      const wrapper = mountForm()
      expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toBe('Create Company')
    })

    it('shows "Edit {resource}" in EDIT mode', () => {
      const wrapper = mountForm({ page: 'EDIT', item: { id: 1 }, itemTitle: 'Acme Corp' })
      expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toBe('Edit Company')
    })

    it('shows "Edit {resource}" in EDIT mode without itemTitle', () => {
      const wrapper = mountForm({ page: 'EDIT', item: { id: 5 } })
      expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toBe('Edit Company')
    })
  })
})
