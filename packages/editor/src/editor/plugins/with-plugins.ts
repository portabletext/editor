import type {BaseOperation, Editor, Node, NodeEntry} from 'slate'
import type {PortableTextSlateEditor} from '../../types/editor'
import {createOperationToPatches} from '../../utils/operationToPatches'
import type {EditorActor} from '../editor-machine'
import {createWithEventListeners} from './create-with-event-listeners'
import {createWithMaxBlocks} from './createWithMaxBlocks'
import {createWithObjectKeys} from './createWithObjectKeys'
import {createWithPatches} from './createWithPatches'
import {createWithPlaceholderBlock} from './createWithPlaceholderBlock'
import {createWithPortableTextBlockStyle} from './createWithPortableTextBlockStyle'
import {createWithPortableTextLists} from './createWithPortableTextLists'
import {createWithPortableTextMarkModel} from './createWithPortableTextMarkModel'
import {createWithPortableTextSelections} from './createWithPortableTextSelections'
import {createWithSchemaTypes} from './createWithSchemaTypes'
import {createWithUndoRedo} from './createWithUndoRedo'
import {createWithUtils} from './createWithUtils'

export interface OriginalEditorFunctions {
  apply: (operation: BaseOperation) => void
  onChange: () => void
  normalizeNode: (entry: NodeEntry<Node>) => void
}

const originalFnMap = new Map<EditorActor['id'], OriginalEditorFunctions>()

type PluginsOptions = {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
}

export const withPlugins = <T extends Editor>(
  editor: T,
  options: PluginsOptions,
): PortableTextSlateEditor => {
  const e = editor as T & PortableTextSlateEditor
  const {editorActor} = options
  const schemaTypes = editorActor.getSnapshot().context.schema
  // if (e.destroy) {
  //   console.log('refreshing')
  //   e.destroy()
  // } else {
  //   console.log('creating')
  //   // Save a copy of the original editor functions here before they were changed by plugins.
  //   // We will put them back when .destroy is called (see below).
  //   originalFnMap.set(options.editorActor.id, {
  //     apply: e.apply,
  //     onChange: e.onChange,
  //     normalizeNode: e.normalizeNode,
  //   })
  // }
  const operationToPatches = createOperationToPatches(schemaTypes)
  const withObjectKeys = createWithObjectKeys(editorActor, schemaTypes)
  const withSchemaTypes = createWithSchemaTypes({
    editorActor,
    schemaTypes,
  })
  const withPatches = createWithPatches({
    editorActor,
    patchFunctions: operationToPatches,
    schemaTypes,
    subscriptions: options.subscriptions,
  })
  const withMaxBlocks = createWithMaxBlocks(editorActor)
  const withPortableTextLists = createWithPortableTextLists(schemaTypes)
  const withUndoRedo = createWithUndoRedo({
    editorActor,
    blockSchemaType: schemaTypes.block,
    subscriptions: options.subscriptions,
  })
  const withPortableTextMarkModel = createWithPortableTextMarkModel(
    editorActor,
    schemaTypes,
  )
  const withPortableTextBlockStyle = createWithPortableTextBlockStyle(
    editorActor,
    schemaTypes,
  )

  const withPlaceholderBlock = createWithPlaceholderBlock(editorActor)

  const withUtils = createWithUtils({
    editorActor,
    schemaTypes,
  })
  const withPortableTextSelections = createWithPortableTextSelections(
    editorActor,
    schemaTypes,
  )
  const withEventListeners = createWithEventListeners(
    editorActor,
    options.subscriptions,
  )

  // e.destroy = () => {
  //   console.log('destroying')
  //   const originalFunctions = originalFnMap.get(options.editorActor.id)
  //   if (!originalFunctions) {
  //     console.warn('Could not find pristine versions of editor functions')
  //     return
  //   }
  //   e.apply = originalFunctions.apply
  //   e.history = {undos: [], redos: []}
  //   e.normalizeNode = originalFunctions.normalizeNode
  //   e.onChange = originalFunctions.onChange
  // }

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return withEventListeners(
    withSchemaTypes(
      withObjectKeys(
        withPortableTextMarkModel(
          withPortableTextBlockStyle(
            withPortableTextLists(
              withPlaceholderBlock(
                withUtils(
                  withMaxBlocks(
                    withUndoRedo(withPatches(withPortableTextSelections(e))),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}
