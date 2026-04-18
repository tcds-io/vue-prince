import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFieldEditable, useAutocomplete } from '../src'

describe('useFieldEditable', () => {
  it('returns true on EDIT page', () => {
    expect(useFieldEditable({ page: 'EDIT' }).value).toBe(true)
  })

  it('returns true on CREATE page', () => {
    expect(useFieldEditable({ page: 'CREATE' }).value).toBe(true)
  })

  it('returns false on LIST page', () => {
    expect(useFieldEditable({ page: 'LIST' }).value).toBe(false)
  })

  it('returns false on VIEW page', () => {
    expect(useFieldEditable({ page: 'VIEW' }).value).toBe(false)
  })

  it('returns false when readOnly=true on EDIT', () => {
    expect(useFieldEditable({ page: 'EDIT', readOnly: true }).value).toBe(false)
  })

  it('returns false when readOnly=true on CREATE', () => {
    expect(useFieldEditable({ page: 'CREATE', readOnly: true }).value).toBe(false)
  })
})

describe('useAutocomplete', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function makeProps(overrides?: Partial<Parameters<typeof useAutocomplete>[0]>) {
    return {
      search: vi.fn().mockResolvedValue([
        { id: 1, label: 'Acme' },
        { id: 2, label: 'Beta' },
      ]),
      fetchLabel: vi.fn().mockResolvedValue('Acme Corp'),
      ...overrides,
    }
  }

  it('debounces consecutive search calls', async () => {
    const props = makeProps()
    const { search } = useAutocomplete(props)
    search({ search: 'a' })
    search({ search: 'ac' })
    search({ search: 'acm' })
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    expect(props.search).toHaveBeenCalledTimes(1)
  })

  it('does not call search when term is below min length (2)', async () => {
    const props = makeProps()
    const { search } = useAutocomplete(props)
    search({ search: 'a' })
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    expect(props.search).not.toHaveBeenCalled()
  })

  it('calls search when term meets min length', async () => {
    const props = makeProps()
    const { search } = useAutocomplete(props)
    search({ search: 'ac' })
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    expect(props.search).toHaveBeenCalledTimes(1)
  })

  it('populates options after a successful search', async () => {
    const props = makeProps()
    const { search, options } = useAutocomplete(props)
    search({ search: 'ac' })
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    await Promise.resolve()
    expect(options.value).toHaveLength(2)
    expect(options.value[0].label).toBe('Acme')
  })

  it('opens dropdown when results arrive', async () => {
    const props = makeProps()
    const { search, open } = useAutocomplete(props)
    search({ search: 'ac' })
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    await Promise.resolve()
    expect(open.value).toBe(true)
  })

  it('clear empties options and closes dropdown', () => {
    const props = makeProps()
    const { clear, options, open } = useAutocomplete(props)
    open.value = true
    clear()
    expect(options.value).toEqual([])
    expect(open.value).toBe(false)
  })

  it('selectOption updates inputText, closes dropdown, and calls onSelect', () => {
    const props = makeProps()
    const { selectOption, inputText, open } = useAutocomplete(props)
    open.value = true
    const onSelect = vi.fn()
    selectOption({ id: 1, label: 'Acme' }, onSelect)
    expect(inputText.value).toBe('Acme')
    expect(open.value).toBe(false)
    expect(onSelect).toHaveBeenCalledWith(1, 'Acme')
  })

  it('onBlur closes the dropdown after 150ms', () => {
    const props = makeProps()
    const { onBlur, open } = useAutocomplete(props)
    open.value = true
    onBlur()
    expect(open.value).toBe(true)
    vi.advanceTimersByTime(150)
    expect(open.value).toBe(false)
  })

  it('initLabel fetches the label for a given id', async () => {
    const props = makeProps()
    const { initLabel, inputText } = useAutocomplete(props)
    await initLabel(42)
    expect(props.fetchLabel).toHaveBeenCalledWith(42)
    expect(inputText.value).toBe('Acme Corp')
  })

  it('initLabel does nothing for null', async () => {
    const props = makeProps()
    const { initLabel } = useAutocomplete(props)
    await initLabel(null)
    expect(props.fetchLabel).not.toHaveBeenCalled()
  })

  it('initLabel does nothing for undefined', async () => {
    const props = makeProps()
    const { initLabel } = useAutocomplete(props)
    await initLabel(undefined)
    expect(props.fetchLabel).not.toHaveBeenCalled()
  })

  it('respects custom debounce duration', async () => {
    const props = makeProps()
    const { search } = useAutocomplete(props, { debounce: 600 })
    search({ search: 'acme' })
    vi.advanceTimersByTime(300)
    expect(props.search).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    expect(props.search).toHaveBeenCalledTimes(1)
  })
})
