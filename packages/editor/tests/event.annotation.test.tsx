import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import type {PortableTextTextBlock} from '@sanity/types'
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
            annotations: [
              {name: 'link', fields: [{name: 'href', type: 'string'}]},
            ],
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
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'world'),
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
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'Hello'),
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

    expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
      'Hello,, ,world,!',
    ])
    expect(
      getTextMarks(editorRef.current!.getSnapshot().context, 'Hello'),
    ).toEqual(['k5'])
    expect(
      getTextMarks(editorRef.current!.getSnapshot().context, 'world'),
    ).toEqual(['k2'])

    editorRef.current?.send({
      type: 'select',
      at: getSelectionBeforeText(
        editorRef.current!.getSnapshot().context,
        'ld',
      ),
    })

    editorRef.current?.send({
      type: 'annotation.remove',
      annotation: {
        name: 'link',
      },
    })

    expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
      'Hello,, world!',
    ])
    expect(
      getTextMarks(editorRef.current!.getSnapshot().context, 'Hello'),
    ).toEqual(['k5'])
  })

  test('Scenario: Adding annotation without any initial fields', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({
            annotations: [
              {name: 'link', fields: [{name: 'href', type: 'string'}]},
            ],
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
      at: getTextSelection(
        editorRef.current!.getSnapshot().context,
        'Hello, world!',
      ),
    })

    editorRef.current?.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {}},
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {_key: 'k1', _type: 'span', text: 'Hello, world!', marks: ['k2']},
        ],
        markDefs: [
          {
            _key: 'k2',
            _type: 'link',
          },
        ],
        style: 'normal',
      },
    ])

    const markDef = (
      editorRef.current?.getSnapshot().context
        .value?.[0] as PortableTextTextBlock
    )?.markDefs?.[0]

    expect(Object.keys(markDef ?? {})).toEqual(['_type', '_key'])
  })
})
