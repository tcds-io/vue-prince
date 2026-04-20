export { configureVuePrince } from './config'
export type {
  FieldComponentMap,
  FieldComponentEntry,
  ButtonComponentMap,
  LayoutComponentMap,
  LayoutCardProps,
  LayoutTableProps,
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

export type { ResolvedTab } from './pages/useResourceMeta'

export { default as ResourceListView } from './ui/ResourceListView.vue'
export { default as ResourceDetailView } from './ui/ResourceDetailView.vue'
export { default as ResourceFormView } from './ui/ResourceFormView.vue'
export { default as PrinceButton } from './ui/PrinceButton.vue'
export { default as PrinceCard } from './ui/PrinceCard.vue'
