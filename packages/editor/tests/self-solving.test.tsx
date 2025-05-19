import type {JSONValue, Patch} from '@portabletext/patches'
import type {PortableTextBlock, PortableTextSpan} from '@sanity/types'
import {createRef} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {PortableTextEditable} from '../src/editor/Editable'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'

function block(
  props?: Partial<Omit<PortableTextBlock, '_type'>>,
): PortableTextBlock {
  return {
    _type: 'block',
    ...(props ?? {}),
  } as PortableTextBlock
}

function span(
  props?: Partial<Omit<PortableTextSpan, '_type'>>,
): PortableTextSpan {
  return {
    _type: 'span',
    ...(props ?? {}),
  } as PortableTextSpan
}

describe('Feature: Self-solving', () => {
  it('Scenario: Missing .markDefs and .marks are added after the editor is made dirty', async () => {
    const initialValue = [
      block({
        _key: 'b1',
        children: [
          span({
            _key: 's1',
            text: 'foo',
          }),
        ],
        style: 'normal',
      }),
    ]
    const spanPatch: Patch = {
      type: 'set',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
      value: [],
      origin: 'local',
    }
    const blockPatch: Patch = {
      type: 'set',
      path: [{_key: 'b1'}],
      value: block({
        _key: 'b1',
        children: [
          span({
            _key: 's1',
            text: 'foo',
            marks: [],
          }),
        ],
        style: 'normal',
        markDefs: [],
      }) as JSONValue,
      origin: 'local',
    }
    const strongPatch: Patch = {
      type: 'set',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
      value: ['strong'],
      origin: 'local',
    }

    const keyGenerator = createTestKeyGenerator()
    const editorRef = createRef<Editor>()
    const events: Array<EditorEmittedEvent> = []

    render(
      <EditorProvider
        initialConfig={{
          initialValue,
          keyGenerator,
          schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {
              _key: 's1',
              _type: 'span',
              marks: [],
              text: 'foo',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({
      type: 'select',
      at: getTextSelection(initialValue, 'foo'),
    })
    editorRef.current?.send({
      type: 'decorator.toggle',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'value changed',
          value: initialValue,
        },
        {
          type: 'ready',
        },
        {
          type: 'selection',
          selection: getTextSelection(initialValue, 'foo'),
        },
        {
          type: 'patch',
          patch: spanPatch,
        },
        {
          type: 'patch',
          patch: blockPatch,
        },
        {
          type: 'patch',
          patch: strongPatch,
        },
        {
          type: 'selection',
          selection: getTextSelection(initialValue, 'foo'),
        },
        {
          type: 'mutation',
          patches: [spanPatch, blockPatch],
          snapshot: [
            block({
              _key: 'b1',
              children: [
                span({
                  _key: 's1',
                  text: 'foo',
                  marks: [],
                }),
              ],
              style: 'normal',
              markDefs: [],
            }),
          ],
          value: [
            block({
              _key: 'b1',
              children: [
                span({
                  _key: 's1',
                  text: 'foo',
                  marks: [],
                }),
              ],
              style: 'normal',
              markDefs: [],
            }),
          ],
        },
        {
          type: 'mutation',
          patches: [strongPatch],
          snapshot: [
            block({
              _key: 'b1',
              children: [
                span({
                  _key: 's1',
                  text: 'foo',
                  marks: ['strong'],
                }),
              ],
              style: 'normal',
              markDefs: [],
            }),
          ],
          value: [
            block({
              _key: 'b1',
              children: [
                span({
                  _key: 's1',
                  text: 'foo',
                  marks: ['strong'],
                }),
              ],
              style: 'normal',
              markDefs: [],
            }),
          ],
        },
      ])
    })
  })
})
