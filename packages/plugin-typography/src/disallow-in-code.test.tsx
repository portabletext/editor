import {
  getSelectedSpans,
  isActiveDecorator,
} from '@portabletext/editor/selectors'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import type {InputRuleGuard} from '@portabletext/plugin-input-rule'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import disallowInCodeFeature from './disallow-in-code.feature?raw'
import {TypographyPlugin} from './plugin.typography'

const guard: InputRuleGuard = ({snapshot, event}) => {
  const codeIsActive = isActiveDecorator('code')(snapshot)
  const matchedSpans = event.matches.flatMap((match) =>
    getSelectedSpans({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: match.selection,
      },
    }),
  )

  const anySpanIsCode = matchedSpans.some(
    (span) => span.node.text.length > 0 && span.node.marks?.includes('code'),
  )

  return !codeIsActive && !anySpanIsCode
}

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <TypographyPlugin guard={guard} />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'code'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: disallowInCodeFeature,
  stepDefinitions,
  parameterTypes,
})
