import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {EngineOperation} from '../interfaces/operation'
import type {Point, PointTransformOptions} from '../interfaces/point'
import {mapPointThroughSteps, type Step} from './step-mapper'

/**
 * Transform a point by an operation. Returns the same `point` reference when
 * the operation doesn't actually move the point, so callers can use referential
 * equality to detect "nothing changed."
 *
 * With keyed paths, most operations don't affect paths at all:
 * - insert: no-op (new node has its own key, doesn't shift siblings)
 * - unset (node removal): invalidates if the point is at or inside the removed node
 * - unset (property removal): collapses offset when `text` is unset from a span
 * - insert.text: adjusts offset if in the same span
 * - remove.text: adjusts offset if in the same span
 * - set: updates keyed segments when `_key` changes, clamps offset when `text` changes
 * - set.selection: no-op
 */
export function transformPoint(
  point: Point | null,
  op: EngineOperation,
  options: PointTransformOptions = {},
): Point | null {
  return mapPointThroughSteps(operationToSteps(op), point, options)
}

function operationToSteps(op: EngineOperation): Step[] {
  switch (op.type) {
    case 'insert.text':
      return [
        {type: 'insert.text', path: op.path, offset: op.offset, text: op.text},
      ]

    case 'remove.text':
      return [
        {type: 'remove.text', path: op.path, offset: op.offset, text: op.text},
      ]

    case 'set': {
      const propertyName = op.path[op.path.length - 1]
      const nodePath = op.path.slice(0, -1)

      if (propertyName === '_key' && typeof op.value === 'string') {
        const oldKey =
          op.inverse?.type === 'set' && typeof op.inverse.value === 'string'
            ? op.inverse.value
            : undefined

        return oldKey ? [{type: 'rekey', oldKey, newKey: op.value}] : []
      }

      if (propertyName === 'text') {
        return [
          {
            type: 'set.text',
            path: nodePath,
            text: typeof op.value === 'string' ? op.value : '',
          },
        ]
      }

      if (propertyName === 'children' && Array.isArray(op.value)) {
        const oldChildren =
          op.inverse?.type === 'set' && Array.isArray(op.inverse.value)
            ? (op.inverse.value as Array<unknown>)
            : undefined

        return oldChildren === undefined
          ? []
          : [
              {
                type: 'replace.children',
                path: op.path,
                oldChildren,
                newChildren: op.value as Array<unknown>,
              },
            ]
      }

      return []
    }

    case 'unset': {
      const lastSegment = op.path[op.path.length - 1]

      if (isKeyedSegment(lastSegment)) {
        return [{type: 'remove.node', path: op.path}]
      }

      if (lastSegment === 'text') {
        return [{type: 'unset.text', path: op.path.slice(0, -1)}]
      }

      return []
    }

    // insert, set.selection: no transform needed
    default:
      return []
  }
}
