# vue-resource

Lightweight resource-oriented CRUD framework for Vue 3 + Pinia. One `defineResource` call generates a typed API client, a Pinia store, and four routes with pre-built page components.

---

## Architecture

```
configureVuePrince(config)          ← global config: baseUrl, field/button/layout overrides

defineResource(spec)
       │
       ├── createResourceApi(spec)           → typed fetch client
       ├── createResourceController(spec)    → Pinia store (useStore)
       └── createResourceRoutes(spec, useStore)
                │
                ├── /{segment}              → ResourceListPage
                ├── /{segment}/create       → ResourceCreatePage
                ├── /{segment}/:id          → ResourceDetailPage
                └── /{segment}/:id/edit     → ResourceEditPage
```

Data always flows **UI → store → API**. Components never call the API directly.

---

## Setup

### 1. Configure (once, in `main.ts`)

```ts
import { configureVuePrince } from '@/libs/vue-resource'

configureVuePrince({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
})
```

### 2. Define a resource

```ts
// features/companies/company.resource.ts
import { defineResource, createResourceController } from '@/libs/vue-resource'
import type { InferResourceModel } from '@/libs/vue-resource'

export const companyResource = defineResource({
  name: 'company',
  path: '/api/backoffice/companies',
  fields: {
    id: { type: 'integer', readOnly: true, preview: true },
    name: { type: 'string', preview: true, label: 'Company Name' },
    status: { type: 'enum', preview: true, values: ['active', 'inactive'] },
    created_at: { type: 'datetime', readOnly: true },
  },
  title: (company) => company.name,
})

export type Company = InferResourceModel<typeof companyResource>
export const { useStore: useCompanyStore } = createResourceController(companyResource)
```

### 3. Register routes

```ts
// app/router.ts
import { createResourceRoutes } from '@/libs/vue-resource'
import { companyResource, useCompanyStore } from '@/features/companies/company.resource'

export const router = createRouter({
  history: createWebHistory(),
  routes: [...createResourceRoutes(companyResource, useCompanyStore)],
})
```

Navigate to `/companies` — list, create, detail and edit are all wired up.

---

## `configureVuePrince(config)`

Must be called before any other vue-resource function.

```ts
configureVuePrince({
  baseUrl: string,            // prepended to every API request

  fields?: {                  // override field rendering per type
    string?: ...,
    enum?: ...,
    resource?: ...,           // autocomplete for resource references
    // ...
  },

  buttons?: {                 // override button rendering per semantic type
    Submit?: Component,
    Cancel?: Component,
    Create?: Component,
    Edit?: Component,
    Back?: Component,
    Delete?: Component,
    Pagination?: Component,
  },

  layout?: {                  // override page layout sections
    card?: Component,         // replaces the entire card; receives LayoutCardProps + header/default/footer slots
    table?: Component,        // receives LayoutTableProps + slot with default <table>
  },
})
```

Field and button components can be registered as a single component (used in both contexts) or split by context:

```ts
fields: {
  enum: MyEnumField,                              // used for both form and display
  datetime: { form: DatePicker, display: RelativeTime }, // split by context
}
```

---

## `defineResource(spec)`

Type-safe factory that preserves literal field types for downstream inference.

```ts
type ResourceSpec = {
  name: string // singular resource name
  path: string // full API path, e.g. '/api/backoffice/companies'
  fields?: Record<string, ResourceFieldDef> // optional — falls back to /_schema endpoint
  permissions?: ResourcePermissions // optional permission keys per action
  title?: (item: Model) => string // optional — display label for a record
  components?: ResourcePageComponents // optional — override any page with a custom component
}
```

When `fields` is omitted, the library fetches `{path}/_schema` to discover the field list.

### `ResourceFieldDef`

```ts
type ResourceFieldDef = {
  type: SpecFieldType | ResourceSpec // field type or a related resource
  readOnly?: boolean // display-only even on edit/create pages
  preview?: boolean // show in list table
  values?: string[] // enum options
  label?: string // override auto-generated label
}
```

### Field types

