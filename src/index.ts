export { configureVuePrince } from './config'
export type {
  FieldComponentMap,
  FieldComponentEntry,
  ButtonComponentMap,
  LayoutComponentMap,
  LayoutCardProps,
  LayoutTableProps,
  LayoutTabsProps,
  LayoutDropdownProps,
  VuePrinceConfig,
} from './config'
export * from './api'
export * from './resource'
export * from './resource-api'
export * from './resource-controller'
export * from './resource-routes'
export * from './field-props'
export * from './button-props'
export * from './page-props'
export {
  defaultFieldComponents,
  slugify,
  toFieldLabel,
  buildResourceFieldProps,
  type FieldContext,
  NumberField,
  TextField,
  TextAreaField,
  CheckboxField,
  DateTimeField,
  SelectField,
  ResourceField,
} from './ui/fields'

export type { ResolvedTab, TabComponentProps } from './pages/use-resource-tabs'
export { resourceListTab, createResourceTabView } from './pages/use-resource-tabs'
export { default as ResourceTabView } from './pages/ResourceTabView.vue'

export { default as ResourceListView } from './ui/ResourceListView.vue'
export { default as ResourceDetailView } from './ui/ResourceDetailView.vue'
export { default as ResourceFormView } from './ui/ResourceFormView.vue'
export { default as PrinceButton } from './ui/PrinceButton.vue'
export { default as PrinceCard } from './ui/PrinceCard.vue'
export { default as PrinceTabs } from './ui/PrinceTabs.vue'
export { default as PrinceDropdown } from './ui/PrinceDropdown.vue'
