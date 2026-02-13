import {expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {InternalEditorChangePlugin} from '../src/plugins/plugin.internal.editor-change-ref'
import {createTestEditor} from '../src/test/vitest'
import type {EditorChange} from '../src/types/editor'

test('EditorChange', async () => {
  const changes: Array<EditorChange> = []

  const {locator} = await createTestEditor({
    children: (
      <InternalEditorChangePlugin
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