| `type`         | TS type          | Default component                    |
| -------------- | ---------------- | ------------------------------------ |
| `string`       | `string`         | Text input / text display            |
| `text`         | `string`         | Textarea / text display              |
| `integer`      | `number`         | Number input                         |
| `number`       | `number`         | Number input                         |
| `boolean`      | `boolean`        | Checkbox                             |
| `datetime`     | `string`         | Datetime-local input                 |
| `enum`         | `string`         | Select (requires `values`)           |
| `ResourceSpec` | `number` (FK id) | Autocomplete (form) / link (display) |

Unknown API types fall back to `string`.

### Resource references (relations)

Use another resource spec as the `type` to create a relation field:

```ts
import { userResource } from '@/features/users/user.resource'

export const companyResource = defineResource({
  name: 'company',
  path: '/api/backoffice/companies',
  fields: {
    owner_id: { type: userResource },
  },
})
```

On list/detail pages this renders as a link to the related record. On create/edit pages it renders as an autocomplete that searches `{userResource.path}?search=...`.

### `title`

Used in page headers and as the display label for related resource autocompletes:

```ts
title: (company) => `${company.name} (${company.status})`,
```

Falls back to `"{Resource} {id}"` when not specified.

---

## Routes

`createResourceRoutes(spec, useStore)` registers four routes. The route segment is the last path segment of `spec.path`.

| Path                  | Page   | Action                                           |
| --------------------- | ------ | ------------------------------------------------ |
| `/{segment}`          | List   | Paginated table of preview fields                |
| `/{segment}/create`   | Create | Blank form for all writable fields               |
| `/{segment}/:id`      | Detail | Read-only view with Back / Edit / Delete buttons |
| `/{segment}/:id/edit` | Edit   | Pre-filled form with Save / Cancel buttons       |

---

## Store (`createResourceController`)

```ts
const { useStore: useCompanyStore } = createResourceController(companyResource)
```

The store satisfies `ResourcePageStore`:

```ts
interface ResourcePageStore {
  // state
  list: ListModel[]
  listMeta: ResourceListMetadata | null // pagination, total, current_page, etc.
  item: Model | null
  itemMeta: ResourceMetadata | null // includes schema from GET /:id response
  schemaFields: ResourceSchemaField[] // fetched from /_schema (for create page)
  loading: boolean
  error: string | null

  // actions
  fetchSchema(): Promise<void>
  fetchList(params?: Record<string, string>): Promise<void>
  fetchItem(id: ResourceId): Promise<void>
  create(data: Record<string, unknown>): Promise<unknown>
  update(id: ResourceId, data: Record<string, unknown>): Promise<unknown>
  remove(id: ResourceId): Promise<void>
}
```

All actions set `loading = true` while in-flight and populate `error` on failure.

---

## API client (`createResourceApi`)

```ts
type ResourceApi<Model> = {
  schema(): Promise<ResourceSchemaField[]>
  list(params?): Promise<ResourceListResponse<Model>>
  get(id): Promise<ResourceResponse<Model>>
  create(data): Promise<ResourceResponse<Model>>
  update(id, data): Promise<ResourceResponse<Model> | null> // null on 204
  remove(id): Promise<void>
}
```

| Method | Path             | Action   |
| ------ | ---------------- | -------- |
| GET    | `{path}/_schema` | `schema` |
| GET    | `{path}`         | `list`   |
| GET    | `{path}/:id`     | `get`    |
| POST   | `{path}`         | `create` |
| PATCH  | `{path}/:id`     | `update` |
| DELETE | `{path}/:id`     | `remove` |

---

## Custom field components

Every field component receives `FieldProps` via `defineProps` and the value via `defineModel`:

```ts
interface FieldProps {
  label: string
  name: string
  type: string
  resource: string
  page: 'LIST' | 'VIEW' | 'EDIT' | 'CREATE'
  readOnly?: boolean
}
```

```vue
<script setup lang="ts">
import type { FieldProps } from '@/libs/vue-resource'
import { useFieldEditable } from '@/libs/vue-resource'

const value = defineModel<string>('value')
const props = defineProps<FieldProps>()
const editable = useFieldEditable(props) // false on LIST/VIEW or when readOnly
</script>
```

Use `SelectFieldProps<T>` for `enum` fields (adds `options: T[]`).

### Resource autocomplete fields

Register via `config.fields.resource`. The component receives `AutocompleteFieldProps`:

