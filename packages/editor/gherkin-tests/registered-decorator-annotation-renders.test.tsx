import {Given} from 'racejar'
import {Feature} from 'racejar/vitest'
import annotationsAcrossBlocksFeature from '../gherkin-spec/annotations-across-blocks.feature?raw'
import annotationsCollaborationFeature from '../gherkin-spec/annotations-collaboration.feature?raw'
import annotationsEdgeCasesFeature from '../gherkin-spec/annotations-edge-cases.feature?raw'
import annotationsOverlappingDecoratorsFeature from '../gherkin-spec/annotations-overlapping-decorators.feature?raw'
import annotationsOverlappingFeature from '../gherkin-spec/annotations-overlapping.feature?raw'
import annotationsFeature from '../gherkin-spec/annotations.feature?raw'
import decoratorsOverlappingFeature from '../gherkin-spec/decorators-overlapping.feature?raw'
import decoratorsFeature from '../gherkin-spec/decorators.feature?raw'
import {defineAnnotation, defineDecorator} from '../src'
import {NodePlugin} from '../src/plugins'
import {parameterTypes} from '../src/test'
import {
  createTestEditor,
  createTestEditors,
  gherkinSchemaDefinition,
  stepDefinitions,
} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'

// Pins that editing through custom decorator/annotation DOM (typing,
// splitting, toggling, caret movement) behaves the same as through the
// engine's default markup. No other suite edits through registered
// wrappers, so a regression there would otherwise only surface as a
// rendering bug, not an editing one.
const registeredRenderNodes = [
  defineDecorator({
    type: '*',
    render: ({decorator, children}) =>
      decorator === 'strong' ? (
        <strong>{children}</strong>
      ) : (
        <em>{children}</em>
      ),
  }),
  defineAnnotation({
    type: '*',
    render: ({annotation, children}) => (
      <span data-annotation={annotation._type}>{children}</span>
    ),
  }),
]

const oneEditorWithRegisteredRenders = Given(
  'one editor',
  async (context: Context) => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: gherkinSchemaDefinition,
      children: <NodePlugin nodes={registeredRenderNodes} />,
    })

    context.locator = locator
    context.editor = editor
  },
)
const twoEditorsWithRegisteredRenders = Given(
  'two editors',
  async (context: Context) => {
    const {editor, locator, editorB, locatorB} = await createTestEditors({
      schemaDefinition: gherkinSchemaDefinition,
      children: <NodePlugin nodes={registeredRenderNodes} />,
    })

    context.locator = locator
    context.editor = editor
    context.locatorB = locatorB
    context.editorB = editorB
  },
)

const stepDefinitionsWithoutEditorMounts = stepDefinitions.filter(
  (stepDefinition) =>
    stepDefinition.text !== 'one editor' &&
    stepDefinition.text !== 'two editors',
)
if (stepDefinitionsWithoutEditorMounts.length !== stepDefinitions.length - 2) {
  // A silent filter no-op would run every scenario without the wrappers
  // and stay green; fail loudly instead.
  throw new Error(
    'Expected to replace the `one editor` and `two editors` step definitions',
  )
}

const registeredRenderStepDefinitions = [
  ...stepDefinitionsWithoutEditorMounts,
  oneEditorWithRegisteredRenders,
  twoEditorsWithRegisteredRenders,
]

Feature({
  featureText: decoratorsFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: decoratorsOverlappingFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingDecoratorsFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsAcrossBlocksFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsEdgeCasesFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsCollaborationFeature,
  stepDefinitions: registeredRenderStepDefinitions,
  parameterTypes,
})
