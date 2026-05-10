import {describe, expect, test} from 'vitest'
import {resolveElementDropPosition} from './resolve-element-drop-position'

describe(resolveElementDropPosition.name, () => {
  test('returns undefined when no drop position is active', () => {
    expect(resolveElementDropPosition(undefined, [{_key: 'k0'}])).toEqual(
      undefined,
    )
  })

  test('matches the drop target by full path', () => {
    expect(
      resolveElementDropPosition({path: [{_key: 'k0'}], position: 'start'}, [
        {_key: 'k0'},
      ]),
    ).toEqual('start')

    expect(
      resolveElementDropPosition({path: [{_key: 'k0'}], position: 'end'}, [
        {_key: 'k0'},
      ]),
    ).toEqual('end')
  })

  test('returns undefined when the element is not the drop target', () => {
    expect(
      resolveElementDropPosition({path: [{_key: 'k0'}], position: 'start'}, [
        {_key: 'k1'},
      ]),
    ).toEqual(undefined)
  })

  test('does not match a deep block that shares a key with the drop target at root', () => {
    // _keys are sibling-unique, not tree-unique. A root block at
    // [{_key:'k0'}] and a deep block at
    // [{_key:'callout'}, 'content', {_key:'k0'}] can both legally have
    // `_key: 'k0'`. A key-only match would paint the drop indicator on
    // both. Path-based match correctly disambiguates.
    expect(
      resolveElementDropPosition({path: [{_key: 'k0'}], position: 'start'}, [
        {_key: 'callout'},
        'content',
        {_key: 'k0'},
      ]),
    ).toEqual(undefined)
  })

  test('matches a deep block targeted by its full path', () => {
    expect(
      resolveElementDropPosition(
        {
          path: [{_key: 'callout'}, 'content', {_key: 'k0'}],
          position: 'end',
        },
        [{_key: 'callout'}, 'content', {_key: 'k0'}],
      ),
    ).toEqual('end')
  })
})
