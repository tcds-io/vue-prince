import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceDetailPage from '../../src/pages/ResourceDetailPage.vue'
import ResourceDetailView from '../../src/ui/ResourceDetailView.vue'
import { configureVuePrince } from '../../src/config'

vi.mock('vue-router', () => ({ useRoute: vi.fn(), useRouter: vi.fn() }))
import { useRoute, useRouter } from 'vue-router'

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    list: [],
    listMeta: null,
    item: null as Record<string, unknown> | null,
    itemMeta: null,
    schemaFields: [] as unknown[],
    loading: false,
    error: null as string | null,
    fetchSchema: vi.fn().mockResolvedValue(undefined),
    fetchList: vi.fn().mockResolvedValue(undefined),
    fetchItem: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CustomView = defineComponent({ name: 'CustomView', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  path: '/api/companies',
  fields: { id: { type: 'integer' as const }, name: { type: 'string' as const } },
}

describe('ResourceDetailPage', () => {
  let store: ReturnType<typeof makeStore>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    configureVuePrince({ baseUrl: '' })
    store = makeStore()
    mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
  })

  function mountPage(spec: any = BASE_SPEC, id = '1') {
    vi.mocked(useRoute).mockReturnValue({
      meta: { useStore: () => store, spec },
      params: { id },
      query: {},
    } as any)
    return shallowMount(ResourceDetailPage)
  }

  describe('on mount', () => {
    it('calls fetchItem with the id from route params', async () => {
      mountPage(BASE_SPEC, '42')
      await flushPromises()
      expect(store.fetchItem).toHaveBeenCalledWith('42')
    })

    it('calls fetchSchema when spec has no fields', async () => {
      mountPage({ name: 'company', path: '/api/companies' })
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

    it('passes store.item to ResourceDetailView', () => {
      store.item = { id: 1, name: 'Acme' }
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('item')).toEqual({
        id: 1,
        name: 'Acme',
      })
    })

    it('passes loading to ResourceDetailView', () => {
      store.loading = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('loading')).toBe(true)
    })

    it('passes error to ResourceDetailView', () => {
      store.error = 'not found'
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('error')).toBe('not found')
    })

    it('passes resource name', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceDetailView).props('resource')).toBe('company')
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

    it('remove calls store.remove then navigates to list', async () => {
      const wrapper = mountCustom({}, '3')
      const { remove } = wrapper.findComponent(CustomView).vm.$attrs as any
      await remove()
      expect(store.remove).toHaveBeenCalledWith('3')
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-list' })
    })

    it('itemTitle is undefined when spec has no title function', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('itemTitle uses spec.title with the loaded item', () => {
      store.item = { id: 1, name: 'Acme Corp' }
      const wrapper = mountCustom({ title: (item: any) => item.name })
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).itemTitle).toBe('Acme Corp')
    })

    it('itemTitle is undefined when item is not yet loaded', () => {
      store.item = null
      const wrapper = mountCustom({ title: (item: any) => item.name })
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('passes resource name', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).resource).toBe('company')
    })

    it('passes loading state', () => {
      store.loading = true
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).loading).toBe(true)
    })

    it('passes error', () => {
      store.error = 'not found'
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).error).toBe('not found')
    })

    it('passes item from store', () => {
      store.item = { id: 1, name: 'Acme' }
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomView).vm.$attrs as any).item).toEqual(store.item)
    })
  })
})
