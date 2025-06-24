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
import {execute} from '../src/behaviors'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {BehaviorPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.delete.backward', () => {
  test('Scenario: Executing delete.backward', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'delete.backward',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    await vi.waitFor(() => expect(locator).toBeInTheDocument())

    await userEvent.type(locator, 'foo')

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['fo'])
    })
  })
})
