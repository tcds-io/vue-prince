import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { configureVuePrince } from '../../src/config'
import ResourcePermissionWrapper from '../../src/pages/ResourcePermissionWrapper.vue'
import ResourcePermissionDeniedPage from '../../src/pages/ResourcePermissionDeniedPage.vue'

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({ back: vi.fn() })) }))

const SlotContent = { name: 'SlotContent', template: '<div class="content">OK</div>' }

// Simulates a Pinia store: returns the same reactive array reference each call.
function makePermissionsStore(initial: string[]) {
  const all = ref(initial)
  return { all, getAll: () => all.value }
}

function mountWrapper(
  permission: string | undefined,
  store: ReturnType<typeof makePermissionsStore>,
) {
  configureVuePrince({ baseUrl: '', userPermissions: () => store.getAll() })
  return mount(ResourcePermissionWrapper, {
    props: { permission },
    slots: { default: SlotContent },
    global: { stubs: { ResourcePermissionDeniedPage: true } },
  })
}

describe('ResourcePermissionWrapper', () => {
  beforeEach(() => {
    configureVuePrince({ baseUrl: '' })
  })

  it('renders the slot when no permission is required', () => {
    const store = makePermissionsStore([])
    const wrapper = mountWrapper(undefined, store)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(false)
  })

  it('renders the slot when the user has the required permission', () => {
    const store = makePermissionsStore(['admin', 'editor'])
    const wrapper = mountWrapper('admin', store)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
  })

  it('renders the denied page when the user lacks permission', () => {
    const store = makePermissionsStore(['editor'])
    const wrapper = mountWrapper('admin', store)
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(true)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(false)
  })

  it('allows access when userPermissions is not configured', () => {
    configureVuePrince({ baseUrl: '' })
    const wrapper = mount(ResourcePermissionWrapper, {
      props: { permission: 'admin' },
      slots: { default: SlotContent },
      global: { stubs: { ResourcePermissionDeniedPage: true } },
    })
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
  })

  it('reacts when permissions are granted at runtime', async () => {
    const store = makePermissionsStore([])
    const wrapper = mountWrapper('admin', store)
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(true)

    store.all.value = ['admin']
    await nextTick()

    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(false)
  })

  it('reacts when permissions are revoked at runtime', async () => {
    const store = makePermissionsStore(['admin'])
    const wrapper = mountWrapper('admin', store)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)

    store.all.value = []
    await nextTick()

    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(true)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(false)
  })
})
