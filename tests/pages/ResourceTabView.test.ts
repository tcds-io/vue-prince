import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ResourceTabView from '../../src/pages/ResourceTabView.vue'

vi.mock('../../src/resource-controller', () => ({ createResourceController: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    resolve: (location: { name: string; params: { id: string | number } }) => ({
      href: `/users/${location.params.id}`,
    }),
  }),
}))

import { createResourceController } from '../../src/resource-controller'

function makeSpec(mockList = vi.fn().mockResolvedValue({ data: [], meta: null })) {
  return {
    name: 'user',
    route: '/users',
    api: () => ({ list: mockList }) as any,
    fields: {
      id: { type: 'integer' as const },
      name: { type: 'string' as const },
      company_id: { type: 'integer' as const },
    },
  }
}

const defaultProps = {
  spec: makeSpec(),
  resourceId: 1,
  foreignKey: 'company_id',
  resource: { id: 1, name: 'Acme' },
}

beforeEach(() => {
  vi.mocked(createResourceController).mockReturnValue({
    store: () => ({
      schemaPermissions: {},
      schemaLoaded: true,
      loading: false,
      fetchSchema: vi.fn().mockResolvedValue(undefined),
    }),
  } as any)
})

describe('ResourceTabView', () => {
  it('fetches items on mount using resourceId and foreignKey', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: null })
    mount(ResourceTabView, {
      props: { ...defaultProps, spec: makeSpec(mockList) },
      global: { stubs: { ResourceListView: true, PrinceButton: true } },
    })
    await flushPromises()
    expect(mockList).toHaveBeenCalledWith({ company_id: '1', page: '1' })
  })

  it('opens row in new browser tab on row click', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const users = [{ id: 7, name: 'Alice', company_id: 1, _resource: 'user' }]
    const mockList = vi.fn().mockResolvedValue({ data: users, meta: null })

    const wrapper = mount(ResourceTabView, {
      props: { ...defaultProps, spec: makeSpec(mockList) },
      global: { stubs: { PrinceButton: true } },
    })
    await flushPromises()

    const row = wrapper.find('tbody tr')
    await row.trigger('click')

    expect(openSpy).toHaveBeenCalledWith('/users/7', '_blank')
    openSpy.mockRestore()
  })

  it('does not render pagination when last_page is 1', async () => {
    const mockList = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, total: 5, per_page: 10 },
    })
    const wrapper = mount(ResourceTabView, {
      props: { ...defaultProps, spec: makeSpec(mockList) },
      global: { stubs: { ResourceListView: true, PrinceButton: true } },
    })
    await flushPromises()
    expect(wrapper.find('.prince-pagination').exists()).toBe(false)
  })

  it('renders pagination when last_page > 1', async () => {
    const mockList = vi.fn().mockResolvedValue({
      data: [],
      meta: {
        resource: 'user',
        schema: [],
        current_page: 1,
        last_page: 3,
        total: 30,
        per_page: 10,
      },
    })
    const wrapper = mount(ResourceTabView, {
      props: { ...defaultProps, spec: makeSpec(mockList) },
      global: { stubs: { ResourceListView: true, PrinceButton: true } },
    })
    await flushPromises()
    expect(wrapper.find('.prince-pagination').exists()).toBe(true)
  })

  it('refetches when resourceId prop changes', async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [], meta: null })
    const wrapper = mount(ResourceTabView, {
      props: { ...defaultProps, spec: makeSpec(mockList) },
      global: { stubs: { ResourceListView: true, PrinceButton: true } },
    })
    await flushPromises()
    mockList.mockClear()
    await wrapper.setProps({ resourceId: 99 } as any)
    await flushPromises()
    expect(mockList).toHaveBeenCalledWith({ company_id: '99', page: '1' })
  })
})
