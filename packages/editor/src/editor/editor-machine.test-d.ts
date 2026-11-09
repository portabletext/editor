import type {Patch} from '@portabletext/patches'
import {describe, expectTypeOf, test} from 'vitest'
import type {Editor} from '../editor'
import type {ApplyEvent} from './editor-machine'

declare const editor: Editor
declare const patches: Array<Patch>

describe('editor.send apply', () => {
  test('an apply event is its patches and nothing else', () => {
    expectTypeOf<ApplyEvent>().toEqualTypeOf<{
      type: 'apply'
      patches: Array<Patch>
    }>()
  })

  test('an apply event needs no origin on its patches and no snapshot', () => {
    editor.send({type: 'apply', patches})
  })

  test('an apply event accepts no snapshot', () => {
    // @ts-expect-error - `apply` has no `snapshot` field
    editor.send({type: 'apply', patches, snapshot: undefined})
  })
})
