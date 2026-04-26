import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import PrinceCard from '../../src/ui/PrinceCard.vue'
import { configureVuePrince } from '../../src/config'

describe('PrinceCard', () => {
  beforeEach(() => configureVuePrince({ api: { baseUrl: '' } }))

  it('renders the default card wrapper', () => {
    const wrapper = mount(PrinceCard)
    expect(wrapper.find('.prince-card--default').exists()).toBe(true)
  })

  it('shows title text in the header', () => {
    const wrapper = mount(PrinceCard, { props: { title: 'Companies' } })
    expect(wrapper.find('.prince-card__header').text()).toContain('Companies')
  })

  it('does not render header section when no title and no header slot', () => {
    const wrapper = mount(PrinceCard)
    expect(wrapper.find('.prince-card__header').exists()).toBe(false)
  })

  it('renders header slot alongside the title', () => {
    const wrapper = mount(PrinceCard, {
      props: { title: 'Companies' },
      slots: { header: '<button>Create</button>' },
    })
    const header = wrapper.find('.prince-card__header')
    expect(header.text()).toContain('Companies')
    expect(header.text()).toContain('Create')
  })

  it('renders default slot content in the card body', () => {
    const wrapper = mount(PrinceCard, { slots: { default: '<p class="body-content">Hello</p>' } })
    expect(wrapper.find('.prince-card__body .body-content').exists()).toBe(true)
  })

  it('renders footer slot content', () => {
    const wrapper = mount(PrinceCard, { slots: { footer: '<button class="save">Save</button>' } })
    expect(wrapper.find('.prince-card__footer .save').exists()).toBe(true)
  })

  it('does not render footer section when no footer slot', () => {
    const wrapper = mount(PrinceCard)
    expect(wrapper.find('.prince-card__footer').exists()).toBe(false)
  })

  it('renders header section when only header slot is provided (no title)', () => {
    const wrapper = mount(PrinceCard, { slots: { header: '<button>New</button>' } })
    expect(wrapper.find('.prince-card__header').exists()).toBe(true)
  })

  describe('custom layout.card', () => {
    it('renders the custom card component instead of the default', () => {
      const MyCard = defineComponent({ template: '<section class="my-card"><slot/></section>' })
      configureVuePrince({ api: { baseUrl: '' }, layout: { card: MyCard } })
      const wrapper = mount(PrinceCard)
      expect(wrapper.find('.my-card').exists()).toBe(true)
      expect(wrapper.find('.prince-card--default').exists()).toBe(false)
    })

    it('passes title prop to custom card component', () => {
      const MyCard = defineComponent({ props: ['title'], template: '<div>{{ title }}</div>' })
      configureVuePrince({ api: { baseUrl: '' }, layout: { card: MyCard } })
      const wrapper = mount(PrinceCard, { props: { title: 'My Title' } })
      expect(wrapper.text()).toContain('My Title')
    })
  })
})
