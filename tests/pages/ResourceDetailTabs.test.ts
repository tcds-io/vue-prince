import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ResourceDetailTabs from '../../src/pages/ResourceDetailTabs.vue'
import type { ResolvedTab } from '../../src/pages/use-resource-tabs'

function makeTab(overrides: Partial<ResolvedTab> = {}): ResolvedTab {
  return {
    label: 'Users',
    component: defineComponent({ template: '<div>tab content</div>' }),
    foreignKey: 'company_id',
    ...overrides,
  }
}

describe('ResourceDetailTabs', () => {
  it('renders nothing when tabs is empty', () => {
    const wrapper = mount(ResourceDetailTabs, {
      props: { tabs: [], resourceId: 1, resource: {} },
      global: { stubs: { PrinceTabs: { template: '<slot :active-tab="0" />' } } },
    })
    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it('renders a tab wrapper when tabs are provided', () => {
    const wrapper = mount(ResourceDetailTabs, {
      props: { tabs: [makeTab()], resourceId: 1, resource: {} },
      global: {
        stubs: {
          PrinceTabs: { template: '<div><slot :active-tab="0" /></div>' },
        },
      },
    })
    expect(wrapper.html()).toContain('tab content')
  })

  it('passes resourceId, foreignKey, and resource to each tab component', () => {
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
      global: {
        stubs: { PrinceTabs: { template: '<div><slot :active-tab="0" /></div>' } },
      },
    })
    expect(receivedProps[0].resourceId).toBe(42)
    expect(receivedProps[0].foreignKey).toBe('org_id')
    expect(receivedProps[0].resource).toEqual(resource)
  })

  it('renders all tabs with v-show (all mounted, active one visible)', () => {
    const activeTab = 0
    const wrapper = mount(ResourceDetailTabs, {
      props: {
        tabs: [makeTab({ label: 'Tab A' }), makeTab({ label: 'Tab B' })],
        resourceId: 1,
        resource: {},
      },
      global: {
        stubs: {
          PrinceTabs: {
            template: `<div><slot :active-tab="${activeTab}" /></div>`,
          },
        },
      },
    })
    // Both tab content divs exist in DOM (v-show not v-if)
    const contentDivs = wrapper.findAll('.resource-tab-content')
    expect(contentDivs).toHaveLength(2)
  })
})
