import type {BaseOperation, Editor, Node, NodeEntry} from 'slate'
import {createOperationToPatches} from '../../internal-utils/operationToPatches'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import {createWithEventListeners} from './create-with-event-listeners'
import {createWithMaxBlocks} from './createWithMaxBlocks'
import {createWithObjectKeys} from './createWithObjectKeys'
import {createWithPatches} from './createWithPatches'
import {createWithPlaceholderBlock} from './createWithPlaceholderBlock'
import {createWithPortableTextBlockStyle} from './createWithPortableTextBlockStyle'
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
  const operationToPatches = createOperationToPatches(editorActor)
  const withObjectKeys = createWithObjectKeys(editorActor)
  const withSchemaTypes = createWithSchemaTypes({
    editorActor,
  })
  const withPatches = createWithPatches({
    editorActor,
    patchFunctions: operationToPatches,
    subscriptions: options.subscriptions,
  })
  const withMaxBlocks = createWithMaxBlocks(editorActor)
  const withUndoRedo = createWithUndoRedo({
    editorActor,
    subscriptions: options.subscriptions,
  })
  const withPortableTextMarkModel = createWithPortableTextMarkModel(editorActor)
  const withPortableTextBlockStyle =
    createWithPortableTextBlockStyle(editorActor)

  const withPlaceholderBlock = createWithPlaceholderBlock(editorActor)

  const withUtils = createWithUtils({
    editorActor,
  })
  const withPortableTextSelections =
    createWithPortableTextSelections(editorActor)
  const withEventListeners = createWithEventListeners(editorActor)

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return withEventListeners(
    withSchemaTypes(
      withObjectKeys(
        withPortableTextMarkModel(
          withPortableTextBlockStyle(
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
  )
}
