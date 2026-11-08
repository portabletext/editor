import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createBareEditor} from '../../../test-utils/create-bare-editor.test-util'
import {withRemoteChanges} from '../../engine-plugins/engine-plugin.remote-changes'
import {normalize} from '../editor/normalize'
import {setNormalizing} from '../editor/set-normalizing'
import type {Editor} from '../interfaces/editor'
import {__dirtyPathRepairStats} from './update-dirty-paths'

describe('dirty path child-array repairs', () => {
  test('scans a marked sibling array once while repairing primitives', () => {
    const editor = createBareEditor([block('initial')]) as Editor
    __dirtyPathRepairStats.scans = 0
    setNormalizing(editor, false)

    withRemoteChanges(editor, 'patches', () => {
      editor.apply({
        type: 'set',
        path: [],
        value: Array.from({length: 2_000}, (_, index) =>
          index % 20 === 0 ? null : block(`b${index}`),
        ) as PortableTextBlock[],
      })
    })

    setNormalizing(editor, true)
    normalize(editor)

    expect(__dirtyPathRepairStats.scans).toBe(3_900)
  })

  test('scans keyless blocks and their children once', () => {
    const editor = createBareEditor([block('initial')]) as Editor
    __dirtyPathRepairStats.scans = 0
    setNormalizing(editor, false)

    withRemoteChanges(editor, 'patches', () => {
      editor.apply({
        type: 'set',
        path: [],
        value: Array.from({length: 2_000}, (_, index) =>
          keylessBlock(`b${index}`),
        ),
      })
    })

    setNormalizing(editor, true)
    normalize(editor)

    expect(__dirtyPathRepairStats.scans).toBe(4_000)
  })

  test('scans no queued paths for keyed unsets in valid data', () => {
    const editor = createBareEditor(
      Array.from({length: 501}, (_, index) => block(`b${index}`)),
    ) as Editor
    __dirtyPathRepairStats.scans = 0

    withRemoteChanges(editor, 'patches', () => {
      setNormalizing(editor, false)
      for (let index = 500; index > 0; index--) {
        editor.apply({type: 'unset', path: [{_key: `b${index}`}]})
      }
      setNormalizing(editor, true)
    })
    normalize(editor)

    expect(__dirtyPathRepairStats.scans).toBe(0)
  })
})

function block(key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}s`, text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function keylessBlock(key: string) {
  const {_key, ...value} = block(key)
  return value
}
