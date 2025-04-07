import {page, userEvent} from '@vitest/browser/context'
import * as React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {defineBehavior, execute, raise} from '../src/behaviors'
import type {Editor} from '../src/editor/create-editor'
import {defineSchema} from '../src/editor/define-schema'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {BehaviorPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.history.undo', () => {
  test('Scenario: Undoing action sets', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'x',
              actions: [
                // The 'x' is inserted in its own undo step
                ({event}) => [execute(event)],
                // And then deleted again and replaced with 'y*' in another undo step
                () => [
                  execute({type: 'delete.backward', unit: 'character'}),
                  execute({type: 'insert.text', text: 'y'}),
                  execute({type: 'insert.text', text: '*'}),
                ],
                // And finally 'z' gets its own undo step as well
                () => [execute({type: 'insert.text', text: 'z'})],
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['y*z'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['y*'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['x'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual([''])
    })
  })

  test('Scenario: Undoing raised action sets', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
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
              guard: ({event}) => event.text === 'x',
              actions: [
                // This gets its own undo step
                () => [execute({type: 'insert.text', text: 'y'})],
                // And this also gets its own undo step
                () => [execute({type: 'insert.text', text: 'z'})],
              ],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                // But when 'x' is raised, the Behavior above is called
                // recursively and the actions are merged into a single undo step
                () => [raise({type: 'insert.text', text: 'x'})],
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['yz'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual([''])
    })
  })

  test('Scenario: Undoing recursive raises', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
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
              guard: ({event}) => event.text === 'b',
              actions: [() => [raise({type: 'insert.text', text: 'B'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                () => [
                  raise({type: 'insert.text', text: 'b'}),
                  raise({type: 'insert.break'}),
                  raise({type: 'insert.text', text: 'c'}),
                ],
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['B', '|', 'c'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual([''])
    })
  })
})
