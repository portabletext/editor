import {useEffect} from 'react'
import {defineBehavior, execute} from '../behaviors'
import {useEditor} from '../editor/use-editor'

export function AutoCloseBracketsPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehavior = editor.registerBehavior({
      behavior: defineBehavior({
        on: 'insert.text',
        guard: ({event}) => {
          const bracketPairs: Record<string, string | undefined> = {
            '(': ')',
            '[': ']',
            '{': '}',
          }
          const firstInsertedChar = event.text.at(0)
          const closingBracket =
            firstInsertedChar !== undefined
              ? bracketPairs[firstInsertedChar]
              : undefined

          if (closingBracket !== undefined) {
            // Passing the closing bracket to the actions for reuse
            return {closingBracket}
          }

          return false
        },
        actions: [
          ({event}) => [
            // Execute the original event that includes the opening bracket
            execute(event),
          ],
          /*
           * New undo step so the auto-closing of the bracket can be undone.
           * Notice how the step reuses the `closingBracket` derived in the `guard`.
           */
          (_, {closingBracket}) => [
            // Execute a new `insert.text` event with a closing bracket
            execute({
              type: 'insert.text',
              text: closingBracket,
            }),
            // Execute a `move.backward` event to move the cursor in between the brackets
            execute({
              type: 'move.backward',
              distance: closingBracket.length,
            }),
          ],
        ],
      }),
    })

    return () => {
      unregisterBehavior()
    }
  }, [editor])
  return null
}
