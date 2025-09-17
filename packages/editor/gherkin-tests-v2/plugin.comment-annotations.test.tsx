import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {useEffect} from 'react'
import {useEditor} from '../src'
import {defineBehavior, execute, raise} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {getFocusTextBlock} from '../src/selectors/selector.get-focus-text-block'
import {getMarkState} from '../src/selectors/selector.get-mark-state'
import {parameterTypes} from './gherkin-parameter-types'
import pluginCommentAnnotationsFeature from './plugin.comment-annotations.feature?raw'
import type {Context} from './step-context'
import {stepDefinitions} from './step-definitions'

Feature({
  hooks: [
    // Using a Before hook to instantiate an editor with my own
    // config before each Scenario
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        // Adding my own plugin to the editor
        children: <CommentAnnotationsPlugin />,
        schemaDefinition: defineSchema({
          annotations: [{name: 'comment'}, {name: 'link'}],
          decorators: [{name: 'strong'}],
        }),
      })

      context.keyMap = new Map()
      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: pluginCommentAnnotationsFeature,
  stepDefinitions,
  parameterTypes,
})

// Plugin that makes comment annotations behave a little less
// like regular annotations
function CommentAnnotationsPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = [
      editor.registerBehavior({
        behavior: defineBehavior({
          on: 'annotation.add',
          guard: ({event}) => event.annotation.name === 'comment',
          actions: [({event}) => [execute(event)]],
        }),
      }),
      editor.registerBehavior({
        behavior: defineBehavior({
          on: 'insert.text',
          guard: ({snapshot}) => {
            const focusTextBlock = getFocusTextBlock(snapshot)
            const markState = getMarkState(snapshot)

            if (!focusTextBlock || !markState) {
              return false
            }

            if (markState.state === 'unchanged') {
              return false
            }

            const previousDecorators = markState.previousMarks.filter((mark) =>
              snapshot.context.schema.decorators
                .map((decorator) => decorator.name)
                .includes(mark),
            )
            const nextDecorators = markState.marks.filter((mark) =>
              snapshot.context.schema.decorators
                .map((decorator) => decorator.name)
                .includes(mark),
            )
            const decoratorsDiscontinued = previousDecorators.filter(
              (decorator) => !nextDecorators.includes(decorator),
            )
            const previousAnnotations = markState.previousMarks.filter(
              (mark) =>
                !snapshot.context.schema.decorators
                  .map((decorator) => decorator.name)
                  .includes(mark),
            )
            const nextAnnotations = markState.marks.filter(
              (mark) =>
                !snapshot.context.schema.decorators
                  .map((decorator) => decorator.name)
                  .includes(mark),
            )
            const annotationsDiscontinued = previousAnnotations.filter(
              (annotation) => !nextAnnotations.includes(annotation),
            )

            const onlyCommentsDiscontinued = !annotationsDiscontinued.some(
              (annotationKey) =>
                focusTextBlock.node.markDefs?.some(
                  (markDef) =>
                    markDef._key === annotationKey &&
                    markDef._type !== 'comment',
                ),
            )

            if (onlyCommentsDiscontinued) {
              return {
                marks: [...decoratorsDiscontinued, ...markState.marks],
              }
            }

            return false
          },
          actions: [
            ({snapshot, event}, {marks}) => [
              raise({
                type: 'insert.child',
                child: {
                  _type: snapshot.context.schema.span.name,
                  text: event.text,
                  marks,
                },
              }),
            ],
          ],
        }),
      }),
    ]

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}
