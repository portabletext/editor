import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {insertBehaviors} from './behaviors/insert'
import {moveBehaviors} from './behaviors/move'
import {unsetBehaviors} from './behaviors/unset'
import {buildTableContainer, type TableComponents} from './containers'

/**
 * Registers the table, row and cell containers and the move/insert/unset
 * behaviors that operate on them. Pass `components` to wrap or replace
 * the plugin's default renders — each render receives `renderDefault`
 * pointing at the plugin's default so a wrapper can re-emit it verbatim.
 *
 * @alpha
 */
export function TablePlugin(props: {components?: TableComponents} = {}) {
  return (
    <>
      <NodePlugin nodes={[buildTableContainer(props.components)]} />
      <BehaviorPlugin
        behaviors={[...insertBehaviors, ...unsetBehaviors, ...moveBehaviors]}
      />
    </>
  )
}
