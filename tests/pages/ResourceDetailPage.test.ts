import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceDetailPage from '../../src/pages/ResourceDetailPage.vue'
import ResourceDetailView from '../../src/ui/ResourceDetailView.vue'
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
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CustomView = defineComponent({ name: 'CustomView', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  route: '/companies',
  api: () => ({}) as any,
  fields: { id: { type: 'integer' as const }, name: { type: 'string' as const } },
}

describe('ResourceDetailPage', () => {
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
    return shallowMount(ResourceDetailPage)
  }

  describe('on mount', () => {
    it('calls get with the id from route params', async () => {
      mountPage(BASE_SPEC, '42')
      await flushPromises()
      expect(store.get).toHaveBeenCalledWith('42')
    })

    it('calls fetchSchema when spec has no fields', async () => {
      mountPage({ name: 'company', route: '/companies', api: () => ({}) as any })
      await flushPromises()
      expect(store.fetchSchema).toHaveBeenCalled()
    })

    it('does not call fetchSchema when spec has fields', async () => {
      mountPage()
      await flushPromises()
      expect(store.fetchSchema).not.toHaveBeenCalled()
    })
  })

  describe('default rendering', () => {
    it('renders ResourceDetailView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).exists()).toBe(true)
    })

    it('does not render custom component', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(CustomView).exists()).toBe(false)
    })

    it('passes item to ResourceDetailView after load', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme' }, meta: null })
      const wrapper = mountPage()
      await flushPromises()
      expect(wrapper.findComponent(ResourceDetailView).props('item' as any)).toEqual({
        id: 1,
        name: 'Acme',
      })
    })

    it('passes loading to ResourceDetailView', () => {
      store.loading.get = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('loading' as any)).toBe(true)
    })

    it('passes error to ResourceDetailView', () => {
      store.error = 'not found'
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('error' as any)).toBe('not found')
    })

    it('passes resource name', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('resource' as any)).toBe('company')
    })
  })

  describe('custom view component', () => {
    function mountCustom(specOverrides: any = {}, id = '1') {
      return mountPage({ ...BASE_SPEC, components: { view: CustomView }, ...specOverrides }, id)
    }

    it('renders custom component instead of ResourceDetailView', () => {
      const wrapper = mountCustom()
      expect(wrapper.findComponent(CustomView).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceDetailView).exists()).toBe(false)
    })

    it('back navigates to list', () => {
      const wrapper = mountCustom()
      const { back } = wrapper.findComponent(CustomView).vm.$attrs as any
      back()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-list' })
    })

    it('edit navigates to edit page with correct id', () => {
      const wrapper = mountCustom({}, '3')
      const { edit } = wrapper.findComponent(CustomView).vm.$attrs as any
      edit()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-edit', params: { id: '3' } })
    })

    it('confirmDelete navigates to delete-confirm route', () => {
      const wrapper = mountCustom({}, '3')
      const { confirmDelete } = wrapper.findComponent(CustomView).vm.$attrs as any
      confirmDelete()
      expect(mockPush).toHaveBeenCalledWith({
        name: 'companies-delete-confirm',
        params: { id: '3' },
      })
    })

    it('itemTitle is undefined when spec has no title function', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('itemTitle uses spec.title with the loaded item', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme Corp' }, meta: null })
      const wrapper = mountCustom({ title: (item: any) => item.name })
      await flushPromises()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).itemTitle).toBe('Acme Corp')
    })

    it('itemTitle is undefined when item is not yet loaded', () => {
      const wrapper = mountCustom({ title: (item: any) => item.name })
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('passes resource name', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).resource).toBe('company')
    })

    it('passes loading state', () => {
      store.loading.get = true
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).loading).toBe(true)
    })

    it('passes error', () => {
      store.error = 'not found'
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).error).toBe('not found')
    })

    it('passes item after load', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme' }, meta: null })
      const wrapper = mountCustom()
      await flushPromises()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).item).toEqual({
        id: 1,
        name: 'Acme',
      })
    })
  })

  describe('tabs card', () => {
    it('does not render tabs card when spec has no tabs', () => {
      const wrapper = mountPage()
      expect(wrapper.find('.resource-tabs-card').exists()).toBe(false)
    })
  })
})
