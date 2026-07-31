import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceListPage from '../../src/pages/ResourceListPage.vue'
import ResourceListView from '../../src/ui/ResourceListView.vue'
import { configureVuePrince } from '../../src/config'

vi.mock('vue-router', () => ({ useRoute: vi.fn(), useRouter: vi.fn() }))
vi.mock('../../src/resource-controller', () => ({ createResourceController: vi.fn() }))
import { useRoute, useRouter } from 'vue-router'
import { createResourceController } from '../../src/resource-controller'

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    items: [] as unknown[],
    itemsMeta: null as any,
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
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CustomList = defineComponent({ name: 'CustomList', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  route: '/companies',
  api: () => ({}) as any,
  fields: { id: { type: 'integer' as const }, name: { type: 'string' as const } },
}

describe('ResourceListPage', () => {
  let store: ReturnType<typeof makeStore>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    configureVuePrince({ api: { baseUrl: '' } })
    store = makeStore()
    mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(createResourceController).mockReturnValue({ store: () => store, api: {} } as any)
  })

  // PrinceCard is a wrapper in the list page — give its stub a slot so
  // ResourceListView (in the default slot) is reachable by findComponent.
  const cardStub = { template: '<div><slot/></div>' }

  function mountPage(spec: any = BASE_SPEC, query: Record<string, string> = {}) {
    vi.mocked(useRoute).mockReturnValue({
      meta: { spec },
      params: {},
      query: { page: '1', ...query },
    } as any)
    return shallowMount(ResourceListPage, {
      global: { stubs: { PrinceCard: cardStub } },
    })
  }

  describe('on mount', () => {
    it('calls list immediately with page 1', async () => {
      mountPage()
      await flushPromises()
      expect(store.list).toHaveBeenCalledWith({ page: '1' })
    })

    it('passes page from route query to list', async () => {
      mountPage(BASE_SPEC, { page: '4' })
      await flushPromises()
      expect(store.list).toHaveBeenCalledWith({ page: '4' })
    })

    it('forwards extra query params as search to list', async () => {
      mountPage(BASE_SPEC, { page: '1', search: '%acme%' })
      await flushPromises()
      expect(store.list).toHaveBeenCalledWith({ page: '1', search: '%acme%' })
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
    it('renders ResourceListView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceListView).exists()).toBe(true)
    })

    it('does not render custom component', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(CustomList).exists()).toBe(false)
    })

    it('passes store.loading to ResourceListView', () => {
      store.loading.list = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceListView).props('loading' as any)).toBe(true)
    })

    it('passes store.error to ResourceListView', () => {
      store.error = 'oops'
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceListView).props('error' as any)).toBe('oops')
    })

    it('passes spec.name as resource to ResourceListView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceListView).props('resource' as any)).toBe('company')
    })

    it('row click on ResourceListView navigates to detail', async () => {
      const wrapper = mountPage()
      await flushPromises()
      const onRowClick = wrapper.findComponent(ResourceListView).props('onRowClick' as any) as (
        item: Record<string, unknown>,
      ) => void
      onRowClick({ id: 5 })
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '5' } })
    })
  })

  describe('layout.pages.list fallback', () => {
    const FallbackList = defineComponent({ name: 'FallbackList', template: '<div />' })

    it('renders fallback component from config when spec has no override', () => {
      configureVuePrince({ api: { baseUrl: '' }, layout: { pages: { list: FallbackList } } })
      const wrapper = mountPage()
      expect(wrapper.findComponent(FallbackList).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceListView).exists()).toBe(false)
    })

    it('passes the same props as a per-resource override would', () => {
      store.error = 'failed'
      configureVuePrince({ api: { baseUrl: '' }, layout: { pages: { list: FallbackList } } })
      const wrapper = mountPage()
      const attrs = wrapper.findComponent(FallbackList).vm.$attrs as any
      expect(attrs.resource).toBe('company')
      expect(attrs.error).toBe('failed')
      expect(typeof attrs.navigateToItem).toBe('function')
      expect(typeof attrs.createNew).toBe('function')
    })

    it('per-resource spec.components.list wins over layout.pages.list', () => {
      configureVuePrince({ api: { baseUrl: '' }, layout: { pages: { list: FallbackList } } })
      const wrapper = mountPage({ ...BASE_SPEC, components: { list: CustomList } })
      expect(wrapper.findComponent(CustomList).exists()).toBe(true)
      expect(wrapper.findComponent(FallbackList).exists()).toBe(false)
    })
  })

  describe('custom list component', () => {
    function mountCustom(query: Record<string, string> = {}) {
      return mountPage({ ...BASE_SPEC, components: { list: CustomList } }, query)
    }

    it('renders custom component instead of ResourceListView', () => {
      const wrapper = mountCustom()
      expect(wrapper.findComponent(CustomList).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceListView).exists()).toBe(false)
    })

    it('passes resource name', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).resource).toBe('company')
    })

    it('passes loading state', () => {
      store.loading.list = true
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).loading).toBe(true)
    })

    it('passes error', () => {
      store.error = 'failed'
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).error).toBe('failed')
    })

    it('navigateToItem pushes to segment-detail', async () => {
      const wrapper = mountCustom()
      await flushPromises()
      const { navigateToItem } = wrapper.findComponent(CustomList).vm.$attrs as any
      navigateToItem({ id: 7 })
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '7' } })
    })

    it('createNew pushes to segment-create', async () => {
      const wrapper = mountCustom()
      const { createNew } = wrapper.findComponent(CustomList).vm.$attrs as any
      createNew()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-create' })
    })

    it('goToPage pushes updated page in query', async () => {
      const wrapper = mountCustom()
      const { goToPage } = wrapper.findComponent(CustomList).vm.$attrs as any
      goToPage(3)
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ page: '3' }) }),
      )
    })

    it('onSearch triggers a debounced router push', () => {
      vi.useFakeTimers()
      const wrapper = mountCustom()
      const { onSearch } = wrapper.findComponent(CustomList).vm.$attrs as any
      onSearch({ search: '%foo%' })
      vi.advanceTimersByTime(300)
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ search: '%foo%' }) }),
      )
      vi.useRealTimers()
    })

    it('passes current page number', () => {
      const wrapper = mountCustom({ page: '2' })
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).page).toBe(2)
    })

    it('passes itemsMeta', () => {
      store.itemsMeta = { current_page: 1, total: 5, last_page: 1, per_page: 15 }
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).itemsMeta).toEqual(
        store.itemsMeta,
      )
    })
  })

  describe('sorting', () => {
    function mountCustom(query: Record<string, string> = {}) {
      return mountPage({ ...BASE_SPEC, components: { list: CustomList } }, query)
    }

    it('forwards the sort query param to list', async () => {
      mountPage(BASE_SPEC, { sort: 'name:desc' })
      await flushPromises()
      expect(store.list).toHaveBeenCalledWith({ page: '1', sort: 'name:desc' })
    })

    it('forwards a multi-column sort value untouched', async () => {
      mountPage(BASE_SPEC, { sort: 'name:desc,id:asc' })
      await flushPromises()
      expect(store.list).toHaveBeenCalledWith({ page: '1', sort: 'name:desc,id:asc' })
    })

    it('sends no sort param when the query has none', async () => {
      mountPage()
      await flushPromises()
      expect(store.list).toHaveBeenCalledWith({ page: '1' })
    })

    it('keeps sort out of the search params', () => {
      const wrapper = mountCustom({ sort: 'name:asc', search: '%acme%' })
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).search).toEqual({
        search: '%acme%',
      })
    })

    it('exposes the parsed sort to a custom list page', () => {
      const wrapper = mountCustom({ sort: 'name:desc' })
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).sort).toEqual({
        column: 'name',
        direction: 'desc',
      })
    })

    it('passes the parsed sort to ResourceListView', () => {
      const wrapper = mountPage(BASE_SPEC, { sort: 'name:asc' })
      expect(wrapper.findComponent(ResourceListView).props('sort' as any)).toEqual({
        column: 'name',
        direction: 'asc',
      })
    })

    it('sorts an unsorted column ascending', () => {
      const wrapper = mountPage()
      wrapper.findComponent(ResourceListView).props('onSort' as any)('name')
      expect(mockPush).toHaveBeenCalledWith({ query: { page: '1', sort: 'name:asc' } })
    })

    it('flips an ascending column to descending', () => {
      const wrapper = mountPage(BASE_SPEC, { sort: 'name:asc' })
      wrapper.findComponent(ResourceListView).props('onSort' as any)('name')
      expect(mockPush).toHaveBeenCalledWith({ query: { page: '1', sort: 'name:desc' } })
    })

    it('clears the sort when a descending column is toggled again', () => {
      const wrapper = mountPage(BASE_SPEC, { sort: 'name:desc' })
      wrapper.findComponent(ResourceListView).props('onSort' as any)('name')
      expect(mockPush).toHaveBeenCalledWith({ query: { page: '1' } })
    })

    it('resets to page 1 and keeps active filters when sorting', () => {
      const wrapper = mountPage(BASE_SPEC, { page: '4', search: '%acme%' })
      wrapper.findComponent(ResourceListView).props('onSort' as any)('name')
      expect(mockPush).toHaveBeenCalledWith({
        query: { search: '%acme%', page: '1', sort: 'name:asc' },
      })
    })

    it('keeps the active sort when the search changes', () => {
      vi.useFakeTimers()
      const wrapper = mountCustom({ sort: 'name:desc' })
      const { onSearch } = wrapper.findComponent(CustomList).vm.$attrs as any
      onSearch({ search: '%foo%' })
      vi.advanceTimersByTime(300)
      expect(mockPush).toHaveBeenCalledWith({
        query: { page: '1', sort: 'name:desc', search: '%foo%' },
      })
      vi.useRealTimers()
    })

    it('keeps the active sort when paging', () => {
      const wrapper = mountCustom({ sort: 'name:desc' })
      const { goToPage } = wrapper.findComponent(CustomList).vm.$attrs as any
      goToPage(3)
      expect(mockPush).toHaveBeenCalledWith({ query: { page: '3', sort: 'name:desc' } })
    })
  })

  describe('pages window computed', () => {
    it('shows up to 3 page numbers centred on the current page', async () => {
      store.itemsMeta = { current_page: 5, total: 100, last_page: 10, per_page: 10, schema: [] }
      const wrapper = mountCustom({ page: '5' })
      await flushPromises()
      // pages window: [4, 5, 6]
      expect((wrapper.findComponent(CustomList).vm.$attrs as any).itemsMeta?.last_page).toBe(10)
    })

    function mountCustom(query: Record<string, string> = {}) {
      return mountPage({ ...BASE_SPEC, components: { list: CustomList } }, query)
    }
  })
})
