import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ResourceDetailView from '../../src/ui/ResourceDetailView.vue'
import { configureVuePrince } from '../../src/config'

const cardStub = {
  name: 'PrinceCard',
  props: ['title'],
  template: '<div><slot name="header"/><slot/><slot name="footer"/></div>',
}

const schema = [
  { name: 'id', type: 'integer' },
  { name: 'name', type: 'string' },
]

const item = { id: 1, name: 'Acme' }

function mountDetail(overrides: Record<string, unknown> = {}) {
  return shallowMount(ResourceDetailView, {
    global: { stubs: { PrinceCard: cardStub } },
    props: {
      item,
      schema,
      labels: {},
      loading: false,
      error: null,
      resource: 'company',
      ...overrides,
    },
  })
}

describe('ResourceDetailView', () => {
  beforeEach(() => configureVuePrince({ baseUrl: '' }))

  describe('loading state', () => {
    it('shows Loading… text', () => {
      expect(mountDetail({ loading: true }).text()).toContain('Loading')
    })

    it('does not render item fields while loading', () => {
      const wrapper = mountDetail({ loading: true })
      expect(wrapper.find('.prince-detail-body').exists()).toBe(false)
    })
  })

  describe('error state', () => {
    it('shows the error message', () => {
      expect(mountDetail({ error: 'Not found' }).text()).toContain('Failed to load Company')
    })

    it('does not render item fields on error', () => {
      const wrapper = mountDetail({ error: 'Not found' })
      expect(wrapper.find('.prince-detail-body').exists()).toBe(false)
    })
  })

  describe('item display', () => {
    it('renders the detail body when item is provided', () => {
      expect(mountDetail().find('.prince-detail-body').exists()).toBe(true)
    })

    it('renders a field component for each schema entry', () => {
      const wrapper = mountDetail()
      expect(wrapper.findAll('[name]')).toHaveLength(schema.length)
    })

    it('passes page=VIEW to each field component', () => {
      const wrapper = mountDetail()
      wrapper.findAllComponents({ name: 'TextField' }).forEach((f) => {
        expect(f.props('page')).toBe('VIEW')
      })
    })

    it('passes the correct value to each field', () => {
      const wrapper = mountDetail()
      const nameField = wrapper
        .findAllComponents({ name: 'TextField' })
        .find((f) => f.props('name') === 'name')
      expect(nameField?.props('value')).toBe('Acme')
    })

    it('does not render detail body when item is null', () => {
      const wrapper = mountDetail({ item: null })
      expect(wrapper.find('.prince-detail-body').exists()).toBe(false)
    })
  })

  describe('footer slot', () => {
    it('renders footer slot content', () => {
      const wrapper = mountDetail({})
      const withSlot = shallowMount(ResourceDetailView, {
        global: { stubs: { PrinceCard: cardStub } },
        props: { item, schema, labels: {}, loading: false, error: null, resource: 'company' },
        slots: { footer: '<button class="delete-btn">Delete</button>' },
      })
      expect(withSlot.find('.delete-btn').exists()).toBe(true)
      void wrapper
    })
  })

  describe('header title', () => {
    it('uses itemTitle when provided', () => {
      const wrapper = mountDetail({ itemTitle: 'Acme Corp' })
      expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toBe('Acme Corp')
    })

    it('falls back to "Resource id" when no itemTitle', () => {
      const wrapper = mountDetail()
      expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toContain('1')
    })

    it('falls back to capitalised resource name when item has no id', () => {
      const wrapper = mountDetail({ item: { name: 'Acme' }, itemTitle: undefined })
      const title = wrapper.findComponent({ name: 'PrinceCard' }).props('title') as string
      expect(title).toMatch(/company/i)
    })
  })
})
