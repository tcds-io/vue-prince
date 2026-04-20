import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceCreatePage from '../../src/pages/ResourceCreatePage.vue'
import ResourceFormView from '../../src/ui/ResourceFormView.vue'
import { configureVuePrince } from '../../src/config'

vi.mock('vue-router', () => ({ useRoute: vi.fn(), useRouter: vi.fn() }))
import { useRoute, useRouter } from 'vue-router'

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    list: [],
    listMeta: null,
    item: null,
    itemMeta: null,
    schemaFields: [] as unknown[],
    loading: false,
    error: null as string | null,
    fetchSchema: vi.fn().mockResolvedValue(undefined),
    fetchList: vi.fn().mockResolvedValue(undefined),
    fetchItem: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 5 }),
    update: vi.fn().mockResolvedValue({ id: 5 }),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CustomCreate = defineComponent({ name: 'CustomCreate', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  endpoints: { api: '/api/companies', route: '/companies' },
  fields: { name: { type: 'string' as const } },
}

describe('ResourceCreatePage', () => {
  let store: ReturnType<typeof makeStore>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    configureVuePrince({ baseUrl: '' })
    store = makeStore()
    mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
  })

  function mountPage(spec: any = BASE_SPEC) {
    vi.mocked(useRoute).mockReturnValue({
      meta: { useStore: () => store, spec },
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
      mountPage({ name: 'company', endpoints: { api: '/api/companies', route: '/companies' } })
      await flushPromises()
      expect(store.fetchSchema).toHaveBeenCalled()
    })
  })

  describe('default rendering', () => {
    it('renders ResourceFormView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).exists()).toBe(true)
    })

    it('does not render custom component', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(CustomCreate).exists()).toBe(false)
    })

    it('passes page=CREATE to ResourceFormView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('page')).toBe('CREATE')
    })

    it('passes null item to ResourceFormView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('item')).toBeNull()
    })

    it('passes loading state to ResourceFormView', () => {
      store.loading = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('loading')).toBe(true)
    })

    it('passes error to ResourceFormView', () => {
      store.error = 'fail'
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('error')).toBe('fail')
    })

    it('submit event calls store.create and navigates to detail', async () => {
      const wrapper = mountPage()
      await flushPromises()
      await wrapper.findComponent(ResourceFormView).vm.$emit('submit', { name: 'Acme' })
      expect(store.create).toHaveBeenCalledWith({ name: 'Acme' })
      await flushPromises()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '5' } })
    })

    it('cancel event navigates to list', async () => {
      const wrapper = mountPage()
      await wrapper.findComponent(ResourceFormView).vm.$emit('cancel')
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-list' })
    })
  })

  describe('custom create component', () => {
    function mountCustom() {
      return mountPage({ ...BASE_SPEC, components: { create: CustomCreate } })
    }

    it('renders custom component instead of ResourceFormView', () => {
      const wrapper = mountCustom()
      expect(wrapper.findComponent(CustomCreate).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceFormView).exists()).toBe(false)
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
      store.loading = true
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
