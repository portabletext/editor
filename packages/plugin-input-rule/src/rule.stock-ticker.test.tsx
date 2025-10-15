import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {InputRulePlugin} from './plugin.input-rule'
import {createStockTickerRule} from './rule.stock-ticker'
import stockTickerFeature from './rule.stock-ticker.feature?raw'

const stockTickerRule = createStockTickerRule({
  stockTickerObject: (context) => ({
    name: 'stock-ticker',
    value: {
      symbol: context.symbol,
    },
  }),
})

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <InputRulePlugin rules={[stockTickerRule]} />
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
  featureText: stockTickerFeature,
  stepDefinitions,
  parameterTypes,
})