```ts
interface AutocompleteFieldProps extends FieldProps {
  refSpec: ResourceSpec // for routing
  search(params: Record<string, string>): Promise<ResourceOption[]>
  fetchLabel(id: number): Promise<string>
  title(item: Record<string, unknown>): string
}
```

Use `useAutocomplete(props)` to get debounce, option state, and label init:

```ts
const { options, inputText, open, search, clear, selectOption, onBlur, initLabel } =
  useAutocomplete(props)

// guard min length yourself, then call with any params:
@input="inputText.length >= 2 ? search({ search: inputText }) : clear()"

onMounted(() => initLabel(value.value))
```

To build the search/title/fetchLabel props outside a component (e.g. for testing or composition), use `buildResourceFieldProps(refSpec)`.

---

## Custom button components

Register via `config.buttons`. The component receives `CustomButtonProps`:

```ts
interface CustomButtonProps {
  type: 'submit' | 'button' // native HTML type
  label: string // default label text
  variant: 'primary' | 'secondary'
  princeType: PrinceButtonType // 'Submit' | 'Cancel' | 'Create' | ...
}
```

Buttons use `inheritAttrs: false` internally — any extra attributes (e.g. `form="..."`) are passed through via `$attrs`.

---

## Custom page components

The most powerful escape hatch — replace an entire page with your own component. The library still owns routing and data loading; your component receives everything as typed props.

### Register per resource

```ts
// features/products/product.resource.ts
import ProductListPage from './ui/ProductListPage.vue'
import ProductView from './ui/ProductView.vue'

export const productResource = defineResource({
  name: 'product',
  path: '/api/backoffice/products',
  components: {
    list: ProductListPage, // replaces ResourceListPage
    view: ProductView, // replaces ResourceDetailPage
    create: ProductCreate, // replaces ResourceCreatePage
    edit: ProductEdit, // replaces ResourceEditPage
  },
})
```

All four keys are optional — omit any you want to keep as default.

### Props injected per page

Import the matching interface and pass it to `defineProps`:

```vue
<!-- ProductListPage.vue -->
<script setup lang="ts">
import type { ResourceListPageProps } from '@/libs/vue-resource'

const props = defineProps<ResourceListPageProps>()
// props.items         — current page of records
// props.schema        — field definitions (name + type)
// props.labels        — label overrides from spec.fields
// props.resource      — resource name string
// props.loading       — true while fetching
// props.error         — error message or null
// props.listMeta      — pagination info (total, last_page, per_page, …)
// props.page          — current page number
// props.navigateToItem(item)  — go to detail page
// props.goToPage(n)           — go to page n
// props.createNew()           — go to create page
</script>
```

| Page     | Props interface           | Key props                                                              |
| -------- | ------------------------- | ---------------------------------------------------------------------- |
| `list`   | `ResourceListPageProps`   | `items`, `listMeta`, `page`, `navigateToItem`, `goToPage`, `createNew` |
| `view`   | `ResourceViewPageProps`   | `item`, `itemTitle`, `back`, `edit`, `remove`                          |
| `create` | `ResourceCreatePageProps` | `schema`, `submit(data)`, `cancel`                                     |
| `edit`   | `ResourceEditPageProps`   | `item`, `itemTitle`, `submit(data)`, `cancel`                          |

All interfaces also include `schema`, `labels`, `resource`, `loading`, and `error`.

### Full example — custom list page

```vue
<template>
  <div>
    <button @click="props.createNew">New product</button>

    <table>
      <tr v-for="item in props.items" :key="item.id" @click="props.navigateToItem(item)">
        <td>{{ item.name }}</td>
        <td>{{ item.status }}</td>
      </tr>
    </table>

    <div>
      Page {{ props.page }} of {{ props.listMeta?.last_page }}
      <button @click="props.goToPage(props.page - 1)">←</button>
      <button @click="props.goToPage(props.page + 1)">→</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceListPageProps } from '@/libs/vue-resource'

const props = defineProps<ResourceListPageProps>()
</script>
```

### Full example — custom edit page

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" />
    <button type="button" @click="props.cancel">Cancel</button>
    <button type="submit">Save</button>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ResourceEditPageProps } from '@/libs/vue-resource'

