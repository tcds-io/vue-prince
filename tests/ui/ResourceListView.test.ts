import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ResourceListView from '../../src/ui/ResourceListView.vue'
import { configureVuePrince } from '../../src/config'

const schema = [
  { name: 'id', type: 'integer' },
  { name: 'status', type: 'enum' },
]

const items = [
  { id: 1, status: 'active', _resource: 'company' },
  { id: 2, status: 'inactive', _resource: 'company' },
] as any[]

function mountView(overrides: Record<string, unknown> = {}) {
  return mount(ResourceListView, {
    props: {
      items,
      schema,
      loading: false,
      error: null,
      resource: 'company',
      labels: {},
      ...overrides,
    },
  })
}

describe('ResourceListView', () => {
  beforeEach(() => configureVuePrince({ api: { baseUrl: '' } }))

  describe('error state', () => {
    it('shows the error message', () => {
      const wrapper = mountView({ error: 'Network error' })
      expect(wrapper.text()).toContain('Failed to list Companies')
    })

    it('does not render the table', () => {
      const wrapper = mountView({ error: 'Network error' })
      expect(wrapper.find('table').exists()).toBe(false)
    })
  })

  describe('loading state', () => {
    it('applies 0.5 opacity while loading', () => {
      const wrapper = mountView({ loading: true })
      expect(wrapper.find('[style]').attributes('style')).toContain('opacity: 0.5')
    })

    it('applies full opacity when not loading', () => {
      const wrapper = mountView({ loading: false })
      expect(wrapper.find('[style]').attributes('style')).toContain('opacity: 1')
    })
  })

  describe('table headers', () => {
    it('renders a header for each schema field', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('th')).toHaveLength(2)
    })

    it('generates labels from field names', () => {
      const wrapper = mountView()
      const texts = wrapper.findAll('th').map((th) => th.text())
      expect(texts).toContain('Id')
      expect(texts).toContain('Status')
    })

    it('uses label overrides when provided', () => {
      const wrapper = mountView({ labels: { status: 'Account Status' } })
      expect(wrapper.findAll('th')[1].text()).toBe('Account Status')
    })

    it('applies field type class to th', () => {
      const wrapper = mountView()
      expect(wrapper.find('th').classes()).toContain('field--integer')
    })

    it('applies resource-field class to th', () => {
      const wrapper = mountView()
      expect(wrapper.find('th').classes()).toContain('field-company-id')
    })
  })

  describe('table rows', () => {
    it('renders one row per item', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('renders item values in cells', () => {
      const wrapper = mountView()
      const texts = wrapper.findAll('td').map((td) => td.text())
      expect(texts).toContain('1')
      expect(texts).toContain('active')
    })

    it('applies field type class to td', () => {
      const wrapper = mountView()
      expect(wrapper.find('td').classes()).toContain('field--integer')
    })

    it('applies value-slug class to td', () => {
      const wrapper = mountView()
      // second td in first row is status='active' → field--status-active
      expect(wrapper.findAll('td')[1].classes()).toContain('field--status-active')
    })

    it('adds selectable class when onRowClick is provided', () => {
      const wrapper = mountView({ onRowClick: vi.fn() })
      expect(wrapper.find('tbody tr').classes()).toContain('selectable')
    })

    it('does not add selectable class without onRowClick', () => {
      const wrapper = mountView()
      expect(wrapper.find('tbody tr').classes()).not.toContain('selectable')
    })

    it('calls onRowClick with the item on row click', async () => {
      const onRowClick = vi.fn()
      const wrapper = mountView({ onRowClick })
      await wrapper.find('tbody tr').trigger('click')
      expect(onRowClick).toHaveBeenCalledWith(items[0])
    })
  })

  describe('resource table classes', () => {
    it('adds resource-table class', () => {
      const wrapper = mountView()
      expect(wrapper.find('table').classes()).toContain('resource-table')
    })

    it('adds resource-specific table class', () => {
      const wrapper = mountView()
      expect(wrapper.find('table').classes()).toContain('company-table')
    })
  })

  describe('custom layout.table', () => {
    it('renders custom table wrapper component', () => {
      const MyTable = defineComponent({ template: '<div class="my-table"><slot/></div>' })
      configureVuePrince({ api: { baseUrl: '' }, layout: { table: MyTable } })
      const wrapper = mountView()
      expect(wrapper.find('.my-table').exists()).toBe(true)
    })
  })

  describe('sortable columns', () => {
    const sortableFields = {
      id: { type: 'integer' as const },
      status: { type: 'enum' as const, list: { sortable: true } },
    }

    function mountSortable(overrides: Record<string, unknown> = {}) {
      return mountView({ fields: sortableFields, onSort: vi.fn(), ...overrides })
    }

    it('renders a toggle button only for sortable columns', () => {
      const wrapper = mountSortable()
      const headers = wrapper.findAll('th')
      expect(headers[0].find('button').exists()).toBe(false)
      expect(headers[1].find('button').exists()).toBe(true)
    })

    it('keeps the column label on the toggle button', () => {
      const wrapper = mountSortable({ labels: { status: 'Account Status' } })
      expect(wrapper.findAll('th')[1].text()).toContain('Account Status')
    })

    it('marks sortable headers with the sortable class', () => {
      const wrapper = mountSortable()
      expect(wrapper.findAll('th')[1].classes()).toContain('field--sortable')
      expect(wrapper.findAll('th')[0].classes()).not.toContain('field--sortable')
    })

    it('renders no toggle when onSort is absent', () => {
      const wrapper = mountView({ fields: sortableFields })
      expect(wrapper.find('th button').exists()).toBe(false)
    })

    it('calls onSort with the column name on click', async () => {
      const onSort = vi.fn()
      const wrapper = mountSortable({ onSort })
      await wrapper.findAll('th')[1].find('button').trigger('click')
      expect(onSort).toHaveBeenCalledWith('status')
    })

    it('reports aria-sort none on an unsorted sortable column', () => {
      const wrapper = mountSortable()
      expect(wrapper.findAll('th')[1].attributes('aria-sort')).toBe('none')
    })

    it('reports aria-sort ascending on the sorted column', () => {
      const wrapper = mountSortable({ sort: { column: 'status', direction: 'asc' } })
      expect(wrapper.findAll('th')[1].attributes('aria-sort')).toBe('ascending')
    })

    it('reports aria-sort descending on the sorted column', () => {
      const wrapper = mountSortable({ sort: { column: 'status', direction: 'desc' } })
      expect(wrapper.findAll('th')[1].attributes('aria-sort')).toBe('descending')
    })

    it('omits aria-sort on columns that are not sortable', () => {
      const wrapper = mountSortable()
      expect(wrapper.findAll('th')[0].attributes('aria-sort')).toBeUndefined()
    })

    it('marks the sorted column with the sorted class', () => {
      const wrapper = mountSortable({ sort: { column: 'status', direction: 'asc' } })
      expect(wrapper.findAll('th')[1].classes()).toContain('field--sorted')
    })

    it('shows a direction indicator for the sorted column', () => {
      const ascending = mountSortable({ sort: { column: 'status', direction: 'asc' } })
      expect(ascending.find('.prince-sort-indicator').text()).toBe('↑')

      const descending = mountSortable({ sort: { column: 'status', direction: 'desc' } })
      expect(descending.find('.prince-sort-indicator').text()).toBe('↓')
    })

    it('shows a neutral indicator when the column is not the sorted one', () => {
      const wrapper = mountSortable({ sort: { column: 'id', direction: 'asc' } })
      expect(wrapper.find('.prince-sort-indicator').text()).toBe('↕')
    })
  })

  describe('fields.list.formatter', () => {
    const refSchema = [{ name: 'company_id', type: 'integer' }]
    const refItems = [
      { id: 1, company_id: 3, _resource: 'order' },
      { id: 2, company_id: 7, _resource: 'order' },
    ] as any[]

    it('shows raw value when no formatter is provided', () => {
      const wrapper = mountView({ items: refItems, schema: refSchema })
      const cells = wrapper.findAll('td').map((td) => td.text())
      expect(cells).toContain('3')
      expect(cells).toContain('7')
    })

    it('applies formatter when provided for a field', () => {
      const map: Record<string, string> = { '3': 'Acme Corp', '7': 'Beta Ltd' }
      const wrapper = mountView({
        items: refItems,
        schema: refSchema,
        fields: {
          company_id: {
            type: 'integer',
            list: { formatter: (id: unknown) => map[String(id)] ?? String(id) },
          },
        },
      })
      const cells = wrapper.findAll('td').map((td) => td.text())
      expect(cells).toContain('Acme Corp')
      expect(cells).toContain('Beta Ltd')
    })

    it('falls back to raw value when formatter has no entry', () => {
      const map: Record<string, string> = { '3': 'Acme Corp' }
      const wrapper = mountView({
        items: refItems,
        schema: refSchema,
        fields: {
          company_id: {
            type: 'integer',
            list: { formatter: (id: unknown) => map[String(id)] ?? String(id) },
          },
        },
      })
      const cells = wrapper.findAll('td').map((td) => td.text())
      expect(cells).toContain('Acme Corp')
      expect(cells).toContain('7')
    })
  })

  describe('row selection', () => {
    const selectionCheckboxes = (wrapper: ReturnType<typeof mountView>) =>
      wrapper.findAll<HTMLInputElement>('.field--selection input[type="checkbox"]')

    it('renders no selection column without the selection props', () => {
      const wrapper = mountView()
      expect(selectionCheckboxes(wrapper)).toHaveLength(0)
    })

    it('renders no selection column when only the selection is given', () => {
      const wrapper = mountView({ selection: [] })
      expect(selectionCheckboxes(wrapper)).toHaveLength(0)
    })

    it('renders a checkbox per row once selection is controlled', () => {
      const wrapper = mountView({ selection: [], onToggleSelection: vi.fn() })
      expect(selectionCheckboxes(wrapper)).toHaveLength(items.length)
    })

    it('checks only the rows present in the selection', () => {
      const wrapper = mountView({ selection: [2], onToggleSelection: vi.fn() })
      const checked = selectionCheckboxes(wrapper).map((box) => box.element.checked)
      expect(checked).toEqual([false, true])
    })

    it('marks a selected row with the selected class', () => {
      const wrapper = mountView({ selection: [1], onToggleSelection: vi.fn() })
      const rows = wrapper.findAll('tbody tr').map((row) => row.classes())
      expect(rows[0]).toContain('row--selected')
      expect(rows[1]).not.toContain('row--selected')
    })

    it('calls onToggleSelection with the row id', async () => {
      const onToggleSelection = vi.fn()
      const wrapper = mountView({ selection: [], onToggleSelection })
      await selectionCheckboxes(wrapper)[1].setValue(true)
      expect(onToggleSelection).toHaveBeenCalledWith(2)
    })

    it('does not trigger onRowClick when the checkbox is clicked', async () => {
      const onRowClick = vi.fn()
      const wrapper = mountView({ selection: [], onToggleSelection: vi.fn(), onRowClick })
      await selectionCheckboxes(wrapper)[0].trigger('click')
      expect(onRowClick).not.toHaveBeenCalled()
    })

    it('renders no header checkbox without onToggleAllSelection', () => {
      const wrapper = mountView({ selection: [], onToggleSelection: vi.fn() })
      expect(wrapper.find('thead .field--selection input').exists()).toBe(false)
    })

    it('checks the header checkbox when every row is selected', () => {
      const wrapper = mountView({
        selection: [1, 2],
        onToggleSelection: vi.fn(),
        onToggleAllSelection: vi.fn(),
      })
      const header = wrapper.find<HTMLInputElement>('thead .field--selection input')
      expect(header.element.checked).toBe(true)
      expect(header.element.indeterminate).toBe(false)
    })

    it('marks the header checkbox indeterminate on a partial selection', () => {
      const wrapper = mountView({
        selection: [1],
        onToggleSelection: vi.fn(),
        onToggleAllSelection: vi.fn(),
      })
      const header = wrapper.find<HTMLInputElement>('thead .field--selection input')
      expect(header.element.checked).toBe(false)
      expect(header.element.indeterminate).toBe(true)
    })

    it('leaves the header checkbox unchecked when no row is selected', () => {
      const wrapper = mountView({
        selection: [],
        onToggleSelection: vi.fn(),
        onToggleAllSelection: vi.fn(),
      })
      const header = wrapper.find<HTMLInputElement>('thead .field--selection input')
      expect(header.element.checked).toBe(false)
      expect(header.element.indeterminate).toBe(false)
    })

    it('asks to select every row when the header checkbox is ticked', async () => {
      const onToggleAllSelection = vi.fn()
      const wrapper = mountView({
        selection: [],
        onToggleSelection: vi.fn(),
        onToggleAllSelection,
      })
      await wrapper.find('thead .field--selection input').setValue(true)
      expect(onToggleAllSelection).toHaveBeenCalledWith(true)
    })

    it('asks to clear the selection when the header checkbox is unticked', async () => {
      const onToggleAllSelection = vi.fn()
      const wrapper = mountView({
        selection: [1, 2],
        onToggleSelection: vi.fn(),
        onToggleAllSelection,
      })
      await wrapper.find('thead .field--selection input').setValue(false)
      expect(onToggleAllSelection).toHaveBeenCalledWith(false)
    })

    it('leaves the header checkbox unchecked when there are no rows at all', () => {
      const wrapper = mountView({
        items: [],
        selection: [],
        onToggleSelection: vi.fn(),
        onToggleAllSelection: vi.fn(),
      })
      const header = wrapper.find<HTMLInputElement>('thead .field--selection input')
      expect(header.element.checked).toBe(false)
    })
  })
})
