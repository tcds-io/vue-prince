import { describe, it, expect, beforeEach } from 'vitest'
import { configureVuePrince, getConfig } from '../src/config'

describe('configureVuePrince / getConfig', () => {
  beforeEach(() => {
    configureVuePrince({ api: { baseUrl: '' } })
  })

  it('returns default empty api.baseUrl', () => {
    expect(getConfig().api.baseUrl).toBe('')
  })

  it('updates api.baseUrl', () => {
    configureVuePrince({ api: { baseUrl: 'https://api.example.com' } })
    expect(getConfig().api.baseUrl).toBe('https://api.example.com')
  })

  it('replaces the entire config on each call', () => {
    configureVuePrince({ api: { baseUrl: 'https://a.com' }, fields: { string: {} as any } })
    configureVuePrince({ api: { baseUrl: 'https://b.com' } })
    expect(getConfig().api.baseUrl).toBe('https://b.com')
    expect(getConfig().fields).toBeUndefined()
  })

  it('stores field component overrides', () => {
    const MyField = {}
    configureVuePrince({ api: { baseUrl: '' }, fields: { string: MyField as any } })
    expect(getConfig().fields?.string).toBe(MyField)
  })

  it('stores split field component entries', () => {
    const MyForm = {}
    const MyDisplay = {}
    configureVuePrince({
      api: { baseUrl: '' },
      fields: { datetime: { form: MyForm as any, display: MyDisplay as any } },
    })
    const entry = getConfig().fields?.datetime as any
    expect(entry.form).toBe(MyForm)
    expect(entry.display).toBe(MyDisplay)
  })

  it('stores button component overrides', () => {
    const MyButton = {}
    configureVuePrince({ api: { baseUrl: '' }, buttons: { Submit: MyButton as any } })
    expect(getConfig().buttons?.Submit).toBe(MyButton)
  })

  it('stores layout card override', () => {
    const MyCard = {}
    configureVuePrince({ api: { baseUrl: '' }, layout: { card: MyCard as any } })
    expect(getConfig().layout?.card).toBe(MyCard)
  })

  it('stores layout table override', () => {
    const MyTable = {}
    configureVuePrince({ api: { baseUrl: '' }, layout: { table: MyTable as any } })
    expect(getConfig().layout?.table).toBe(MyTable)
  })
})
