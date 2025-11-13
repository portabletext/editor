import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {defineSchema} from '..'
import {defineBehavior, forward, raise} from '../behaviors'
import {BehaviorPlugin} from '../plugins/plugin.behavior'
import {getFocusTextBlock, isSelectionExpanded} from '../selectors'
import {parameterTypes} from '../test'
import {createTestEditor, stepDefinitions, type Context} from '../test/vitest'
import undoRedoFeature from './undo-redo.feature?raw'

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
