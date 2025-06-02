import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorSnapshot,
} from '../src'
import {defineBehavior, execute} from '../src/behaviors'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {BehaviorPlugin, EditorRefPlugin} from '../src/plugins'

describe('EditorSnapshot', () => {
  test('Scenario: A new snapshot is captured for each action set', async () => {
    const editorRef = React.createRef<Editor>()
    const inspectSelection =
      vi.fn<(selection: EditorSnapshot['context']['selection']) => void>()
    const inspectValue =
      vi.fn<(value: EditorSnapshot['context']['value']) => void>()

    render(
      <EditorProvider
        initialConfig={{
          indexedSelection: true,
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({snapshot}) => {
                  inspectSelection(snapshot.context.selection)
                  inspectValue(snapshot.context.value)
                  return [
                    execute({
                      type: 'insert.text',
                      text: 'b',
                    }),
                  ]
                },
                ({snapshot}) => {
                  inspectSelection(snapshot.context.selection)
                  inspectValue(snapshot.context.value)
                  return [
                    execute({
                      type: 'insert.text',
                      text: 'c',
                    }),
                  ]
                },
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')

    expect(inspectSelection).toHaveBeenNthCalledWith(1, {
      anchor: {
        path: [0, 0],
        offset: 0,
      },
      focus: {
        path: [0, 0],
        offset: 0,
      },
    })
    expect(inspectValue).toHaveBeenNthCalledWith(1, [
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(inspectSelection).toHaveBeenNthCalledWith(2, {
      anchor: {
        path: [0, 0],
        offset: 1,
      },
      focus: {
        path: [0, 0],
        offset: 1,
      },
    })
    expect(inspectValue).toHaveBeenNthCalledWith(2, [
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', marks: [], text: 'b'}],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(inspectSelection).not.toHaveBeenCalledTimes(3)
    expect(inspectValue).not.toHaveBeenCalledTimes(3)
  })
})
