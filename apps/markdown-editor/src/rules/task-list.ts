import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {defineInputRule} from '@portabletext/plugin-input-rule'

/**
 * Markdown shortcut for GFM-style task list items.
 *
 * Matches `-[] ` / `-[ ] ` / `-[x] ` / `-[X] ` at the start of a block, sets
 * `listItem: <task list name>` and `checked: <bool>` on the block, and deletes
 * the matched prefix.
 *
 * Modeled directly on the unordered-list rule from
 * `@portabletext/plugin-markdown-shortcuts`. Lives in the example app for
 * now because the shared plugin doesn't ship a task-list rule.
 */
export function createTaskListRule(config: {
  taskList: ({
    context,
  }: {
    context: Pick<EditorContext, 'schema'>
  }) => string | undefined
}) {
  return defineInputRule({
    on: /^-\[( |x|X)?\] /,
    guard: ({snapshot, event}) => {
      const taskList = config.taskList({
        context: {schema: snapshot.context.schema},
      })

      if (!taskList) {
        return false
      }

      const previousInlineObject = getPreviousInlineObject(snapshot)

      if (previousInlineObject) {
        return false
      }

      const match = event.matches.at(0)

      if (!match) {
        return false
      }

      const checkedMarker = match.groupMatches.at(0)?.text ?? ''
      const checked = checkedMarker.toLowerCase() === 'x'

      return {match, taskList, checked}
    },
    actions: [
      ({event}, {match, taskList, checked}) => [
        raise({
          type: 'block.unset',
          props: ['style'],
          at: event.focusBlock.path,
        }),
        raise({
          type: 'block.set',
          props: {
            listItem: taskList,
            level: event.focusBlock.node.level ?? 1,
            checked,
          },
          at: event.focusBlock.path,
        }),
        raise({
          type: 'delete',
          at: match.targetOffsets,
        }),
      ],
    ],
  })
}
