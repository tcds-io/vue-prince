export type ResourceSortDirection = 'asc' | 'desc'

export type ResourceSort = {
  column: string
  direction: ResourceSortDirection
}

/**
 * Reads the column a list is currently sorted by out of a raw `?sort=` value.
 *
 * Only the first column is returned — the backend accepts a comma-separated list, but the
 * table header UI reflects and toggles a single column at a time. Returns null for a value
 * it can't interpret, so a hand-crafted URL shows no indicator rather than a wrong one.
 */
export function parseSort(raw: unknown): ResourceSort | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null

  const [column, direction = 'asc'] = raw.split(',')[0].trim().split(':')
  if (!column.trim()) return null
  if (direction !== 'asc' && direction !== 'desc') return null

  return { column: column.trim(), direction }
}

export function formatSort(sort: ResourceSort): string {
  return `${sort.column}:${sort.direction}`
}

/**
 * Cycles a column through ascending → descending → unsorted.
 */
export function toggleSort(current: ResourceSort | null, column: string): ResourceSort | null {
  if (current?.column !== column) return { column, direction: 'asc' }
  if (current.direction === 'asc') return { column, direction: 'desc' }

  return null
}
