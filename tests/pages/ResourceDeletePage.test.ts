import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceDeletePage from '../../src/pages/ResourceDeletePage.vue'
import PrinceCard from '../../src/ui/PrinceCard.vue'
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
    schemaFields: [] as unknown[],
    schemaPermissions: {} as Record<string, string>,
    schemaLoaded: true,
    loading: { schema: false, list: false, get: false, create: false, update: false, remove: false, createMany: false, updateMany: false, removeMany: false },
    error: null as string | null,
    fetchSchema: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CustomDelete = defineComponent({ name: 'CustomDelete', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  route: '/companies',
  api: () => ({}) as any,
  title: (item: any) => item.name,
}

describe('ResourceDeletePage', () => {
  let store: ReturnType<typeof makeStore>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    configureVuePrince({ api: { baseUrl: '' } })
    store = makeStore()
    mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(createResourceController).mockReturnValue({ store: () => store, api: {} } as any)
  })

  function mountPage(spec: any = BASE_SPEC, id = '1') {
    vi.mocked(useRoute).mockReturnValue({
      meta: { spec },
      params: { id },
      query: {},
    } as any)
    return shallowMount(ResourceDeletePage)
  }

  describe('on mount', () => {
    it('calls get with the id from route params', async () => {
      mountPage(BASE_SPEC, '7')
      await flushPromises()
      expect(store.get).toHaveBeenCalledWith('7')
    })
  })

  describe('default rendering', () => {
    it('renders a PrinceCard with title using item title when loaded', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme Corp' }, meta: null })
      const wrapper = mountPage()
      await flushPromises()
      expect(wrapper.findComponent(PrinceCard).props('title' as any)).toBe('Delete Acme Corp')
    })

    it('renders a PrinceCard with the raw id when item is not yet loaded', () => {
      const wrapper = mountPage(BASE_SPEC, '5')
      expect(wrapper.findComponent(PrinceCard).props('title' as any)).toBe('Delete 5')
    })

    it('passes loading to PrinceCard body (loading prop on store)', () => {
      store.loading.remove = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(PrinceCard).exists()).toBe(true)
    })

    it('does not render custom component', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(CustomDelete).exists()).toBe(false)
    })
  })

  describe('custom delete component', () => {
    function mountCustom(specOverrides: any = {}, id = '1') {
      return mountPage({ ...BASE_SPEC, components: { delete: CustomDelete }, ...specOverrides }, id)
    }

    it('renders custom component instead of PrinceCard', () => {
      const wrapper = mountCustom()
      expect(wrapper.findComponent(CustomDelete).exists()).toBe(true)
      expect(wrapper.findComponent(PrinceCard).exists()).toBe(false)
    })

    it('passes itemTitle to custom component', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme Corp' }, meta: null })
      const wrapper = mountCustom()
      await flushPromises()
      expect((wrapper.findComponent(CustomDelete).vm.$attrs as any).itemTitle).toBe('Acme Corp')
    })

    it('itemTitle is undefined when spec has no title function', () => {
      const wrapper = mountCustom({
        ...BASE_SPEC,
        components: { delete: CustomDelete },
        title: undefined,
      })
      expect((wrapper.findComponent(CustomDelete).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('cancel navigates to detail route', () => {
      const wrapper = mountCustom({}, '5')
      const { cancel } = wrapper.findComponent(CustomDelete).vm.$attrs as any
      cancel()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '5' } })
    })

    it('confirm calls store.remove then navigates to list', async () => {
      const wrapper = mountCustom({}, '3')
      const { confirm } = wrapper.findComponent(CustomDelete).vm.$attrs as any
      await confirm()
      expect(store.remove).toHaveBeenCalledWith('3')
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-list' })
    })

    it('passes loading and error from store', () => {
      store.loading.remove = true
      store.error = 'oops'
      const wrapper = mountCustom()
      const attrs = wrapper.findComponent(CustomDelete).vm.$attrs as any
      expect(attrs.loading).toBe(true)
      expect(attrs.error).toBe('oops')
    })
  })
})
