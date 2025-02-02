import type {PortableTextTextBlock} from '@sanity/types'
import {parseBlock} from '../internal-utils/parse-blocks'
import type {EditorContext} from '../selectors'
import {isTextBlock} from './util.is-text-block'

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
    options: {refreshKeys: true},
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
