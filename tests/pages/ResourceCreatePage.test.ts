import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceCreatePage from '../../src/pages/ResourceCreatePage.vue'
import ResourceCreateView from '../../src/ui/ResourceCreateView.vue'
import { configureVuePrince } from '../../src/config'

vi.mock('vue-router', () => ({ useRoute: vi.fn(), useRouter: vi.fn() }))
vi.mock('../../src/resource-controller', () => ({ createResourceController: vi.fn() }))
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../../src/resource-controller'

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    items: [],
    itemsMeta: null,
    itemsById: {} as Record<string | number, unknown>,
    item: null,
    itemMeta: null,
    schemaFields: [] as unknown[],
    schemaPermissions: {} as Record<string, string>,
    schemaLoaded: true,
    loading: {
      schema: false,
      list: false,
      get: false,
      create: false,
      update: false,
      remove: false,
      createMany: false,
      updateMany: false,
      removeMany: false,
    },
    error: null as string | null,
    fetchSchema: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 5 }),
    update: vi.fn().mockResolvedValue({ id: 5 }),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CustomCreate = defineComponent({ name: 'CustomCreate', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  route: '/companies',
  api: () => ({}) as any,
  fields: { name: { type: 'string' as const } },
}

describe('ResourceCreatePage', () => {
  let store: ReturnType<typeof makeStore>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    configureVuePrince({ api: { baseUrl: '' } })
    store = makeStore()
    mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(createResourceController).mockReturnValue({ store: () => store, api: {} } as any)
  })

  function mountPage(spec: any = BASE_SPEC) {
    vi.mocked(useRoute).mockReturnValue({
      meta: { spec },
      params: {},
      query: {},
    } as any)
    return shallowMount(ResourceCreatePage)
  }

  describe('on mount', () => {
    it('does not call fetchSchema when spec has fields', async () => {
      mountPage()
      await flushPromises()
      expect(store.fetchSchema).not.toHaveBeenCalled()
    })

    it('calls fetchSchema when spec has no fields', async () => {
      mountPage({ name: 'company', route: '/companies', api: () => ({}) as any })
      await flushPromises()
      expect(store.fetchSchema).toHaveBeenCalled()
    })
  })

  describe('default rendering', () => {
    it('renders ResourceCreateView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceCreateView).exists()).toBe(true)
    })

    it('does not render custom component', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(CustomCreate).exists()).toBe(false)
    })

    it('passes null item to ResourceCreateView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceCreateView).props('item' as any)).toBeNull()
    })

    it('passes loading state to ResourceCreateView', () => {
      store.loading.create = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceCreateView).props('loading' as any)).toBe(true)
    })

    it('passes error to ResourceCreateView', () => {
      store.error = 'fail'
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceCreateView).props('error' as any)).toBe('fail')
    })

    it('submit event calls store.create and navigates to detail', async () => {
      const wrapper = mountPage()
      await flushPromises()
      await wrapper.findComponent(ResourceCreateView).vm.$emit('submit', { name: 'Acme' })
      expect(store.create).toHaveBeenCalledWith({ name: 'Acme' })
      await flushPromises()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '5' } })
    })

    it('cancel event navigates to list', async () => {
      const wrapper = mountPage()
      await wrapper.findComponent(ResourceCreateView).vm.$emit('cancel')
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-list' })
    })
  })

  describe('layout.pages.create fallback', () => {
    const FallbackCreate = defineComponent({ name: 'FallbackCreate', template: '<div />' })

    it('renders fallback component from config when spec has no override', () => {
      configureVuePrince({ api: { baseUrl: '' }, layout: { pages: { create: FallbackCreate } } })
      const wrapper = mountPage()
      expect(wrapper.findComponent(FallbackCreate).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceCreateView).exists()).toBe(false)
    })

    it('passes the same props as a per-resource override would', () => {
      store.error = 'oops'
      configureVuePrince({ api: { baseUrl: '' }, layout: { pages: { create: FallbackCreate } } })
      const wrapper = mountPage()
      const attrs = wrapper.findComponent(FallbackCreate).vm.$attrs as any
      expect(attrs.resource).toBe('company')
      expect(attrs.error).toBe('oops')
      expect(typeof attrs.submit).toBe('function')
      expect(typeof attrs.cancel).toBe('function')
    })

    it('per-resource spec.components.create wins over layout.pages.create', () => {
      configureVuePrince({ api: { baseUrl: '' }, layout: { pages: { create: FallbackCreate } } })
      const wrapper = mountPage({ ...BASE_SPEC, components: { create: CustomCreate } })
      expect(wrapper.findComponent(CustomCreate).exists()).toBe(true)
      expect(wrapper.findComponent(FallbackCreate).exists()).toBe(false)
    })
  })

  describe('custom create component', () => {
    function mountCustom() {
      return mountPage({ ...BASE_SPEC, components: { create: CustomCreate } })
    }

    it('renders custom component instead of ResourceCreateView', () => {
      const wrapper = mountCustom()
      expect(wrapper.findComponent(CustomCreate).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceCreateView).exists()).toBe(false)
    })

    it('submit calls store.create and navigates to detail', async () => {
      const wrapper = mountCustom()
      await flushPromises()
      const { submit } = wrapper.findComponent(CustomCreate).vm.$attrs as any
      await submit({ name: 'Acme' })
      expect(store.create).toHaveBeenCalledWith({ name: 'Acme' })
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '5' } })
    })

    it('submit does not navigate if create returns null', async () => {
      store.create = vi.fn().mockResolvedValue(null)
      const wrapper = mountCustom()
      await flushPromises()
      const { submit } = wrapper.findComponent(CustomCreate).vm.$attrs as any
      await submit({ name: 'Acme' })
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('cancel navigates to list', () => {
      const wrapper = mountCustom()
      const { cancel } = wrapper.findComponent(CustomCreate).vm.$attrs as any
      cancel()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-list' })
    })

    it('passes resource name', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomCreate).vm.$attrs as any).resource).toBe('company')
    })

    it('passes loading state', () => {
      store.loading.create = true
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomCreate).vm.$attrs as any).loading).toBe(true)
    })

    it('passes error', () => {
      store.error = 'server error'
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomCreate).vm.$attrs as any).error).toBe('server error')
    })
  })
})
