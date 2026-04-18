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
  beforeEach(() => configureVuePrince({ baseUrl: '' }))

  describe('error state', () => {
    it('shows the error message', () => {
      const wrapper = mountView({ error: 'Network error' })
      expect(wrapper.text()).toContain('Network error')
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
      configureVuePrince({ baseUrl: '', layout: { table: MyTable } })
      const wrapper = mountView()
      expect(wrapper.find('.my-table').exists()).toBe(true)
    })
  })

  describe('resourceLabelMap', () => {
    const refSchema = [{ name: 'company_id', type: 'integer' }]
    const refItems = [
      { id: 1, company_id: 3, _resource: 'order' },
      { id: 2, company_id: 7, _resource: 'order' },
    ] as any[]

    it('shows raw ID when no resourceLabelMap is provided', () => {
      const wrapper = mountView({ items: refItems, schema: refSchema })
      const cells = wrapper.findAll('td').map((td) => td.text())
      expect(cells).toContain('3')
      expect(cells).toContain('7')
    })

    it('resolves label from resourceLabelMap when available', () => {
      const wrapper = mountView({
        items: refItems,
        schema: refSchema,
        resourceLabelMap: { company_id: { '3': 'Acme Corp', '7': 'Beta Ltd' } },
      })
      const cells = wrapper.findAll('td').map((td) => td.text())
      expect(cells).toContain('Acme Corp')
      expect(cells).toContain('Beta Ltd')
    })

    it('falls back to raw ID when map has no entry for that ID', () => {
      const wrapper = mountView({
        items: refItems,
        schema: refSchema,
        resourceLabelMap: { company_id: { '3': 'Acme Corp' } },
      })
      const cells = wrapper.findAll('td').map((td) => td.text())
      expect(cells).toContain('Acme Corp')
      expect(cells).toContain('7')
    })
  })
})
