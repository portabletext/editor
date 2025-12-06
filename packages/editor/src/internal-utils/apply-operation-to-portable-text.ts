import {applyAll} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {Operation} from 'slate'
import type {EditorContext} from '../editor/editor-snapshot'
import type {OmitFromUnion} from '../type-utils'
import {operationToIncomingPatches} from './operation-to-incoming-patches'

/**
 * Apply a Slate operation to a Portable Text value.
 *
 * This function converts the operation to patches and applies them
 * using the @portabletext/patches library.
 */
export function applyOperationToPortableText(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  value: Array<PortableTextBlock>,
  operation: OmitFromUnion<Operation, 'type', 'set_selection'>,
): Array<PortableTextBlock> {
  try {
    const patches = operationToIncomingPatches(context, value, operation)
    if (patches.length === 0) {
      return value
    }
    return applyAll(value, patches) ?? value
  } catch (e) {
    console.error(e)
    return value
  }
}
