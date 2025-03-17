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
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {getTextMarks} from '../src/internal-utils/text-marks'
import {
  getSelectionBeforeText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {EditorRefPlugin} from '../src/plugins'

describe('event.annotation', () => {
  test('.add/.remove', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({
            decorators: [{name: 'strong'}],
            annotations: [{name: 'link'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.click(locator)
    await userEvent.fill(locator, 'Hello, world!')

    editorRef.current?.send({
      type: 'select',
      selection: getTextSelection(
        editorRef.current?.getSnapshot().context.value,
        'world',
      ),
    })

    editorRef.current?.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        value: {
          href: 'https://sanity.io',
        },
      },
    })

    editorRef.current?.send({
      type: 'select',
      selection: getTextSelection(
        editorRef.current?.getSnapshot().context.value,
        'Hello',
      ),
    })

    editorRef.current?.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        value: {
          href: 'https://portabletext.org',
        },
      },
    })

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'Hello',
      ', ',
      'world',
      '!',
    ])
    expect(
      getTextMarks(editorRef.current?.getSnapshot().context.value, 'Hello'),
    ).toEqual(['k5'])
    expect(
      getTextMarks(editorRef.current?.getSnapshot().context.value, 'world'),
    ).toEqual(['k2'])

    editorRef.current?.send({
      type: 'select',
      selection: getSelectionBeforeText(
        editorRef.current?.getSnapshot().context.value,
        'ld',
      ),
    })

    editorRef.current?.send({
      type: 'annotation.remove',
      annotation: {
        name: 'link',
      },
    })

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'Hello',
      ', world!',
    ])
    expect(
      getTextMarks(editorRef.current?.getSnapshot().context.value, 'Hello'),
    ).toEqual(['k5'])
  })
})
