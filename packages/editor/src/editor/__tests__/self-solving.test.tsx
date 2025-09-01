import type {JSONValue, Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock, PortableTextSpan} from '@sanity/types'
import {render, waitFor} from '@testing-library/react'
import {createRef, type ComponentProps, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {getTextSelection} from '../../internal-utils/text-selection'
import {PortableTextEditor} from '../PortableTextEditor'
import {PortableTextEditorTester} from './PortableTextEditorTester'

type OnChange = ComponentProps<typeof PortableTextEditor>['onChange']

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
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn<OnChange>()
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

    render(
      <PortableTextEditorTester
        ref={editorRef}
        schemaDefinition={schemaDefinition}
        keyGenerator={createTestKeyGenerator()}
        value={initialValue}
        onChange={onChange}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenNthCalledWith(1, {
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenNthCalledWith(2, {
          type: 'ready',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.select(
          editorRef.current,
          getTextSelection(
            {schema: compileSchema(schemaDefinition), value: initialValue},
            'foo',
          ),
        )
        PortableTextEditor.toggleMark(editorRef.current, 'strong')
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenNthCalledWith(3, {
          type: 'selection',
          selection: {
            ...getTextSelection(
              {schema: compileSchema(schemaDefinition), value: initialValue},
              'foo',
            ),
            backward: false,
          },
        })
        expect(onChange).toHaveBeenNthCalledWith(4, {
          type: 'patch',
          patch: spanPatch,
        })
        expect(onChange).toHaveBeenNthCalledWith(5, {
          type: 'patch',
          patch: blockPatch,
        })
        expect(onChange).toHaveBeenNthCalledWith(6, {
          type: 'patch',
          patch: strongPatch,
        })
        expect(onChange).toHaveBeenNthCalledWith(7, {
          type: 'selection',
          selection: {
            ...getTextSelection(
              {schema: compileSchema(schemaDefinition), value: initialValue},
              'foo',
            ),
            backward: false,
          },
        })
        expect(onChange).toHaveBeenNthCalledWith(8, {
          type: 'mutation',
          patches: [spanPatch, blockPatch, strongPatch],
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
        })
      }
    })
  })
})
