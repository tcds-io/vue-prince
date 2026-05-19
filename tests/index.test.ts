import { describe, it, expect } from 'vitest'
import { resolveFieldComponent, normalizeFieldType } from '../src'

describe('public exports', () => {
  it('exposes resolveFieldComponent and normalizeFieldType from the package entry', () => {
    expect(typeof resolveFieldComponent).toBe('function')
    expect(typeof normalizeFieldType).toBe('function')
  })
})
