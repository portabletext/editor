import {isTextBlock} from '@portabletext/schema'
import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorContext} from '..'
import {parseBlock} from '../internal-utils/parse-blocks'

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
    context,
    block: incomingBlock,
    options: {removeUnusedMarkDefs: true, validateFields: false},
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
