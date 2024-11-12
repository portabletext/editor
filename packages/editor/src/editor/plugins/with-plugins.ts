import type {BaseOperation, Editor, Node, NodeEntry} from 'slate'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {createEditorOptions} from '../../types/options'
import {createOperationToPatches} from '../../utils/operationToPatches'
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

const originalFnMap = new WeakMap<
  PortableTextSlateEditor,
  OriginalEditorFunctions
>()

export const withPlugins = <T extends Editor>(
  editor: T,
  options: createEditorOptions,
): PortableTextSlateEditor => {
  const e = editor as T & PortableTextSlateEditor
  const {editorActor} = options
  const schemaTypes = editorActor.getSnapshot().context.schema
  if (e.destroy) {
    e.destroy()
  } else {
    // Save a copy of the original editor functions here before they were changed by plugins.
    // We will put them back when .destroy is called (see below).
    originalFnMap.set(e, {
      apply: e.apply,
      onChange: e.onChange,
      normalizeNode: e.normalizeNode,
    })
  }
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

  e.destroy = () => {
    const originalFunctions = originalFnMap.get(e)
    if (!originalFunctions) {
      throw new Error('Could not find pristine versions of editor functions')
    }
    e.apply = originalFunctions.apply
    e.history = {undos: [], redos: []}
    e.normalizeNode = originalFunctions.normalizeNode
    e.onChange = originalFunctions.onChange
  }

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
