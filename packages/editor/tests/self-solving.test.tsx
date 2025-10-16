import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, it, vi} from 'vitest'
import type {
  EditorEmittedEvent,
  MutationEvent,
  PatchEvent,
} from '../src/editor/relay-machine'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('Feature: Self-solving', () => {
  it('Scenario: Missing .markDefs and .marks are added after the editor is made dirty', async () => {
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: 'foo',
          },
        ],
        style: 'normal',
      },
    ]
    const spanPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
      value: [],
      origin: 'local',
    }
    const blockPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}],
      value: {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
      origin: 'local',
    }
    const strongPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
      value: ['strong'],
      origin: 'local',
    }
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()
    const patchEvents: Array<PatchEvent> = []
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            onEvent(event)

            if (event.type === 'patch') {
              patchEvents.push(event)
            }
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      initialValue,
      keyGenerator,
      schemaDefinition,
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({
        type: 'ready',
      })
      expect(patchEvents).toEqual([])
      expect(mutationEvents).toEqual([])
    })

    editor.send({
      type: 'select',
      at: getTextSelection(
        {schema: compileSchema(schemaDefinition), value: initialValue},
        'foo',
      ),
    })
    editor.send({
      type: 'decorator.toggle',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      expect(patchEvents).toEqual([
        {type: 'patch', patch: spanPatch},
        {type: 'patch', patch: blockPatch},
        {type: 'patch', patch: strongPatch},
      ])
      expect(mutationEvents).toEqual([
        {
          type: 'mutation',
          patches: [spanPatch, blockPatch],
          snapshot: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
        },
        {
          type: 'mutation',
          patches: [strongPatch],
          snapshot: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: ['strong'],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: ['strong'],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
        },
      ])
    })
  })
})
