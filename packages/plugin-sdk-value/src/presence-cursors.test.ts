import {describe, expect, test} from 'vitest'
import {collapseToCaret} from './presence-cursors'

describe(collapseToCaret.name, () => {
  test('returns `null` for a missing selection', () => {
    expect(collapseToCaret(null)).toEqual(null)
  })

  test('collapses an expanded selection to its focus', () => {
    const focus = {
      path: [{_key: 'block'}, 'children', {_key: 'span'}],
      offset: 7,
    }
    expect(collapseToCaret({anchor: {...focus, offset: 2}, focus})).toEqual({
      anchor: focus,
      focus,
    })
  })
})
