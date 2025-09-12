import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {useEffect} from 'react'
import {useEditor} from '../src'
import {defineBehavior, execute} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {getFocusSpan} from '../src/selectors/selector.get-focus-span'
import {getMarkState} from '../src/selectors/selector.get-mark-state'
import {parameterTypes} from './gherkin-parameter-types'
import pluginCommentAnnotationsFeature from './plugin.comment-annotations.feature?raw'
import {Context} from './step-context'
import {stepDefinitions} from './step-definitions'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <CommentAnnotationsPlugin />,
        schemaDefinition: defineSchema({
          annotations: [{name: 'comment'}],
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
          guard: ({snapshot, event}) => {
            const markState = getMarkState(snapshot)

            if (!markState) {
              return false
            }

            if (markState.state === 'unchanged') {
              return false
            }

            // console.log('text', event.text)
            // console.log('markState', markState)
            return false
          },
          actions: [({event}) => [execute(event)]],
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
