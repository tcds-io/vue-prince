import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ResourceDetailTabs from '../../src/pages/ResourceDetailTabs.vue'
import type { ResolvedTab } from '../../src/pages/use-resource-tabs'

vi.mock('vue-router', () => ({ useRoute: vi.fn(), useRouter: vi.fn() }))
import { useRoute, useRouter } from 'vue-router'

const mockReplace = vi.fn()

function setupRouter(query: Record<string, string> = {}) {
  vi.mocked(useRoute).mockReturnValue({ query } as any)
  vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as any)
}

function makeTab(overrides: Partial<ResolvedTab> = {}): ResolvedTab {
  return {
    label: 'Users',
    component: defineComponent({ template: '<div>tab content</div>' }),
    foreignKey: 'company_id',
    ...overrides,
  }
}

// Simple stub that passes through the slot and emits update:modelValue when clicked
const tabsStub = { template: '<div @click="$emit(\'update:modelValue\', 1)"><slot /></div>' }
const tabsStubPassive = { template: '<div><slot /></div>' }

describe('ResourceDetailTabs', () => {
  beforeEach(() => {
    setupRouter()
    mockReplace.mockReset()
  })

  it('renders nothing when tabs is empty', () => {
    const wrapper = mount(ResourceDetailTabs, {
      props: { tabs: [], resourceId: 1, resource: {} },
      global: { stubs: { PrinceTabs: tabsStubPassive } },
    })
    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it('renders a tab wrapper when tabs are provided', () => {
    const wrapper = mount(ResourceDetailTabs, {
      props: { tabs: [makeTab()], resourceId: 1, resource: {} },
      global: { stubs: { PrinceTabs: tabsStubPassive } },
    })
    expect(wrapper.html()).toContain('tab content')
  })

  it('passes resourceId, foreignKey, and resource to the active tab component', () => {
    const receivedProps: Record<string, unknown>[] = []
    const SpyComponent = defineComponent({
      props: ['resourceId', 'foreignKey', 'resource'],
      setup(props) {
        receivedProps.push({ ...props })
        return () => h('div')
      },
    })
    const resource = { id: 5, name: 'Acme' }
    mount(ResourceDetailTabs, {
      props: {
        tabs: [makeTab({ component: SpyComponent, foreignKey: 'org_id' })],
        resourceId: 42,
        resource,
      },
      global: { stubs: { PrinceTabs: tabsStubPassive } },
    })
    expect(receivedProps[0].resourceId).toBe(42)
    expect(receivedProps[0].foreignKey).toBe('org_id')
    expect(receivedProps[0].resource).toEqual(resource)
  })

  it('only mounts the active tab — inactive tabs are not in the DOM', () => {
    const TabA = defineComponent({ name: 'TabA', template: '<div>Tab A</div>' })
    const TabB = defineComponent({ name: 'TabB', template: '<div>Tab B</div>' })
    const wrapper = mount(ResourceDetailTabs, {
      props: {
        tabs: [
          makeTab({ label: 'Tab A', component: TabA }),
          makeTab({ label: 'Tab B', component: TabB }),
        ],
        resourceId: 1,
        resource: {},
      },
      global: { stubs: { PrinceTabs: tabsStubPassive } },
    })
    expect(wrapper.findComponent(TabA).exists()).toBe(true)
    expect(wrapper.findComponent(TabB).exists()).toBe(false)
  })

  it('reads active tab from route.query.tab label slug', () => {
    setupRouter({ tab: 'tab-b' })
    const TabA = defineComponent({ name: 'TabA', template: '<div>Tab A</div>' })
    const TabB = defineComponent({ name: 'TabB', template: '<div>Tab B</div>' })
    const wrapper = mount(ResourceDetailTabs, {
      props: {
        tabs: [
          makeTab({ label: 'Tab A', component: TabA }),
          makeTab({ label: 'Tab B', component: TabB }),
        ],
        resourceId: 1,
        resource: {},
      },
      global: { stubs: { PrinceTabs: tabsStubPassive } },
    })
    expect(wrapper.findComponent(TabA).exists()).toBe(false)
    expect(wrapper.findComponent(TabB).exists()).toBe(true)
  })

  it('falls back to tab 0 when query.tab slug does not match any tab', () => {
    setupRouter({ tab: 'nonexistent' })
    const TabA = defineComponent({ name: 'TabA', template: '<div>Tab A</div>' })
    const wrapper = mount(ResourceDetailTabs, {
      props: {
        tabs: [makeTab({ label: 'Tab A', component: TabA })],
        resourceId: 1,
        resource: {},
      },
      global: { stubs: { PrinceTabs: tabsStubPassive } },
    })
    expect(wrapper.findComponent(TabA).exists()).toBe(true)
  })

  it('calls router.replace with ?tab=slug when wrapper emits update:modelValue', async () => {
    setupRouter({ page: '2' })
    const wrapper = mount(ResourceDetailTabs, {
      props: {
        tabs: [makeTab({ label: 'Tab A' }), makeTab({ label: 'Tab B' })],
        resourceId: 1,
        resource: {},
      },
      global: { stubs: { PrinceTabs: tabsStub } },
    })
    await wrapper.find('div').trigger('click')
    expect(mockReplace).toHaveBeenCalledWith({
      query: { page: '2', tab: 'tab-b' },
    })
  })
})
