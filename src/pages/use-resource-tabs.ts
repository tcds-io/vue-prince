import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import type { ResourceId } from '../api'
import type { ResourceSpec } from '../resource'
import ResourceListTabContent from './ResourceListTabContent.vue'
import ResourceTabViewComponent from './ResourceTabView.vue'

export type TabComponentProps<T = Record<string, unknown>> = {
  resourceId: ResourceId | null | undefined
  foreignKey: string
  resource: T
}

export type ResolvedTab = {
  label: string
  component: Component
  foreignKey: string
}

export function useResourceTabs(parentSpec: ResourceSpec): { tabs: ResolvedTab[] } {
  const tabs: ResolvedTab[] = (parentSpec.tabs ?? []).map((tab) => ({
    label: tab.label ?? 'Tab',
    component: tab.component(),
    foreignKey: tab.foreignKey ?? `${parentSpec.name}_id`,
  }))
  return { tabs }
}

function makeListComponent(spec: ResourceSpec, ContentComponent: Component): Component {
  return defineComponent({
    name: `${spec.name}ListTab`,
    props: {
      resourceId: { type: [String, Number], default: null },
      foreignKey: { type: String, required: true },
      resource: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () => h(ContentComponent, { spec, ...props })
    },
  })
}

// Returns a Component (not a ResourceTab) — use as: { component: () => resourceListTab(spec) }
export function resourceListTab(spec: ResourceSpec): Component {
  return makeListComponent(spec, ResourceListTabContent)
}

// Returns a Component (not a ResourceTab) — use as: { component: () => createResourceTabView(spec) }
export function createResourceTabView(spec: ResourceSpec): Component {
  return makeListComponent(spec, ResourceTabViewComponent)
}
