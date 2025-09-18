import {userEvent} from '@vitest/browser/context'
import {describe, expect, test} from 'vitest'
import {InternalChange$Plugin} from '../src/plugins/plugin.internal.change-ref'
import {createTestEditor} from '../src/test/vitest'
import type {EditorChange} from '../src/types/editor'

describe('change$', () => {
  test('emits changes', async () => {
    const changes: Array<EditorChange> = []

    const {locator} = await createTestEditor({
      children: (
        <InternalChange$Plugin
          onChange={(change) => {
            changes.push(change)
          }}
        />
      ),
    })

    expect(changes).toEqual([{type: 'ready'}])

    await userEvent.type(locator, 'f')

    expect(changes).toEqual([
      {type: 'ready'},
      expect.objectContaining({type: 'focus'}),
      expect.objectContaining({type: 'selection'}),
      expect.objectContaining({
        type: 'patch',
        patch: expect.objectContaining({type: 'setIfMissing'}),
      }),
      expect.objectContaining({
        type: 'patch',
        patch: expect.objectContaining({type: 'insert'}),
      }),
      expect.objectContaining({
        type: 'patch',
        patch: expect.objectContaining({type: 'diffMatchPatch'}),
      }),
      expect.objectContaining({type: 'selection'}),
    ])
  })
})
