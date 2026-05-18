import { describe, it, expect, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import ResourceCreateView from '../../src/ui/ResourceCreateView.vue'
import ResourceEditView from '../../src/ui/ResourceEditView.vue'
import ResourceFormView from '../../src/ui/ResourceFormView.vue'
import { configureVuePrince } from '../../src/config'

const schema = [
  { name: 'name', type: 'string' },
  { name: 'status', type: 'enum', values: ['active', 'inactive'] },
]

const baseProps = {
  item: null,
  schema,
  labels: {},
  loading: false,
  error: null,
  resource: 'company',
}

const cardStub = {
  name: 'PrinceCard',
  props: ['title'],
  template: '<div><slot name="header"/><slot/><slot name="footer"/></div>',
}

describe('ResourceCreateView', () => {
  beforeEach(() => configureVuePrince({ api: { baseUrl: '' } }))

  it('renders without a page prop and shows the "Create {resource}" title', () => {
    const wrapper = mount(ResourceCreateView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toBe('Create Company')
  })

  it('passes page=CREATE to the inner ResourceFormView', () => {
    const wrapper = shallowMount(ResourceCreateView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    expect(wrapper.findComponent(ResourceFormView).props('page' as any)).toBe('CREATE')
  })

  it('forwards submit emits from the inner form view', async () => {
    const wrapper = shallowMount(ResourceCreateView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    await wrapper.findComponent(ResourceFormView).vm.$emit('submit', { name: 'Acme' })
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ name: 'Acme' }])
  })

  it('forwards cancel emits from the inner form view', async () => {
    const wrapper = shallowMount(ResourceCreateView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    await wrapper.findComponent(ResourceFormView).vm.$emit('cancel')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('passes hideActions through to the inner form view', () => {
    const wrapper = shallowMount(ResourceCreateView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: { ...baseProps, hideActions: true },
    })
    expect(wrapper.findComponent(ResourceFormView).props('hideActions' as any)).toBe(true)
  })
})

describe('ResourceEditView', () => {
  beforeEach(() => configureVuePrince({ api: { baseUrl: '' } }))

  it('renders without a page prop and shows the "Edit {resource}" title', () => {
    const wrapper = mount(ResourceEditView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    expect(wrapper.findComponent({ name: 'PrinceCard' }).props('title')).toBe('Edit Company')
  })

  it('passes page=EDIT to the inner ResourceFormView', () => {
    const wrapper = shallowMount(ResourceEditView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    expect(wrapper.findComponent(ResourceFormView).props('page' as any)).toBe('EDIT')
  })

  it('forwards submit emits from the inner form view', async () => {
    const wrapper = shallowMount(ResourceEditView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    await wrapper.findComponent(ResourceFormView).vm.$emit('submit', { name: 'Updated' })
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ name: 'Updated' }])
  })

  it('forwards cancel emits from the inner form view', async () => {
    const wrapper = shallowMount(ResourceEditView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    await wrapper.findComponent(ResourceFormView).vm.$emit('cancel')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('passes hideActions through to the inner form view', () => {
    const wrapper = shallowMount(ResourceEditView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: { ...baseProps, hideActions: true },
    })
    expect(wrapper.findComponent(ResourceFormView).props('hideActions' as any)).toBe(true)
  })
})

describe('ResourceCreateView and ResourceEditView parity', () => {
  beforeEach(() => configureVuePrince({ api: { baseUrl: '' } }))

  it('render identical inner form props apart from page/title', () => {
    const createWrapper = shallowMount(ResourceCreateView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })
    const editWrapper = shallowMount(ResourceEditView, {
      global: { stubs: { PrinceCard: cardStub } },
      props: baseProps,
    })

    const createForm = createWrapper.findComponent(ResourceFormView)
    const editForm = editWrapper.findComponent(ResourceFormView)

    const keys = [
      'item',
      'schema',
      'labels',
      'fields',
      'resource',
      'loading',
      'error',
      'itemTitle',
      'validationSchema',
      'hideActions',
    ] as const
    for (const key of keys) {
      expect(editForm.props(key)).toEqual(createForm.props(key))
    }

    expect(createForm.props('page' as any)).toBe('CREATE')
    expect(editForm.props('page' as any)).toBe('EDIT')
  })
})
