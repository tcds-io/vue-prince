import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ResourceEditPage from '../../src/pages/ResourceEditPage.vue'
import ResourceFormView from '../../src/ui/ResourceFormView.vue'
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
    loading: false,
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

const CustomEdit = defineComponent({ name: 'CustomEdit', template: '<div />' })

const BASE_SPEC = {
  name: 'company',
  route: '/companies',
  api: () => ({}) as any,
  fields: { name: { type: 'string' as const } },
}

describe('ResourceEditPage', () => {
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
    return shallowMount(ResourceEditPage)
  }

  describe('on mount', () => {
    it('calls get with the id from route params', async () => {
      mountPage(BASE_SPEC, '7')
      await flushPromises()
      expect(store.get).toHaveBeenCalledWith('7')
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
    it('renders ResourceFormView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).exists()).toBe(true)
    })

    it('does not render custom component', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(CustomEdit).exists()).toBe(false)
    })

    it('passes page=EDIT to ResourceFormView', () => {
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('page' as any)).toBe('EDIT')
    })

    it('passes item to ResourceFormView after load', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme' }, meta: null })
      const wrapper = mountPage()
      await flushPromises()
      expect(wrapper.findComponent(ResourceFormView).props('item' as any)).toEqual({
        id: 1,
        name: 'Acme',
      })
    })

    it('passes loading state to ResourceFormView', () => {
      store.loading = true
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('loading' as any)).toBe(true)
    })

    it('passes error to ResourceFormView', () => {
      store.error = 'Server error'
      const wrapper = mountPage()
      expect(wrapper.findComponent(ResourceFormView).props('error' as any)).toBe('Server error')
    })

    it('submit event calls store.update and navigates to detail', async () => {
      const wrapper = mountPage(BASE_SPEC, '3')
      await flushPromises()
      await wrapper.findComponent(ResourceFormView).vm.$emit('submit', { name: 'Updated' })
      expect(store.update).toHaveBeenCalledWith('3', { name: 'Updated' })
      await flushPromises()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '3' } })
    })

    it('cancel event navigates to detail', async () => {
      const wrapper = mountPage(BASE_SPEC, '3')
      await wrapper.findComponent(ResourceFormView).vm.$emit('cancel')
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '3' } })
    })
  })

  describe('custom edit component', () => {
    function mountCustom(specOverrides: any = {}, id = '1') {
      return mountPage({ ...BASE_SPEC, components: { edit: CustomEdit }, ...specOverrides }, id)
    }

    it('renders custom component instead of ResourceFormView', () => {
      const wrapper = mountCustom()
      expect(wrapper.findComponent(CustomEdit).exists()).toBe(true)
      expect(wrapper.findComponent(ResourceFormView).exists()).toBe(false)
    })

    it('submit calls store.update and navigates to detail', async () => {
      const wrapper = mountCustom({}, '3')
      await flushPromises()
      const { submit } = wrapper.findComponent(CustomEdit).vm.$attrs as any
      await submit({ name: 'Updated' })
      expect(store.update).toHaveBeenCalledWith('3', { name: 'Updated' })
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '3' } })
    })

    it('submit does not navigate if update returns false', async () => {
      store.update = vi.fn().mockResolvedValue(false)
      const wrapper = mountCustom()
      await flushPromises()
      const { submit } = wrapper.findComponent(CustomEdit).vm.$attrs as any
      await submit({ name: 'Updated' })
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('cancel navigates to detail', () => {
      const wrapper = mountCustom({}, '3')
      const { cancel } = wrapper.findComponent(CustomEdit).vm.$attrs as any
      cancel()
      expect(mockPush).toHaveBeenCalledWith({ name: 'companies-detail', params: { id: '3' } })
    })

    it('itemTitle is undefined when spec has no title function', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('itemTitle uses spec.title with the loaded item', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme Corp' }, meta: null })
      const wrapper = mountCustom({ title: (item: any) => item.name })
      await flushPromises()
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).itemTitle).toBe('Acme Corp')
    })

    it('itemTitle is undefined when item is not yet loaded', () => {
      const wrapper = mountCustom({ title: (item: any) => item.name })
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).itemTitle).toBeUndefined()
    })

    it('passes resource name', () => {
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).resource).toBe('company')
    })

    it('passes loading state', () => {
      store.loading = true
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).loading).toBe(true)
    })

    it('passes error', () => {
      store.error = 'conflict'
      const wrapper = mountCustom()
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).error).toBe('conflict')
    })

    it('passes item after load', async () => {
      store.get.mockResolvedValue({ data: { id: 1, name: 'Acme' }, meta: null })
      const wrapper = mountCustom()
      await flushPromises()
      expect((wrapper.findComponent(CustomEdit).vm.$attrs as any).item).toEqual({
        id: 1,
        name: 'Acme',
      })
    })
  })
})
