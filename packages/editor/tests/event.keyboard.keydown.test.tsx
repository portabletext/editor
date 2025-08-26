import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
} from '../src'
import {defineBehavior, execute} from '../src/behaviors'
import {getSelectionBeforeText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin, EditorRefPlugin} from '../src/plugins'
import {getNextBlock} from '../src/selectors'

describe('event.keyboard.keydown', () => {
  test('Scenario: Executing and overwriting default event', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
          initialValue: [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                },
              ],
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'bar',
                },
              ],
            },
            {
              _type: 'block',
              _key: 'k4',
              children: [
                {
                  _type: 'span',
                  _key: 'k5',
                  text: 'baz',
                },
              ],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({snapshot, event}) => {
                if (event.originEvent.key !== 'ArrowDown') {
                  return false
                }

                const nextBlock = getNextBlock(snapshot)

                if (nextBlock) {
                  return {nextBlock}
                }

                return false
              },
              actions: [
                (_, {nextBlock}) => [
                  execute({
                    type: 'select',
                    at: {
                      anchor: {
                        path: nextBlock.path,
                        offset: 0,
                      },
                      focus: {
                        path: nextBlock.path,
                        offset: 0,
                      },
                    },
                  }),
                ],
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.click(locator)

    editorRef.current?.send({
      type: 'select',
      at: getSelectionBeforeText(
        editorRef.current!.getSnapshot().context,
        'foo',
      ),
    })

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editorRef.current!.getSnapshot().context,
        'foo',
      )
      expect(selection).not.toBeNull()
      expect(editorRef.current?.getSnapshot().context.selection).toEqual(
        selection,
      )
    })

    await userEvent.keyboard('{ArrowDown}')

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editorRef.current!.getSnapshot().context,
        'bar',
      )
      expect(selection).not.toBeNull()
      expect(editorRef.current?.getSnapshot().context.selection).toEqual(
        selection,
      )
    })

    await userEvent.type(locator, 'new')

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'foo',
        'newbar',
        'baz',
      ])
    })
  })
})
