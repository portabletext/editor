import {defineSchema} from '@portabletext/editor'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {InputRulePlugin} from '@portabletext/plugin-input-rule'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {createMarkdownLinkRule} from './rule.markdown-link'
import markdownLinkFeature from './rule.markdown-link.feature?raw'

const markdownLinkRule = createMarkdownLinkRule({
  linkObject: ({props}) => ({
    _type: 'link',
    href: props.href,
  }),
})

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <InputRulePlugin rules={[markdownLinkRule]} />
          </>
        ),
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}, {name: 'comment'}],
          inlineObjects: [{name: 'stock-ticker'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: markdownLinkFeature,
  stepDefinitions,
  parameterTypes,
})
