import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import resetFeature from '../gherkin-spec/reset.feature?raw'
import {NodePlugin} from '../src/plugins/plugin.node'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'
import {loadContainers, loadSchemaDefinition} from '../test-utils/load-depths'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition: loadSchemaDefinition,
        children: <NodePlugin nodes={loadContainers} />,
      })

      context.keyMap = new Map()
      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: resetFeature,
  stepDefinitions,
  parameterTypes,
})
