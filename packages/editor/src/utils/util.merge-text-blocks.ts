import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {parseBlock} from './parse-blocks'

/**
 * @beta
 */
export function mergeTextBlocks({
  context,
  targetBlock,
  incomingBlock,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  targetBlock: PortableTextTextBlock
  incomingBlock: PortableTextTextBlock
}) {
  const parsedIncomingBlock = parseBlock({
    keyGenerator: context.keyGenerator,
    block: incomingBlock,
    options: {
      normalize: false,
      removeUnusedMarkDefs: true,
      validateFields: false,
    },
    schema: context.schema,
  })

  if (!parsedIncomingBlock || !isTextBlock(context, parsedIncomingBlock)) {
    return targetBlock
  }

  return {
    ...targetBlock,
    children: [...targetBlock.children, ...parsedIncomingBlock.children],
    markDefs: [
      ...(targetBlock.markDefs ?? []),
      ...(parsedIncomingBlock.markDefs ?? []),
    ],
  }
}
