import {describe, expectTypeOf, test} from 'vitest'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Operation} from './operation'

describe('Operation tripwire', () => {
  test('every engine operation is either public or `set.selection`', () => {
    // When the engine grows a new operation type, this fails and forces an
    // explicit decision about whether the new operation becomes public
    // surface. The runtime allowlist in `create-editor.ts` needs the same
    // decision.
    expectTypeOf<
      Exclude<EngineOperation, {type: 'set.selection'}>
    >().toExtend<Operation>()
  })

  test('every public operation is an engine operation', () => {
    expectTypeOf<Operation>().toExtend<EngineOperation>()
  })

  test('the public vocabulary is exactly five operation types', () => {
    expectTypeOf<Operation['type']>().toEqualTypeOf<
      'insert' | 'insert.text' | 'remove.text' | 'set' | 'unset'
    >()
  })
})
