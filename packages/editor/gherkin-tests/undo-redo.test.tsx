import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import undoRedoFeature from '../gherkin-spec/undo-redo.feature?raw'
import {defineBehavior, forward, raise} from '../src/behaviors'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {getFocusTextBlock, isSelectionExpanded} from '../src/selectors'
import {parameterTypes} from '../src/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '../src/test/vitest'

Feature({
  featureText: undoRedoFeature,
  stepDefinitions,
  parameterTypes,
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition: defineSchema({
          annotations: [{name: 'link'}, {name: 'comment'}],
        }),
        children: (
          <>
            <ArrowTransformPlugin />
            <CopyrightTransformPlugin />
          </>
        ),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
})

/**
 * Native behavior to transform `>` into `→`.
 * Ony for testing purposes.
 */
function ArrowTransformPlugin() {
  return (
    <BehaviorPlugin
      behaviors={[
        defineBehavior({
          on: 'insert.text',
          guard: ({snapshot, event}) => {
            if (event.text !== '>' || isSelectionExpanded(snapshot)) {
              return false
            }

            const focusTextBlock = getFocusTextBlock(snapshot)

            if (!focusTextBlock) {
              return false
            }

            return {focusTextBlock}
          },
          actions: [
            ({event}) => [forward(event)],
            ({snapshot}, {focusTextBlock}) => [
              raise({
                type: 'select',
                at: {
                  anchor: {
                    path: focusTextBlock.path,
                    offset: 0,
                  },
                  focus: {
                    path: focusTextBlock.path,
                    offset: 2,
                  },
                },
              }),
              raise({
                type: 'delete',
                at: {
                  anchor: {
                    path: focusTextBlock.path,
                    offset: 0,
                  },
                  focus: {
                    path: focusTextBlock.path,
                    offset: 2,
                  },
                },
              }),
              raise({
                type: 'insert.child',
                child: {
                  _type: snapshot.context.schema.span.name,
                  text: '→',
                  marks: [],
                },
              }),
              raise({
                type: 'select',
                at: {
                  anchor: {
                    path: focusTextBlock.path,
                    offset: 2,
                  },
                  focus: {
                    path: focusTextBlock.path,
                    offset: 2,
                  },
                },
              }),
            ],
          ],
        }),
      ]}
    />
  )
}

/**
 * Native behavior to transform `(c)` into `©`.
 * Ony for testing purposes.
 */
function CopyrightTransformPlugin() {
  return (
    <BehaviorPlugin
      behaviors={[
        defineBehavior({
          on: 'insert.text',
          guard: ({snapshot, event}) => {
            if (event.text !== ')' || isSelectionExpanded(snapshot)) {
              return false
            }

            const focusTextBlock = getFocusTextBlock(snapshot)

            if (!focusTextBlock) {
              return false
            }

            return {focusTextBlock}
          },
          actions: [
            ({event}) => [forward(event)],
            ({snapshot}, {focusTextBlock}) => [
              raise({
                type: 'select',
                at: {
                  anchor: {
                    path: focusTextBlock.path,
                    offset: 0,
                  },
                  focus: {
                    path: focusTextBlock.path,
                    offset: 3,
                  },
                },
              }),
              raise({
                type: 'delete',
                at: {
                  anchor: {
                    path: focusTextBlock.path,
                    offset: 0,
                  },
                  focus: {
                    path: focusTextBlock.path,
                    offset: 3,
                  },
                },
              }),
              raise({
                type: 'insert.child',
                child: {
                  _type: snapshot.context.schema.span.name,
                  text: '©',
                  marks: [],
                },
              }),
              raise({
                type: 'select',
                at: {
                  anchor: {
                    path: focusTextBlock.path,
                    offset: 3,
                  },
                  focus: {
                    path: focusTextBlock.path,
                    offset: 3,
                  },
                },
              }),
            ],
          ],
        }),
      ]}
    />
  )
}
