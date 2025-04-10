import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type InsertPosition,
  type Patch,
} from '@portabletext/patches'
import type {Path, PortableTextSpan, PortableTextTextBlock} from '@sanity/types'
import {get, isUndefined, omitBy} from 'lodash'
import {
  Text,
  type Descendant,
  type InsertNodeOperation,
  type InsertTextOperation,
  type MergeNodeOperation,
  type MoveNodeOperation,
  type RemoveNodeOperation,
  type RemoveTextOperation,
  type SetNodeOperation,
  type SplitNodeOperation,
} from 'slate'
import type {EditorActor} from '../editor/editor-machine'
import type {PatchFunctions} from '../editor/plugins/createWithPatches'
import type {PortableTextSlateEditor} from '../types/editor'
import {debugWithName} from './debug'
import {fromSlateValue} from './values'

const debug = debugWithName('operationToPatches')

export function createOperationToPatches(
  editorActor: EditorActor,
): PatchFunctions {
  const textBlockName = editorActor.getSnapshot().context.schema.block.name
  function insertTextPatch(
    editor: PortableTextSlateEditor,
    operation: InsertTextOperation,
    beforeValue: Descendant[],
  ) {
    if (debug.enabled) {
      debug('Operation', JSON.stringify(operation, null, 2))
    }
    const block =
      editor.isTextBlock(editor.children[operation.path[0]]) &&
      editor.children[operation.path[0]]
    if (!block) {
      throw new Error('Could not find block')
    }
    const textChild =
      editor.isTextBlock(block) &&
      editor.isTextSpan(block.children[operation.path[1]]) &&
      (block.children[operation.path[1]] as PortableTextSpan)
    if (!textChild) {
      throw new Error('Could not find child')
    }
    const path: Path = [
      {_key: block._key},
      'children',
      {_key: textChild._key},
      'text',
    ]
    const prevBlock = beforeValue[operation.path[0]]
    const prevChild =
      editor.isTextBlock(prevBlock) && prevBlock.children[operation.path[1]]
    const prevText = editor.isTextSpan(prevChild) ? prevChild.text : ''
    const patch = diffMatchPatch(prevText, textChild.text, path)
    return patch.value.length ? [patch] : []
  }

  function removeTextPatch(
    editor: PortableTextSlateEditor,
    operation: RemoveTextOperation,
    beforeValue: Descendant[],
  ) {
    const block = editor && editor.children[operation.path[0]]
    if (!block) {
      throw new Error('Could not find block')
    }
    const child =
      (editor.isTextBlock(block) && block.children[operation.path[1]]) ||
      undefined
    const textChild: PortableTextSpan | undefined = editor.isTextSpan(child)
      ? child
      : undefined
    if (child && !textChild) {
      throw new Error('Expected span')
    }
    if (!textChild) {
      throw new Error('Could not find child')
    }
    const path: Path = [
      {_key: block._key},
      'children',
      {_key: textChild._key},
      'text',
    ]
    const beforeBlock = beforeValue[operation.path[0]]
    const prevTextChild =
      editor.isTextBlock(beforeBlock) && beforeBlock.children[operation.path[1]]
    const prevText = editor.isTextSpan(prevTextChild) && prevTextChild.text
    const patch = diffMatchPatch(prevText || '', textChild.text, path)
    return patch.value ? [patch] : []
  }

  function setNodePatch(
    editor: PortableTextSlateEditor,
    operation: SetNodeOperation,
  ) {
    if (operation.path.length === 1) {
      const block = editor.children[operation.path[0]]
      if (typeof block._key !== 'string') {
        throw new Error('Expected block to have a _key')
      }
      const setNode = omitBy(
        {...editor.children[operation.path[0]], ...operation.newProperties},
        isUndefined,
      ) as unknown as Descendant
      return [
        set(fromSlateValue([setNode], textBlockName)[0], [{_key: block._key}]),
      ]
    } else if (operation.path.length === 2) {
      const block = editor.children[operation.path[0]]
      if (editor.isTextBlock(block)) {
        const child = block.children[operation.path[1]]
        if (child) {
          const blockKey = block._key
          const childKey = child._key
          const patches: Patch[] = []
          const keys = Object.keys(operation.newProperties)
          keys.forEach((keyName) => {
            // Special case for setting _key on a child. We have to target it by index and not the _key.
            if (keys.length === 1 && keyName === '_key') {
              const val = get(operation.newProperties, keyName)
              patches.push(
                set(val, [
                  {_key: blockKey},
                  'children',
                  block.children.indexOf(child),
                  keyName,
                ]),
              )
            } else {
              const val = get(operation.newProperties, keyName)
              patches.push(
                set(val, [
                  {_key: blockKey},
                  'children',
                  {_key: childKey},
                  keyName,
                ]),
              )
            }
          })
          return patches
        }
        throw new Error('Could not find a valid child')
      }
      throw new Error('Could not find a valid block')
    } else {
      throw new Error(
        `Unexpected path encountered: ${JSON.stringify(operation.path)}`,
      )
    }
  }

  function insertNodePatch(
    editor: PortableTextSlateEditor,
    operation: InsertNodeOperation,
    beforeValue: Descendant[],
  ): Patch[] {
    const block = beforeValue[operation.path[0]]
    const isTextBlock = editor.isTextBlock(block)
    if (operation.path.length === 1) {
      const position = operation.path[0] === 0 ? 'before' : 'after'
      const beforeBlock = beforeValue[operation.path[0] - 1]
      const targetKey =
        operation.path[0] === 0 ? block?._key : beforeBlock?._key
      if (targetKey) {
        return [
          insert(
            [fromSlateValue([operation.node as Descendant], textBlockName)[0]],
            position,
            [{_key: targetKey}],
          ),
        ]
      }
      return [
        setIfMissing(beforeValue, []),
        insert(
          [fromSlateValue([operation.node as Descendant], textBlockName)[0]],
          'before',
          [operation.path[0]],
        ),
      ]
    } else if (
      isTextBlock &&
      operation.path.length === 2 &&
      editor.children[operation.path[0]]
    ) {
      const position =
        block.children.length === 0 || !block.children[operation.path[1] - 1]
          ? 'before'
          : 'after'
      const node = {...operation.node} as Descendant
      if (!node._type && Text.isText(node)) {
        node._type = 'span'
        node.marks = []
      }
      const blk = fromSlateValue(
        [
          {
            _key: 'bogus',
            _type: textBlockName,
            children: [node],
          },
        ],
        textBlockName,
      )[0] as PortableTextTextBlock
      const child = blk.children[0]
      return [
        insert([child], position, [
          {_key: block._key},
          'children',
          block.children.length <= 1 || !block.children[operation.path[1] - 1]
            ? 0
            : {_key: block.children[operation.path[1] - 1]._key},
        ]),
      ]
    }
    debug(
      'Something was inserted into a void block. Not producing editor patches.',
    )
    return []
  }

  function splitNodePatch(
    editor: PortableTextSlateEditor,
    operation: SplitNodeOperation,
    beforeValue: Descendant[],
  ) {
    const patches: Patch[] = []
    const splitBlock = editor.children[operation.path[0]]
    if (!editor.isTextBlock(splitBlock)) {
      throw new Error(
        `Block with path ${JSON.stringify(
          operation.path[0],
        )} is not a text block and can't be split`,
      )
    }
    if (operation.path.length === 1) {
      const oldBlock = beforeValue[operation.path[0]]
      if (editor.isTextBlock(oldBlock)) {
        const targetValue = fromSlateValue(
          [editor.children[operation.path[0] + 1]],
          textBlockName,
        )[0]
        if (targetValue) {
          patches.push(
            insert([targetValue], 'after', [{_key: splitBlock._key}]),
          )
          const spansToUnset = oldBlock.children.slice(operation.position)
          spansToUnset.forEach((span) => {
            const path = [{_key: oldBlock._key}, 'children', {_key: span._key}]
            patches.push(unset(path))
          })
        }
      }
      return patches
    }
    if (operation.path.length === 2) {
      const splitSpan = splitBlock.children[operation.path[1]]
      if (editor.isTextSpan(splitSpan)) {
        const targetSpans = (
          fromSlateValue(
            [
              {
                ...splitBlock,
                children: splitBlock.children.slice(
                  operation.path[1] + 1,
                  operation.path[1] + 2,
                ),
              } as Descendant,
            ],
            textBlockName,
          )[0] as PortableTextTextBlock
        ).children

        patches.push(
          insert(targetSpans, 'after', [
            {_key: splitBlock._key},
            'children',
            {_key: splitSpan._key},
          ]),
        )
        patches.push(
          set(splitSpan.text, [
            {_key: splitBlock._key},
            'children',
            {_key: splitSpan._key},
            'text',
          ]),
        )
      }
      return patches
    }
    return patches
  }

  function removeNodePatch(
    editor: PortableTextSlateEditor,
    operation: RemoveNodeOperation,
    beforeValue: Descendant[],
  ) {
    const block = beforeValue[operation.path[0]]
    if (operation.path.length === 1) {
      // Remove a single block
      if (block && block._key) {
        return [unset([{_key: block._key}])]
      }
      throw new Error('Block not found')
    } else if (editor.isTextBlock(block) && operation.path.length === 2) {
      const spanToRemove = block.children[operation.path[1]]

      if (spanToRemove) {
        const spansMatchingKey = block.children.filter(
          (span) => span._key === operation.node._key,
        )

        if (spansMatchingKey.length > 1) {
          console.warn(
            `Multiple spans have \`_key\` ${operation.node._key}. It's ambiguous which one to remove.`,
            JSON.stringify(block, null, 2),
          )
          return []
        }

        return [
          unset([{_key: block._key}, 'children', {_key: spanToRemove._key}]),
        ]
      }
      debug('Span not found in editor trying to remove node')
      return []
    } else {
      debug('Not creating patch inside object block')
      return []
    }
  }

  function mergeNodePatch(
    editor: PortableTextSlateEditor,
    operation: MergeNodeOperation,
    beforeValue: Descendant[],
  ) {
    const patches: Patch[] = []

    const block = beforeValue[operation.path[0]]
    const updatedBlock = editor.children[operation.path[0]]

    if (operation.path.length === 1) {
      if (block?._key) {
        const newBlock = fromSlateValue(
          [editor.children[operation.path[0] - 1]],
          textBlockName,
        )[0]
        patches.push(set(newBlock, [{_key: newBlock._key}]))
        patches.push(unset([{_key: block._key}]))
      } else {
        throw new Error('Target key not found!')
      }
    } else if (
      editor.isTextBlock(block) &&
      editor.isTextBlock(updatedBlock) &&
      operation.path.length === 2
    ) {
      const updatedSpan =
        updatedBlock.children[operation.path[1] - 1] &&
        editor.isTextSpan(updatedBlock.children[operation.path[1] - 1])
          ? updatedBlock.children[operation.path[1] - 1]
          : undefined
      const removedSpan =
        block.children[operation.path[1]] &&
        editor.isTextSpan(block.children[operation.path[1]])
          ? block.children[operation.path[1]]
          : undefined

      if (updatedSpan) {
        const spansMatchingKey = block.children.filter(
          (span) => span._key === updatedSpan._key,
        )

        if (spansMatchingKey.length === 1) {
          patches.push(
            set(updatedSpan.text, [
              {_key: block._key},
              'children',
              {_key: updatedSpan._key},
              'text',
            ]),
          )
        } else {
          console.warn(
            `Multiple spans have \`_key\` ${updatedSpan._key}. It's ambiguous which one to update.`,
            JSON.stringify(block, null, 2),
          )
        }
      }

      if (removedSpan) {
        const spansMatchingKey = block.children.filter(
          (span) => span._key === removedSpan._key,
        )

        if (spansMatchingKey.length === 1) {
          patches.push(
            unset([{_key: block._key}, 'children', {_key: removedSpan._key}]),
          )
        } else {
          console.warn(
            `Multiple spans have \`_key\` ${removedSpan._key}. It's ambiguous which one to remove.`,
            JSON.stringify(block, null, 2),
          )
        }
      }
    } else {
      debug("Void nodes can't be merged, not creating any patches")
    }
    return patches
  }

  function moveNodePatch(
    editor: PortableTextSlateEditor,
    operation: MoveNodeOperation,
    beforeValue: Descendant[],
  ) {
    const patches: Patch[] = []
    const block = beforeValue[operation.path[0]]
    const targetBlock = beforeValue[operation.newPath[0]]

    if (!targetBlock) {
      return patches
    }

    if (operation.path.length === 1) {
      const position: InsertPosition =
        operation.path[0] > operation.newPath[0] ? 'before' : 'after'
      patches.push(unset([{_key: block._key}]))
      patches.push(
        insert([fromSlateValue([block], textBlockName)[0]], position, [
          {_key: targetBlock._key},
        ]),
      )
    } else if (
      operation.path.length === 2 &&
      editor.isTextBlock(block) &&
      editor.isTextBlock(targetBlock)
    ) {
      const child = block.children[operation.path[1]]
      const targetChild = targetBlock.children[operation.newPath[1]]
      const position =
        operation.newPath[1] === targetBlock.children.length
          ? 'after'
          : 'before'
      const childToInsert = (
        fromSlateValue([block], textBlockName)[0] as PortableTextTextBlock
      ).children[operation.path[1]]
      patches.push(unset([{_key: block._key}, 'children', {_key: child._key}]))
      patches.push(
        insert([childToInsert], position, [
          {_key: targetBlock._key},
          'children',
          {_key: targetChild._key},
        ]),
      )
    }
    return patches
  }

  return {
    insertNodePatch,
    insertTextPatch,
    mergeNodePatch,
    moveNodePatch,
    removeNodePatch,
    removeTextPatch,
    setNodePatch,
    splitNodePatch,
  }
}
