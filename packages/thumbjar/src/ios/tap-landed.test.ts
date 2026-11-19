import {describe, expect, test} from 'vitest'
import {tapLanded} from './tap-landed.ts'

describe(tapLanded.name, () => {
  test('counts a defaultPrevented beforeinput as landed', () => {
    expect(
      tapLanded(
        {text: '', events: []},
        {text: '', events: [{type: 'beforeinput', defaultPrevented: true}]},
      ),
    ).toEqual(true)
  })

  test('counts input as landed', () => {
    expect(
      tapLanded({text: '', events: []}, {text: '', events: [{type: 'input'}]}),
    ).toEqual(true)
  })

  test('counts compositionstart as landed', () => {
    expect(
      tapLanded(
        {text: '', events: []},
        {text: '', events: [{type: 'compositionstart'}]},
      ),
    ).toEqual(true)
  })

  test('counts changed text without a new event as dropped', () => {
    expect(
      tapLanded({text: '', events: []}, {text: 'foo', events: []}),
    ).toEqual(false)
  })

  test('counts no events and unchanged text as dropped', () => {
    expect(tapLanded({text: '', events: []}, {text: '', events: []})).toEqual(
      false,
    )
  })

  test('ignores events recorded before the tap', () => {
    expect(
      tapLanded(
        {text: '', events: [{type: 'input'}]},
        {text: '', events: [{type: 'input'}, {type: 'focus'}]},
      ),
    ).toEqual(false)
  })
})
