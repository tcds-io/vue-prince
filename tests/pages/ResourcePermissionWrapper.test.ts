import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { configureVuePrince } from '../../src/config'
import ResourcePermissionWrapper from '../../src/pages/ResourcePermissionWrapper.vue'
import ResourcePermissionDeniedPage from '../../src/pages/ResourcePermissionDeniedPage.vue'

vi.mock('vue-router', () => ({ useRoute: vi.fn(), useRouter: vi.fn(() => ({ back: vi.fn() })) }))
vi.mock('../../src/resource-controller', () => ({ createResourceController: vi.fn() }))
import { useRoute } from 'vue-router'
import { createResourceController } from '../../src/resource-controller'

const SlotContent = { name: 'SlotContent', template: '<div class="content">OK</div>' }
const SPEC = { name: 'test', route: '/test', api: () => ({}) as any }

// Simulates reactive userPermissions that can be mutated at runtime
function makePermissionsStore(initial: string[]) {
  const all = ref(initial)
  return { all, getAll: () => all.value }
}

function makeStore(schemaPermissions: Record<string, string> = {}) {
  return reactive({
    schemaPermissions,
    schemaLoaded: true,
    loading: false,
    fetchSchema: vi.fn(),
  })
}

function mountWrapper(
  action: 'read' | 'create' | 'update' | 'delete' | undefined,
  permsStore: ReturnType<typeof makePermissionsStore>,
  schemaPermissions: Record<string, string> = {},
) {
  configureVuePrince({ api: { baseUrl: '' }, userPermissions: () => permsStore.getAll() })
  vi.mocked(useRoute).mockReturnValue({ meta: { spec: SPEC } } as any)
  vi.mocked(createResourceController).mockReturnValue({
    store: () => makeStore(schemaPermissions),
  } as any)
  return mount(ResourcePermissionWrapper, {
    props: { action },
    slots: { default: SlotContent },
    global: { stubs: { ResourcePermissionDeniedPage: true } },
  })
}

describe('ResourcePermissionWrapper', () => {
  beforeEach(() => {
    configureVuePrince({ api: { baseUrl: '' } })
  })

  it('renders the slot when no action is required', () => {
    const permsStore = makePermissionsStore([])
    const wrapper = mountWrapper(undefined, permsStore)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(false)
  })

  it('renders the slot when the user has the required permission', () => {
    const permsStore = makePermissionsStore(['admin', 'editor'])
    const wrapper = mountWrapper('read', permsStore, { read: 'admin' })
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
  })

  it('renders the denied page when the user lacks permission', () => {
    const permsStore = makePermissionsStore(['editor'])
    const wrapper = mountWrapper('read', permsStore, { read: 'admin' })
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(true)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(false)
  })

  it('allows access when userPermissions is not configured', () => {
    configureVuePrince({ api: { baseUrl: '' } })
    vi.mocked(useRoute).mockReturnValue({ meta: { spec: SPEC } } as any)
    vi.mocked(createResourceController).mockReturnValue({
      store: () => makeStore({ read: 'admin' }),
    } as any)
    const wrapper = mount(ResourcePermissionWrapper, {
      props: { action: 'read' },
      slots: { default: SlotContent },
      global: { stubs: { ResourcePermissionDeniedPage: true } },
    })
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
  })

  it('reacts when permissions are granted at runtime', async () => {
    const permsStore = makePermissionsStore([])
    const wrapper = mountWrapper('read', permsStore, { read: 'admin' })
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(true)

    permsStore.all.value = ['admin']
    await nextTick()

    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)
    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(false)
  })

  it('reacts when permissions are revoked at runtime', async () => {
    const permsStore = makePermissionsStore(['admin'])
    const wrapper = mountWrapper('read', permsStore, { read: 'admin' })
    expect(wrapper.findComponent(SlotContent).exists()).toBe(true)

    permsStore.all.value = []
    await nextTick()

    expect(wrapper.findComponent(ResourcePermissionDeniedPage).exists()).toBe(true)
    expect(wrapper.findComponent(SlotContent).exists()).toBe(false)
  })
})
