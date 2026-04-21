import { computed, ref } from 'vue'
import type { ResourceSpec } from './resource'

export type FieldPage = 'LIST' | 'VIEW' | 'EDIT' | 'CREATE'

/** Props for field components — use alongside defineModel for the value */
export interface FieldProps {
  label: string
  name: string
  type: string
  resource: string
  page: FieldPage
  readOnly?: boolean
  error?: string
}

/** Props for enum/select field components */
export interface SelectFieldProps<T> extends FieldProps {
  options: T[]
}

/** A single option returned by a resource search */
export interface ResourceOption {
  id: number
  label: string
}

/** Props for resource autocomplete field components */
export interface ResourceFieldProps extends FieldProps {
  /** The referenced resource spec, for routing (e.g. display link) */
  refSpec: ResourceSpec
  /** Search the referenced resource — returns matching options */
  search: (params: Record<string, string>) => Promise<ResourceOption[]>
  /** Resolve the label for the currently selected id */
  fetchLabel: (id: number) => Promise<string>
  /** Format any resource item as a display label */
  title: (item: Record<string, unknown>) => string
}

/** Returns a computed boolean: true when the field should be editable */
export function useFieldEditable(props: Pick<FieldProps, 'page' | 'readOnly'>) {
  return computed(() => (props.page === 'EDIT' || props.page === 'CREATE') && !props.readOnly)
}

/**
 * Composable for custom resource autocomplete fields.
 * Wraps props.search with debounce and min-length guard so the component
 * only needs to call search(query) and react to options/loading.
 *
 * @example
 * const props = defineProps<ResourceFieldProps>()
 * const { options, loading, inputText, search, selectOption, onBlur } = useAutocomplete(props)
 */
export function useAutocomplete(
  props: Pick<ResourceFieldProps, 'search' | 'fetchLabel'>,
  opts: { debounce?: number } = {},
) {
  const { debounce: debounceMs = 300 } = opts
  const MIN_SEARCH_LENGTH = 2

  const options = ref<ResourceOption[]>([])
  const loading = ref(false)
  const inputText = ref('')
  const open = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null

  function search(params: Record<string, string>) {
    if (timer) clearTimeout(timer)

    const searchTerm = params.search ?? ''
    const search: Record<string, string> =
      searchTerm.length < MIN_SEARCH_LENGTH ? {} : { search: `%${params.search}%` }
    delete params.search

    const queryParams = { ...params, ...search }

    if (Object.entries(queryParams).length === 0) {
      return
    }

    timer = setTimeout(async () => {
      loading.value = true
      try {
        options.value = await props.search(queryParams)
        open.value = options.value.length > 0
      } finally {
        loading.value = false
      }
    }, debounceMs)
  }

  function clear() {
    if (timer) clearTimeout(timer)
    options.value = []
    open.value = false
  }

  function selectOption(opt: ResourceOption, onSelect: (id: number, label: string) => void) {
    inputText.value = opt.label
    open.value = false
    options.value = []
    onSelect(opt.id, opt.label)
  }

  function onBlur() {
    setTimeout(() => {
      open.value = false
    }, 150)
  }

  async function initLabel(id: number | null | undefined) {
    if (id == null) return
    inputText.value = await props.fetchLabel(id)
  }

  return { options, loading, inputText, open, search, clear, selectOption, onBlur, initLabel }
}
