import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {defineBehavior, raise} from '../src/behaviors'
import {BehaviorPlugin} from '../src/plugins'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

const pristineRemoteBlock: PortableTextBlock = {
  _type: 'block',
  _key: 'remote-g',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'remote-g-span', text: '', marks: []}],
}

const nonPristineRemoteBlock: PortableTextBlock = {
  _type: 'block',
  _key: 'remote-bar',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'remote-bar-span', text: 'bar', marks: []}],
}

describe('probe: collab/clear/update value', () => {
  test('P1: genuine pristine block via `update value` after a local clear is not re-inserted', async () => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
    })
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(patches.at(-1)).toEqual({
        type: 'unset',
        path: [],
        origin: 'local',
      })
    })

    // The host now genuinely persists a pristine empty block and syncs it in.
    editor.send({type: 'update value', value: [pristineRemoteBlock]})
    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          pristineRemoteBlock,
        ])
      },
      {timeout: 5000},
    )

    const patchCountAfterSync = patches.length
    await userEvent.click(locator)
    await userEvent.type(locator, 'y')

    await vi.waitFor(() => {
      expect(patches.length).toBeGreaterThan(patchCountAfterSync)
    })
    expect(
      patches
        .slice(patchCountAfterSync)
        .filter((patch) => patch.type === 'insert' || patch.type === 'setIfMissing'),
    ).toEqual([])
  })

  test('P1b: the stale re-materialization window survives intervening non-pristine content', async () => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
    })
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(patches.at(-1)).toEqual({
        type: 'unset',
        path: [],
        origin: 'local',
      })
    })

    // Detour: the host syncs in non-pristine content, the user edits it.
    editor.send({type: 'update value', value: [nonPristineRemoteBlock]})
    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          nonPristineRemoteBlock,
        ])
      },
      {timeout: 5000},
    )
    await userEvent.click(locator)
    await userEvent.type(locator, 'z')
    await vi.waitFor(() => {
      expect(patches.at(-1)?.type).toEqual('diffMatchPatch')
    })

    // Much later, the host syncs in a genuine pristine block.
    editor.send({type: 'update value', value: [pristineRemoteBlock]})
    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          pristineRemoteBlock,
        ])
      },
      {timeout: 5000},
    )

    const patchCountAfterSync = patches.length
    await userEvent.click(locator)
    await userEvent.type(locator, 'y')

    await vi.waitFor(() => {
      expect(patches.length).toBeGreaterThan(patchCountAfterSync)
    })
    expect(
      patches
        .slice(patchCountAfterSync)
        .filter((patch) => patch.type === 'insert' || patch.type === 'setIfMissing'),
    ).toEqual([])
  })

  test('P2a: a pristine block created by remote `patches` counts as persisted content', async () => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {type: 'setIfMissing', path: [], value: [], origin: 'remote'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [pristineRemoteBlock],
          origin: 'remote',
        },
      ],
      snapshot: [pristineRemoteBlock],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([pristineRemoteBlock])
    })

    const patchCountAfterPatches = patches.length
    await userEvent.click(locator)
    await userEvent.type(locator, 'y')

    await vi.waitFor(() => {
      expect(patches.length).toBeGreaterThan(patchCountAfterPatches)
    })
    expect(
      patches
        .slice(patchCountAfterPatches)
        .filter((patch) => patch.type === 'insert' || patch.type === 'setIfMissing'),
    ).toEqual([])
  })

  test('P2b: a remote root insert removes the local placeholder despite a poisoned recording', async () => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    // Mirror host: echoes `mutation.value` back as `update value`.
    editor.on('mutation', (event) => {
      editor.send({type: 'update value', value: event.value})
    })
    let remoteOperations = 0
    editor.on('operation', (event) => {
      if (event.origin === 'remote') {
        remoteOperations++
      }
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await vi.waitFor(() => {
      expect(patches.at(-1)?.type).toEqual('diffMatchPatch')
    })

    await userEvent.keyboard('{Backspace}{Backspace}{Backspace}')
    await vi.waitFor(() => {
      expect(patches.at(-1)).toEqual({
        type: 'unset',
        path: [],
        origin: 'local',
      })
    })

    // Wait for the lagging echo cascade to settle with the placeholder
    // recorded as the last synced value (the poisoned state). The
    // placeholder's keys depend on echo timing, so assert shape only.
    await vi.waitFor(
      () => {
        expect(remoteOperations).toBeGreaterThan(0)
        expect(editor.getSnapshot().context.value).toMatchObject([
          {_type: 'block', children: [{_type: 'span', text: ''}]},
        ])
      },
      {timeout: 5000},
    )

    // A collaborator re-materializes the field through remote patches.
    editor.send({
      type: 'patches',
      patches: [
        {type: 'setIfMissing', path: [], value: [], origin: 'remote'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [nonPristineRemoteBlock],
          origin: 'remote',
        },
      ],
      snapshot: [nonPristineRemoteBlock],
    })

    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          nonPristineRemoteBlock,
        ])
      },
      {timeout: 5000},
    )
  })

  test('P3: a behavior raising root `unset` then `insert.block` emits an applicable patch stream', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
        },
      ],
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.replace all',
                actions: [
                  () => [
                    raise({type: 'unset', at: []}),
                    raise({
                      type: 'insert.block',
                      block: {
                        _type: 'block',
                        _key: 'replacement',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'replacement-span',
                            text: 'replaced',
                            marks: [],
                          },
                        ],
                      },
                      placement: 'auto',
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({type: 'custom.replace all'})

    await vi.waitFor(() => {
      expect(
        editor
          .getSnapshot()
          .context.value.map((block) => block._key),
      ).toEqual(['replacement'])
    })
    await vi.waitFor(() => {
      expect(patches.length).toBeGreaterThan(0)
    })

    const storeValue = applyAll(
      [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
      ],
      patches,
    )
    expect(storeValue).toEqual(editor.getSnapshot().context.value)
  })
})