const props = defineProps<ResourceEditPageProps>()
const form = reactive({ name: (props.item?.name as string) ?? '' })

async function handleSubmit() {
  await props.submit({ ...form })
}
</script>
```

`submit` and `cancel` handle navigation automatically — you don't call `useRouter` yourself.

---

## Custom layout components

Replace the card shell or the table independently via `configureVuePrince({ layout: { card, table } })`.

### `card`

Replaces the entire card wrapper used on every built-in page. The component receives `LayoutCardProps` and three slots:

| Slot        | Content                             |
| ----------- | ----------------------------------- |
| `#header`   | Page title area + action buttons    |
| _(default)_ | Page content (form fields / detail) |
| `#footer`   | Action buttons / pagination         |

```ts
import type { LayoutCardProps } from '@/libs/vue-resource'
```

```vue
<!-- MyCard.vue -->
<template>
  <div v-if="$slots.header || title" class="my-card-header">
    <span v-if="title">{{ title }}</span>
    <slot name="header" />
  </div>
  <div class="my-card-body">
    <slot />
  </div>
  <div v-if="$slots.footer" class="my-card-footer">
    <slot name="footer" />
  </div>
</template>

<script setup lang="ts">
import type { LayoutCardProps } from '@/libs/vue-resource'
defineProps<LayoutCardProps>()
</script>
```

```ts
configureVuePrince({ layout: { card: MyCard } })
```

### `table`

Wraps or replaces the list table. Receives `LayoutTableProps` and a `<slot />` with the default `<table>`.

```ts
import type { LayoutTableProps } from '@/libs/vue-resource'
```

The component can wrap the default table (`<slot />`) or ignore it and render entirely from `items` / `schema` props.

---

## CSS class conventions

### Field wrappers

Every field component emits:

```
field--{type}   {resource}-{name}   {resource}--{name}   field-{name}
```

Table `<th>` and `<td>` cells add the same classes. `<td>` cells also add:

```
field--{name}-{slugify(value)}
```

### Tables

```
resource-table   {resource}-table
```

### Example targeting

```css
/* all datetime fields */
.field--datetime {
  white-space: nowrap;
}

/* the status column in companies table */
.field-company-status {
  font-weight: 600;
}

/* a specific enum value anywhere */
.field--status-active {
  color: green;
}
```

---

## File structure

```
src/libs/vue-resource/
├── index.ts                     # all public exports
├── config.ts                    # configureVuePrince, VuePrinceConfig
├── resource.ts                  # defineResource, ResourceSpec, type inference
├── resource-api.ts              # createResourceApi
├── resource-controller.ts       # createResourceController
├── resource-routes.ts           # createResourceRoutes, ResourcePageStore
├── api.ts                       # response/metadata types
├── field-props.ts               # FieldProps, SelectFieldProps, AutocompleteFieldProps,
│                                #   ResourceFieldProps, useFieldEditable, useAutocomplete
├── button-props.ts              # PrinceButtonType, CustomButtonProps
├── page-props.ts                # ResourceListPageProps, ResourceViewPageProps,
│                                #   ResourceCreatePageProps, ResourceEditPageProps
├── pages/                       # orchestrator pages (routing + data wiring)
│   ├── ResourceListPage.vue
│   ├── ResourceCreatePage.vue
│   ├── ResourceDetailPage.vue
│   ├── ResourceEditPage.vue
│   └── useResourceMeta.ts       # useResourceSchema, useResourceLabels
└── ui/                          # reusable UI primitives (no routing, props-only)
    ├── prince.css               # CSS design tokens (optional import)
    ├── PrinceButton.vue
    ├── PrinceCard.vue
    ├── ResourceListView.vue     # table + loading/error state
    ├── ResourceDetailView.vue   # read-only field display
    ├── ResourceFormView.vue     # editable form with submit/cancel
    └── fields/
        ├── index.ts             # resolveFieldComponent, buildResourceFieldProps,
        │                        #   normalizeFieldType, toFieldLabel, slugify
        ├── field-base.css       # shared field styles
        ├── TextField.vue
        ├── NumberField.vue
        ├── TextAreaField.vue
        ├── CheckboxField.vue
        ├── DateTimeField.vue
        ├── SelectField.vue
        └── ResourceField.vue
```
