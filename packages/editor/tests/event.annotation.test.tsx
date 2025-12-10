import {defineSchema, type PortableTextTextBlock} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getTextMarks} from '../src/internal-utils/text-marks'
import {
  getSelectionBeforeText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

describe('event.annotation', () => {
  test('.add/.remove', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.fill(locator, 'Hello, world!')

    editor.send({
      type: 'select',
      at: getTextSelection(editor.getSnapshot().context, 'world'),
    })

    editor.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        value: {
          href: 'https://sanity.io',
        },
      },
    })

    editor.send({
      type: 'select',
      at: getTextSelection(editor.getSnapshot().context, 'Hello'),
    })

    editor.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        value: {
          href: 'https://portabletext.org',
        },
      },
    })

    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'Hello,, ,world,!',
    ])
    expect(getTextMarks(editor.getSnapshot().context, 'Hello')).toEqual(['k5'])
    expect(getTextMarks(editor.getSnapshot().context, 'world')).toEqual(['k2'])

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'ld'),
    })

    editor.send({
      type: 'annotation.remove',
      annotation: {
        name: 'link',
      },
    })

    expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello,, world!'])
    expect(getTextMarks(editor.getSnapshot().context, 'Hello')).toEqual(['k5'])
  })

  test('Scenario: Adding annotation without any initial fields', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.fill(locator, 'Hello, world!')

    editor.send({
      type: 'select',
      at: getTextSelection(editor.getSnapshot().context, 'Hello, world!'),
    })

    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {}},
    })

    expect(editor.getSnapshot().context.value).toEqual([
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
      editor.getSnapshot().context.value?.[0] as PortableTextTextBlock
    )?.markDefs?.[0]

    expect(Object.keys(markDef ?? {})).toEqual(['_type', '_key'])
  })
})
