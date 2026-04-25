import {isSpan, type PortableTextChild} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNodes} from '../node-traversal/get-nodes'
import {isInline} from '../node-traversal/is-inline'
import type {Path} from '../slate/interfaces/path'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

type SelectedChild<TChild extends PortableTextChild = PortableTextChild> = {
  node: TChild
  path: Path
}

type GetSelectedChildrenOptions<
  TChild extends PortableTextChild = PortableTextChild,
> = {
  filter?: (child: PortableTextChild) => child is TChild
}

/**
 * Returns the inline children (spans and inline objects) touched by the
 * selection, resolved at any depth.
 *
 * @public
 */
export function getSelectedChildren<
  TChild extends PortableTextChild = PortableTextChild,
>(
  options?: GetSelectedChildrenOptions<TChild>,
): EditorSelector<Array<SelectedChild<TChild>>> {
  const filter = options?.filter

  return (snapshot) => {
    const startPoint = getSelectionStartPoint(snapshot.context.selection)
    const endPoint = getSelectionEndPoint(snapshot.context.selection)

    if (!startPoint || !endPoint) {
      return []
    }

    const startChildKey = startPoint.path.findLast(isKeyedSegment)?._key
    const endChildKey = endPoint.path.findLast(isKeyedSegment)?._key

    const result: Array<SelectedChild<TChild>> = []

    for (const entry of getNodes(
      {...snapshot.context, blockIndexMap: snapshot.blockIndexMap},
      {
        from: startPoint.path,
        to: endPoint.path,
        match: (_, path) => isInline(snapshot.context, path),
      },
    )) {
      const child = entry.node as PortableTextChild

      // Skip the start child when the selection begins exactly at its end
      // and skip the end child when the selection ends exactly at its start.
      if (child._key === startChildKey && isSpan(snapshot.context, child)) {
        if (startPoint.offset >= child.text.length) {
          continue
        }
      }

      if (child._key === endChildKey && isSpan(snapshot.context, child)) {
        if (endPoint.offset <= 0) {
          continue
        }
      }

      if (filter && !filter(child)) {
        continue
      }

      result.push({node: child as TChild, path: entry.path})
    }

    return result
  }
}
