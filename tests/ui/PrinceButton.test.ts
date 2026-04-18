import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import PrinceButton from '../../src/ui/PrinceButton.vue'
import { configureVuePrince } from '../../src/config'
import type { PrinceButtonType } from '../../src/button-props'

describe('PrinceButton', () => {
  beforeEach(() => configureVuePrince({ baseUrl: '' }))

  describe('native button type', () => {
    it('Submit renders type="submit"', () => {
      const wrapper = mount(PrinceButton, { props: { type: 'Submit' } })
      expect(wrapper.find('button').attributes('type')).toBe('submit')
    })

    it.each(['Create', 'Edit', 'Back', 'Cancel', 'Delete', 'Pagination'] as PrinceButtonType[])(
      '%s renders type="button"',
      (type) => {
        const wrapper = mount(PrinceButton, { props: { type } })
        expect(wrapper.find('button').attributes('type')).toBe('button')
      },
    )
  })

  describe('variant CSS class', () => {
    it('Submit gets prince-btn--primary', () => {
      expect(
        mount(PrinceButton, { props: { type: 'Submit' } })
          .find('button')
          .classes(),
      ).toContain('prince-btn--primary')
    })

    it('Create gets prince-btn--primary', () => {
      expect(
        mount(PrinceButton, { props: { type: 'Create' } })
          .find('button')
          .classes(),
      ).toContain('prince-btn--primary')
    })

    it('Delete gets prince-btn--danger', () => {
      expect(
        mount(PrinceButton, { props: { type: 'Delete' } })
          .find('button')
          .classes(),
      ).toContain('prince-btn--danger')
    })

    it.each(['Edit', 'Back', 'Cancel', 'Pagination'] as PrinceButtonType[])(
      '%s gets prince-btn--secondary by default',
      (type) => {
        expect(mount(PrinceButton, { props: { type } }).find('button').classes()).toContain(
          'prince-btn--secondary',
        )
      },
    )

    it('variant prop overrides the derived variant', () => {
      const wrapper = mount(PrinceButton, { props: { type: 'Submit', variant: 'secondary' } })
      expect(wrapper.find('button').classes()).toContain('prince-btn--secondary')
      expect(wrapper.find('button').classes()).not.toContain('prince-btn--primary')
    })
  })

  describe('default labels', () => {
    it.each<[PrinceButtonType, string]>([
      ['Submit', 'Save'],
      ['Create', 'Create'],
      ['Edit', 'Edit'],
      ['Back', 'Back'],
      ['Cancel', 'Cancel'],
      ['Delete', 'Delete'],
      ['Pagination', ''],
    ])('%s has default label "%s"', (type, label) => {
      expect(mount(PrinceButton, { props: { type } }).find('button').text()).toBe(label)
    })

    it('label prop overrides the default', () => {
      const wrapper = mount(PrinceButton, { props: { type: 'Submit', label: 'Confirm & Save' } })
      expect(wrapper.find('button').text()).toBe('Confirm & Save')
    })
  })

  describe('custom button component', () => {
    it('renders the configured custom component instead of <button>', () => {
      const MyBtn = defineComponent({ template: '<span class="custom-btn" />' })
      configureVuePrince({ baseUrl: '', buttons: { Submit: MyBtn } })
      const wrapper = mount(PrinceButton, { props: { type: 'Submit' } })
      expect(wrapper.find('.custom-btn').exists()).toBe(true)
      expect(wrapper.find('button.prince-btn').exists()).toBe(false)
    })

    it('passes type (native HTML type) to custom component', () => {
      const MyBtn = defineComponent({ props: ['type'], template: '<span />' })
      configureVuePrince({ baseUrl: '', buttons: { Submit: MyBtn } })
      const wrapper = mount(PrinceButton, { props: { type: 'Submit' } })
      expect(wrapper.findComponent(MyBtn).props('type')).toBe('submit')
    })

    it('passes label to custom component', () => {
      const MyBtn = defineComponent({ props: ['label'], template: '<span />' })
      configureVuePrince({ baseUrl: '', buttons: { Back: MyBtn } })
      const wrapper = mount(PrinceButton, { props: { type: 'Back' } })
      expect(wrapper.findComponent(MyBtn).props('label')).toBe('Back')
    })

    it('passes variant to custom component', () => {
      const MyBtn = defineComponent({ props: ['variant'], template: '<span />' })
      configureVuePrince({ baseUrl: '', buttons: { Delete: MyBtn } })
      const wrapper = mount(PrinceButton, { props: { type: 'Delete' } })
      expect(wrapper.findComponent(MyBtn).props('variant')).toBe('danger')
    })

    it('passes princeType to custom component', () => {
      const MyBtn = defineComponent({ props: ['princeType'], template: '<span />' })
      configureVuePrince({ baseUrl: '', buttons: { Edit: MyBtn } })
      const wrapper = mount(PrinceButton, { props: { type: 'Edit' } })
      expect(wrapper.findComponent(MyBtn).props('princeType')).toBe('Edit')
    })
  })
})
