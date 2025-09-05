import {defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../internal-utils/test-editor'
import {getTextMarks} from '../internal-utils/text-marks'
import {MarkdownPlugin} from './plugin.markdown'

describe(MarkdownPlugin.name, () => {
  test('Scenario: Undoing bold shortcut', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <MarkdownPlugin
          config={{
            boldDecorator: () => 'strong',
          }}
        />
      ),
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })

    await userEvent.type(locator, '**Hello world!**')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello world!'])
    })

    await vi.waitFor(() => {
      expect(
        getTextMarks(editor.getSnapshot().context, 'Hello world!'),
      ).toEqual(['strong'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        '**Hello world!**',
      ])
    })
  })
})
