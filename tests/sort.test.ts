import { describe, it, expect } from 'vitest'
import { formatSort, parseSort, toggleSort } from '../src/sort'

describe('parseSort', () => {
  it('defaults the direction to asc', () => {
    expect(parseSort('title')).toEqual({ column: 'title', direction: 'asc' })
  })

  it('reads an explicit asc direction', () => {
    expect(parseSort('title:asc')).toEqual({ column: 'title', direction: 'asc' })
  })

  it('reads an explicit desc direction', () => {
    expect(parseSort('title:desc')).toEqual({ column: 'title', direction: 'desc' })
  })

  it('reads only the first column of a multi-column value', () => {
    expect(parseSort('title:desc,amount:asc')).toEqual({ column: 'title', direction: 'desc' })
  })

  it('trims surrounding whitespace', () => {
    expect(parseSort('  title:desc  ')).toEqual({ column: 'title', direction: 'desc' })
  })

  it('returns null for an empty value', () => {
    expect(parseSort('')).toBeNull()
  })

  it('returns null for a whitespace-only value', () => {
    expect(parseSort('   ')).toBeNull()
  })

  it('returns null for a non-string value', () => {
    expect(parseSort(undefined)).toBeNull()
    expect(parseSort(['title'])).toBeNull()
  })

  it('returns null for an unknown direction', () => {
    expect(parseSort('title:sideways')).toBeNull()
  })

  it('returns null when the column is missing', () => {
    expect(parseSort(':desc')).toBeNull()
  })
})

describe('formatSort', () => {
  it('joins the column and direction with a colon', () => {
    expect(formatSort({ column: 'title', direction: 'desc' })).toBe('title:desc')
  })
})

describe('toggleSort', () => {
  it('sorts a previously unsorted column ascending', () => {
    expect(toggleSort(null, 'title')).toEqual({ column: 'title', direction: 'asc' })
  })

  it('flips an ascending column to descending', () => {
    expect(toggleSort({ column: 'title', direction: 'asc' }, 'title')).toEqual({
      column: 'title',
      direction: 'desc',
    })
  })

  it('clears the sort when a descending column is toggled again', () => {
    expect(toggleSort({ column: 'title', direction: 'desc' }, 'title')).toBeNull()
  })

  it('starts a different column ascending regardless of the current direction', () => {
    expect(toggleSort({ column: 'title', direction: 'desc' }, 'amount')).toEqual({
      column: 'amount',
      direction: 'asc',
    })
  })
})
