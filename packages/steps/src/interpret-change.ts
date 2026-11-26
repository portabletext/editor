import {applyAll, type Patch, type Path} from '@portabletext/patches'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type Schema,
} from '@portabletext/schema'
import {
  adjustIndiciesToUcs2,
  applyPatches,
  parsePatch,
  type Patch as TextPatch,
} from '@sanity/diff-match-patch'
import {arraySegments, nearestSpans, walkNodes} from './lib/document'
import {getValue} from './lib/get-value'
import {isKeyedSegment} from './lib/is-keyed-segment'
import {isRecord} from './lib/is-record'
import {pathContains} from './lib/path-contains'
import {pathEquals} from './lib/path-equals'
import {defaultSchema, isTextSpan, schemaAtPath} from './lib/span'
import type {Point, Step, StepPath} from './step-mapper'

const textEncoder = new TextEncoder()

/**
 * Turn one edit sent by the Portable Text Editor into steps. Works at any
 * container depth and on string diffs sent in place of the editor's `set`s.
 *
 * Unrecognized batches invalidate positions under their patch paths with
 * `remove.node` steps whose `nearest` is `null`. A span text path invalidates
 * the span. Positions outside those paths stay put. An empty step list
 * represents a recognized edit that does not move points.
 *
 * Pass the document before the patches as `value`, one editor change at a
 * time. Never merge two changes' patches into one call. If you read patches
 * addressed to a whole document, start a new call at each `setIfMissing` on
 * the field itself.
 * Every top-level block needs a unique, non-empty `_key`. Keys inside a block
 * are checked only in blocks the change touches.
 * @public
 */
export function interpretChange(
  input: {value: ReadonlyArray<PortableTextBlock>; schema?: Schema},
  patches: ReadonlyArray<Patch>,
): ReadonlyArray<Step> {
  const recognized = interpretRecognizedChange(input, patches)
  if (recognized !== undefined) return recognized
  return freezeSteps(
    patches.map(
      (patch): Step => ({
        type: 'remove.node',
        path: replacementPath(input, patch.path),
        nearest: null,
        replacement: true,
      }),
    ),
  )
}

function interpretRecognizedChange(
  input: {value: ReadonlyArray<PortableTextBlock>; schema?: Schema},
  patches: ReadonlyArray<Patch>,
): ReadonlyArray<Step> | undefined {
  try {
    if (!isRecord(input)) {
      return undefined
    }
    const {value, schema = defaultSchema} = input
    if (!Array.isArray(value)) {
      return undefined
    }
    if (patches.length === 0) {
      return Object.freeze([])
    }
    if (
      patches[0]?.type === 'setIfMissing' &&
      patches[0].path.length === 0 &&
      patches[1]?.type === 'insert' &&
      patches[1].position === 'before' &&
      patches[1].path.length === 1 &&
      patches[1].path[0] === 0 &&
      deepEqual(patches[1].items, value)
    ) {
      return interpretRecognizedChange({schema, value}, patches.slice(2))
    }
    const rootUnsetIndex = patches.findIndex(
      (patch) => patch.type === 'unset' && patch.path.length === 0,
    )
    if (rootUnsetIndex !== -1) {
      if (rootUnsetIndex !== patches.length - 1) {
        return undefined
      }
      const preceding = patches.slice(0, rootUnsetIndex)
      const prefix = interpretRecognizedChange({schema, value}, preceding)
      if (prefix === undefined) {
        return undefined
      }
      const remainder = applyAll(value, [...preceding])
      if (
        Array.isArray(remainder) &&
        remainder.length === 1 &&
        isTextBlock({schema}, remainder[0]) &&
        remainder[0].children.length > 0 &&
        remainder[0].children.every(
          (child) => isSpan({schema}, child) && child.text === '',
        )
      ) {
        return prefix
      }
      return undefined
    }
    if (
      hasInvalidPatchedArrays(value, patches) ||
      patches.some((patch) =>
        patch.path.some((segment) => typeof segment === 'number'),
      )
    ) {
      return undefined
    }
    const decoded = decodeReceived(value, patches)
    if (typeof decoded === 'string') {
      return undefined
    }
    const steps = interpretDecoded(schema, value, decoded)
    return steps === undefined ? undefined : freezeSteps(steps)
  } catch {
    return undefined
  }
}

function replacementPath(
  input: {value: ReadonlyArray<PortableTextBlock>; schema?: Schema},
  path: Path,
): StepPath {
  const result: StepPath = []
  for (const segment of path) {
    if (Array.isArray(segment)) break
    result.push(segment)
  }
  const spanPath = result.slice(0, -1)
  if (
    result.at(-1) === 'text' &&
    isTextSpan(
      getValue(input.value, spanPath),
      input.value,
      spanPath,
      input.schema,
    )
  )
    result.pop()
  return result
}

function isEnvelope(patch: Patch): boolean {
  return patch.type === 'setIfMissing' && patch.path.length === 0
}

function decodeReceived(
  base: ReadonlyArray<PortableTextBlock>,
  patches: ReadonlyArray<Patch>,
): Array<Patch> | string {
  const decoded: Array<Patch> = []
  let value: unknown = base
  for (const [index, patch] of patches.entries()) {
    if (isEnvelope(patch)) {
      continue
    }
    let next = patch
    if (patch.type === 'diffMatchPatch' && patch.path.at(-1) !== 'text') {
      const current = getValue(value, patch.path)
      if (typeof current !== 'string') {
        return `patch ${index} diffs a non-string at ${JSON.stringify(patch.path)}`
      }
      const result = applyExactDiff(current, patch.value)
      if (result === undefined) {
        return `patch ${index} does not decode against the base`
      }
      next = {type: 'set', path: patch.path, value: result}
    }
    decoded.push(next)
    try {
      value = applyAll(value, [next])
    } catch (error) {
      return `patch ${index} does not apply: ${String(error)}`
    }
  }
  return decoded
}

function interpretDecoded(
  schema: Schema,
  base: ReadonlyArray<PortableTextBlock>,
  patches: ReadonlyArray<Patch>,
): Array<Step> | undefined {
  let tokens = ''
  const arrays = new Set<string>()
  let value: unknown = base

  for (const patch of patches) {
    const shape = tokenOf(patch, value, schema)
    if (!shape) {
      return undefined
    }
    value = applyAll(value, [patch])
    tokens += shape.token
    if (shape.blockArray) {
      arrays.add(JSON.stringify(shape.blockArray))
    }
  }

  if (arrays.size !== 1) {
    return undefined
  }
  const gesture = gestureOf(tokens, base, patches)

  if (!validGesture(schema, base, patches, tokens, gesture)) {
    return undefined
  }

  const timeline = readTimeline(schema, base, patches)
  if (typeof timeline === 'string') {
    return undefined
  }

  if (
    gesture === 'block-join' &&
    !tokens.startsWith('t') &&
    timeline.events.some(
      (event) =>
        event.type === 'departure' &&
        event.kind === 'block-span' &&
        !event.pair,
    )
  ) {
    return undefined
  }

  return emit(timeline.events, timeline.finalValue, schema, timeline.nearest)
}

function gestureOf(
  tokens: string,
  base: unknown,
  patches: ReadonlyArray<Patch>,
): string {
  if (tokens === 'XB' && sameBlock(base, patches)) {
    return 'block-move'
  }
  if (tokens.replaceAll(/[pm]/g, '') === 'X') {
    return 'block-remove'
  }
  if (tokens.includes('X')) {
    return 'block-join'
  }
  if (tokens.includes('B')) {
    return 'block-split-or-insert'
  }
  return 'span-restructure'
}

function tokenOf(
  patch: Patch,
  value: unknown,
  schema: Schema,
): {token: string; blockArray?: Path} | undefined {
  const path = patch.path
  const last = path.at(-1)
  const blockPath = enclosingBlockPath(value, path, schema)
  const childIndex = blockPath?.length ?? -1

  switch (patch.type) {
    case 'setIfMissing':
      return typeof last === 'string' ? {token: ''} : undefined
    case 'diffMatchPatch':
      return last === 'text' &&
        blockPath &&
        path[childIndex] === 'children' &&
        path.length === childIndex + 3
        ? {token: 't', blockArray: blockPath.slice(0, -1)}
        : undefined
    case 'set': {
      if (last === '_key' && isKeyedSegment(path.at(-2))) {
        const owner = blockPath
        if (!owner) {
          return undefined
        }
        return {token: 'k', blockArray: owner.slice(0, -1)}
      }
      if (last === 'markDefs' && isKeyedSegment(path.at(-2))) {
        return {token: 'm', blockArray: path.slice(0, -2)}
      }
      if (
        last === 'marks' &&
        blockPath &&
        path[childIndex] === 'children' &&
        path.length === childIndex + 3
      ) {
        return {token: 'n', blockArray: blockPath.slice(0, -1)}
      }
      if (
        (last === 'style' || last === 'level' || last === 'listItem') &&
        isKeyedSegment(path.at(-2))
      ) {
        return {token: 'p', blockArray: path.slice(0, -2)}
      }
      return undefined
    }
    case 'insert':
    case 'unset': {
      if (
        patch.type === 'unset' &&
        (last === 'listItem' ||
          last === 'level' ||
          last === 'style' ||
          last === 'markDefs') &&
        isKeyedSegment(path.at(-2))
      ) {
        return {token: 'p', blockArray: path.slice(0, -2)}
      }
      if (!isKeyedSegment(last)) {
        return undefined
      }
      const isSpanLevel = isSpanArray(value, path, schema)
      const token =
        patch.type === 'insert'
          ? isSpanLevel
            ? 's'
            : 'B'
          : isSpanLevel
            ? 'x'
            : 'X'
      return {
        token,
        blockArray: isSpanLevel ? path.slice(0, -3) : path.slice(0, -1),
      }
    }
    default:
      return undefined
  }
}

function sameBlock(base: unknown, patches: ReadonlyArray<Patch>): boolean {
  const unset = patches.find((patch) => patch.type === 'unset')
  const insert = patches.find((patch) => patch.type === 'insert')
  if (!unset || insert?.type !== 'insert') {
    return false
  }
  const removed = unset.path.at(-1)
  return (
    isKeyedSegment(removed) &&
    insert.items.length === 1 &&
    deepEqual(insert.items[0], getValue(base, unset.path))
  )
}

type Departure = {
  type: 'departure'
  at: number
  kind: 'suffix' | 'span' | 'block-span'
  path: StepPath
  key: string
  offset: number
  text: string
  pair?: Arrival
}

type Arrival = {
  type: 'arrival'
  at: number
  kind: 'append' | 'node'
  path: StepPath
  key: string
  offset: number
  text: string
  existing?: StepPath
  anchor?: StepPath
  pair?: Departure | 'existing'
}

type Event =
  | Departure
  | Arrival
  | {type: 'step'; at: number; step: Step}
  | {
      type: 'collapse'
      at: number
      path: StepPath
      to?: {path: StepPath; offset: number}
    }
  | {type: 'remove-block'; at: number; path: StepPath; nearest: Point | null}
  | {
      type: 'new-block'
      at: number
      after: StepPath
      path: StepPath
      spans: Array<Arrival>
    }

function readTimeline(
  schema: Schema,
  base: ReadonlyArray<PortableTextBlock>,
  patches: ReadonlyArray<Patch>,
):
  | {
      events: Array<Event>
      finalValue: unknown
      nearest: Map<number, () => Point | null>
    }
  | string {
  const nearest = new Map<number, () => Point | null>()
  const events: Array<Event> = []
  let value: unknown = base
  let finalValue: unknown
  try {
    finalValue = applyAll(base, [...patches])
  } catch (error) {
    return `patches do not apply: ${String(error)}`
  }

  if (hasInvalidPatchedArrays(finalValue, patches)) {
    return 'patches leave invalid arrays'
  }

  for (const [index, patch] of patches.entries()) {
    const at = index
    const path = patch.path as StepPath
    const before = value
    if (patch.type === 'unset') {
      nearest.set(at, () => nearestPoint(before, path, schema))
    }
    try {
      value = applyAll(before, [patch])
    } catch (error) {
      return `patch ${index} does not apply: ${String(error)}`
    }
    if (
      hasInvalidChangedArrays(value, path) ||
      (patch.type === 'insert' && hasInvalidArrays(patch.items, true)) ||
      (patch.type === 'set' &&
        hasInvalidArrays(patch.value, path.at(-1) === 'children')) ||
      (patch.type === 'unset' &&
        hasInvalidArrays(getValue(before, path), path.at(-1) === 'children'))
    ) {
      return `patch ${index} leaves duplicate sibling keys`
    }

    if (patch.type === 'diffMatchPatch') {
      const spanPath = path.slice(0, -1)
      const oldText = getValue(before, spanPath as Path)
      if (!isRecord(oldText) || typeof oldText['text'] !== 'string') {
        return `patch ${index} diffs a missing span`
      }
      let text = oldText['text']
      if (applyExactDiff(text, patch.value) === undefined) {
        return 'text diff does not match its source'
      }
      for (const hunk of parsePatch(patch.value)) {
        let offset = hunkStartInUtf16(hunk, text)
        for (const [operation, chunk] of hunk.diffs) {
          if (operation === 0) {
            offset += chunk.length
          } else if (operation === 1) {
            const atEnd = offset === text.length
            events.push(
              atEnd
                ? {
                    type: 'arrival',
                    at,
                    kind: 'append',
                    path: spanPath,
                    key: keyOf(spanPath),
                    offset,
                    text: chunk,
                  }
                : {
                    type: 'step',
                    at,
                    step: {
                      type: 'insert.text',
                      path: spanPath,
                      offset,
                      length: chunk.length,
                    },
                  },
            )
            text = text.slice(0, offset) + chunk + text.slice(offset)
            offset += chunk.length
          } else {
            const atEnd = offset + chunk.length === text.length
            events.push(
              atEnd
                ? {
                    type: 'departure',
                    at,
                    kind: 'suffix',
                    path: spanPath,
                    key: keyOf(spanPath),
                    offset,
                    text: chunk,
                  }
                : {
                    type: 'step',
                    at,
                    step: {
                      type: 'remove.text',
                      path: spanPath,
                      offset,
                      length: chunk.length,
                    },
                  },
            )
            text = text.slice(0, offset) + text.slice(offset + chunk.length)
          }
        }
      }
      continue
    }

    if (patch.type === 'set' && path.at(-1) === '_key') {
      events.push({
        type: 'step',
        at,
        step: {
          type: 'set.key',
          path: path.slice(0, -1),
          newKey: String(patch.value),
        },
      })
      continue
    }

    if (patch.type === 'insert') {
      if (
        patch.position === 'replace' ||
        getValue(before, path as Path) === undefined
      ) {
        return `patch ${index} inserts ${patch.position} a missing or replaced anchor`
      }
      const arrayPath = path.slice(0, -1)
      const isBlockLevel = !isSpanArray(before, path as Path, schema)
      for (const item of patch.items) {
        if (!isRecord(item) || typeof item['_key'] !== 'string') {
          return `patch ${index} inserts an item without a key`
        }
        const itemPath = [...arrayPath, {_key: item['_key']}]
        const spans = !isBlockLevel
          ? [{path: itemPath, node: item}]
          : isTextBlock({schema: schemaAtPath(before, path, schema)}, item)
            ? item.children.map((child) => ({
                path: [...itemPath, 'children', {_key: child._key}],
                node: child,
              }))
            : []
        const arrivals: Array<Arrival> = []
        for (const span of spans) {
          if (
            !isTextSpan(span.node, value, span.path as Path, schema) ||
            span.node['text'] === ''
          ) {
            continue
          }
          const existing = findSpanElsewhere(
            schema,
            patches,
            before,
            span.path,
            keyOf(span.path),
            span.node['text'],
          )
          if (existing === null) {
            return 'ambiguous span source'
          }
          const arrival: Arrival = {
            type: 'arrival',
            at,
            kind: 'node',
            path: span.path,
            key: keyOf(span.path),
            offset: 0,
            text: span.node['text'],
            existing,
            anchor: path,
          }
          arrivals.push(arrival)
          events.push(arrival)
        }
        if (
          isBlockLevel &&
          patch.position === 'after' &&
          isTextBlock({schema: schemaAtPath(before, path, schema)}, item)
        ) {
          events.push({
            type: 'new-block',
            at,
            after: path,
            path: itemPath,
            spans: arrivals,
          })
        }
      }
      continue
    }

    if (patch.type === 'unset') {
      if (
        path.at(-1) === 'listItem' ||
        path.at(-1) === 'level' ||
        path.at(-1) === 'style' ||
        path.at(-1) === 'markDefs'
      ) {
        continue
      }
      const node = getValue(before, path as Path)
      if (node === undefined) {
        return `patch ${index} unsets a missing node`
      }
      if (isSpanArray(before, path as Path, schema)) {
        if (
          isTextSpan(node, before, path as Path, schema) &&
          node.text !== ''
        ) {
          events.push({
            type: 'departure',
            at,
            kind: 'span',
            path,
            key: keyOf(path),
            offset: 0,
            text: node.text,
          })
        } else {
          const carried = carriedInlineObject(
            schema,
            patches,
            before,
            path,
            node,
          )
          events.push(
            carried
              ? {
                  type: 'step',
                  at,
                  step: {type: 'move.node', from: path, to: carried},
                }
              : {
                  type: 'collapse',
                  at,
                  path,
                  to: neighborEnd(schema, before, path),
                },
          )
        }
        continue
      }
      if (isTextBlock({schema: schemaAtPath(before, path, schema)}, node)) {
        for (const child of node.children) {
          const childPath = [...path, 'children', {_key: child._key}]
          const carried = carriedInlineObject(
            schema,
            patches,
            before,
            childPath,
            child,
          )
          if (carried) {
            events.push({
              type: 'step',
              at,
              step: {type: 'move.node', from: childPath, to: carried},
            })
          }
          if (
            isSpan(
              {schema: schemaAtPath(before, path as Path, schema)},
              child,
            ) &&
            child.text !== '' &&
            !events.some(
              (event) =>
                event.type === 'arrival' &&
                event.existing &&
                pathEquals(
                  event.existing as Path,
                  [...path, 'children', {_key: child._key}] as Path,
                ),
            )
          ) {
            events.push({
              type: 'departure',
              at,
              kind: 'block-span',
              path: [...path, 'children', {_key: child._key}],
              key: child._key,
              offset: 0,
              text: child.text,
            })
          }
        }
      }
      if (getValue(finalValue, path as Path) === undefined) {
        events.push({
          type: 'remove-block',
          at,
          path,
          nearest: nearest.get(at)!(),
        })
      }
    }
  }

  pairEvents(events)
  return {events, finalValue, nearest}
}

function pairEvents(events: Array<Event>) {
  const departures = events.filter(
    (event): event is Departure => event.type === 'departure',
  )
  for (const arrival of events) {
    if (arrival.type !== 'arrival') {
      continue
    }
    const open = departures.filter(
      (departure) => !departure.pair && departure.text === arrival.text,
    )
    const byKey =
      arrival.kind === 'node'
        ? open.find(
            (departure) =>
              departure.at < arrival.at && departure.key === arrival.key,
          )
        : undefined
    if (byKey) {
      link(byKey, arrival)
      continue
    }
    if (arrival.existing) {
      arrival.pair = 'existing'
      continue
    }

    if (arrival.kind === 'node') {
      const carved = open.find(
        (departure) =>
          departure.kind === 'suffix' && isAdjacent(departure.path, arrival),
      )
      if (carved) {
        link(carved, arrival)
      }
      continue
    }

    const candidates = open.filter((departure) =>
      isFoldSource(departure, arrival),
    )
    const earlier = candidates.filter((departure) => departure.at <= arrival.at)
    const later = candidates.filter(
      (departure) =>
        departure.at > arrival.at &&
        !pathEquals(departure.path as Path, arrival.path as Path),
    )
    const byText = earlier.at(-1) ?? later[0]
    if (byText) {
      link(byText, arrival)
    }
  }
}

function isFoldSource(departure: Departure, arrival: Arrival): boolean {
  const departureBlock = departure.path.slice(0, -2)
  const arrivalBlock = arrival.path.slice(0, -2)
  if (departure.kind === 'span') {
    return pathEquals(departureBlock as Path, arrivalBlock as Path)
  }
  if (departure.kind === 'block-span') {
    return pathEquals(
      departureBlock.slice(0, -1) as Path,
      arrivalBlock.slice(0, -1) as Path,
    )
  }
  return false
}

function isAdjacent(spanPath: StepPath, arrival: Arrival): boolean {
  const anchor = arrival.anchor
  if (!anchor) {
    return false
  }
  const blockPath = spanPath.slice(0, -2)
  const sameBlock =
    pathEquals(anchor.slice(0, -2) as Path, blockPath as Path) &&
    anchor.at(-2) === 'children'
  const nextBlock = pathEquals(anchor as Path, blockPath as Path)
  return sameBlock || nextBlock
}

function link(departure: Departure, arrival: Arrival) {
  departure.pair = arrival
  arrival.pair = departure
}

function emit(
  events: Array<Event>,
  finalValue: unknown,
  schema: Schema,
  nearest: ReadonlyMap<number, () => Point | null>,
): Array<Step> {
  const steps: Array<Step> = []
  const ordered = events
    .map((event, order) => ({
      event,
      order,
      at:
        event.type === 'remove-block'
          ? Math.max(
              event.at,
              ...events
                .filter(
                  (candidate): candidate is Departure =>
                    candidate.type === 'departure' &&
                    pathContains(event.path, candidate.path),
                )
                .map(emitTime),
            ) + 0.25
          : emitTime(event),
    }))
    .sort((left, right) => left.at - right.at || left.order - right.order)

  for (const {event} of ordered) {
    switch (event.type) {
      case 'step':
        steps.push(event.step)
        break
      case 'collapse':
        steps.push(
          event.to
            ? {
                type: 'move.text',
                from: {path: event.path, offset: 0, length: 0},
                to: event.to,
              }
            : {
                type: 'remove.node',
                path: event.path,
                nearest: nearest.get(event.at)!(),
              },
        )
        break
      case 'remove-block':
        steps.push({
          type: 'remove.node',
          path: event.path,
          nearest: event.nearest,
        })
        break
      case 'new-block':
        break
      case 'arrival':
        if (event.pair === 'existing' && event.existing) {
          steps.push({type: 'move.node', from: event.existing, to: event.path})
        } else if (!event.pair && event.kind === 'append') {
          steps.push({
            type: 'insert.text',
            path: event.path,
            offset: event.offset,
            length: event.text.length,
          })
        }
        break
      case 'departure': {
        const arrival = event.pair
        if (!arrival) {
          if (event.kind === 'suffix') {
            steps.push({
              type: 'remove.text',
              path: event.path,
              offset: event.offset,
              length: event.text.length,
            })
          } else if (event.kind === 'span') {
            steps.push({
              type: 'remove.node',
              path: event.path,
              nearest: nearest.get(event.at)!(),
            })
          }
          break
        }
        if (pathEquals(event.path as Path, arrival.path as Path)) {
          break
        }
        if (event.kind !== 'suffix' && arrival.kind === 'node') {
          steps.push({type: 'move.node', from: event.path, to: arrival.path})
          break
        }

        if (
          event.kind === 'suffix' &&
          events.some(
            (other) =>
              other.type === 'departure' &&
              other.kind === 'span' &&
              !other.pair &&
              other.at > arrival.at &&
              pathEquals(other.path as Path, arrival.path as Path),
          ) &&
          !events.some(
            (other) =>
              other.type === 'arrival' &&
              other.pair === 'existing' &&
              other.existing &&
              pathEquals(other.existing as Path, arrival.path as Path),
          )
        ) {
          steps.push({
            type: 'remove.text',
            path: event.path,
            offset: event.offset,
            length: event.text.length,
          })
          break
        }

        if (isTransient(events, event)) {
          steps.push({
            type: 'insert.text',
            path: arrival.path,
            offset: arrival.offset,
            length: event.text.length,
          })
          break
        }
        steps.push(
          {
            type: 'move.text',
            from: {
              path: event.path,
              offset: event.offset,
              length: event.text.length,
            },
            to: {path: arrival.path, offset: arrival.offset},
          },
          {
            type: 'move.text',
            from: {
              path: event.path,
              offset: event.offset + event.text.length,
              length: 0,
            },
            to: {
              path: arrival.path,
              offset: arrival.offset + event.text.length,
            },
          },
        )
        if (event.kind !== 'suffix') {
          steps.push(
            {
              type: 'move.text',
              from: {path: event.path, offset: event.offset, length: 0},
              to: {path: arrival.path, offset: arrival.offset},
            },
            {
              type: 'remove.node',
              path: event.path,
              nearest: nearest.get(event.at)!(),
            },
          )
        }
        break
      }
    }
  }

  steps.push(...carryBlockEnds(events, finalValue, schema))
  return steps
}

function isTransient(events: Array<Event>, departure: Departure): boolean {
  return (
    departure.kind === 'span' &&
    events.some(
      (event) =>
        event.type === 'arrival' &&
        event.kind === 'node' &&
        event.at < departure.at &&
        !event.pair &&
        pathEquals(event.path as Path, departure.path as Path),
    )
  )
}

function carryBlockEnds(
  events: Array<Event>,
  finalValue: unknown,
  schema: Schema,
): Array<Step> {
  const steps: Array<Step> = []
  for (const event of events) {
    if (
      event.type !== 'new-block' ||
      event.spans.some((arrival) => arrival.pair)
    ) {
      continue
    }
    const hadTail = events.some(
      (other) =>
        other.type === 'departure' &&
        other.kind === 'suffix' &&
        pathEquals(other.path.slice(0, -2) as Path, event.after as Path),
    )
    const textGrew = events.some(
      (other) =>
        other.type === 'arrival' &&
        other.kind === 'append' &&
        pathEquals(other.path.slice(0, -2) as Path, event.after as Path),
    )
    if (hadTail || !textGrew) {
      continue
    }
    const from = lastSpanEnd(schema, finalValue, event.after)
    const to = lastSpanEnd(schema, finalValue, lastNewBlock(events, event))
    if (from && to) {
      steps.push({type: 'move.text', from: {...from, length: 0}, to})
    }
  }
  return steps
}

function lastNewBlock(
  events: Array<Event>,
  first: Extract<Event, {type: 'new-block'}>,
): StepPath {
  let last = first.path
  for (const event of events) {
    if (
      event.type === 'new-block' &&
      pathEquals(event.after as Path, last as Path)
    ) {
      last = event.path
    }
  }
  return last
}

function lastSpanEnd(
  schema: Schema,
  value: unknown,
  blockPath: StepPath,
): {path: StepPath; offset: number} | undefined {
  const block = getValue(value, blockPath as Path)
  if (!isTextBlock({schema: schemaAtPath(value, blockPath, schema)}, block)) {
    return undefined
  }
  const span = block.children.at(-1)
  return isSpan({schema: schemaAtPath(value, blockPath, schema)}, span)
    ? {
        path: [...blockPath, 'children', {_key: span._key}],
        offset: span.text.length,
      }
    : undefined
}

function emitTime(event: Event): number {
  if (event.type === 'departure' && event.pair) {
    return Math.max(event.at, event.pair.at) + 0.5
  }
  return event.at
}

function findSpanElsewhere(
  schema: Schema,
  patches: ReadonlyArray<Patch>,
  value: unknown,
  arrivalPath: StepPath,
  key: string,
  text: string,
): StepPath | undefined | null {
  let found: StepPath | undefined
  for (const {path, node, text: candidateText} of walkNodes(
    value,
    [],
    schema,
  )) {
    const blockPath = path.slice(0, -2)
    if (
      candidateText !== text ||
      node['_key'] !== key ||
      pathEquals(blockPath as Path, arrivalPath.slice(0, -2) as Path) ||
      !patches.some(
        (patch) =>
          patch.type === 'unset' &&
          (pathEquals(patch.path, blockPath as Path) ||
            pathEquals(patch.path, path as Path)),
      )
    ) {
      continue
    }
    if (found) {
      return null
    }
    found = path
  }
  return found
}

function carriedInlineObject(
  schema: Schema,
  patches: ReadonlyArray<Patch>,
  value: unknown,
  path: StepPath,
  node: unknown,
): StepPath | undefined {
  if (
    isTextSpan(node, value, path as Path, schema) ||
    !isRecord(node) ||
    typeof node['_key'] !== 'string'
  ) {
    return undefined
  }
  for (const patch of patches) {
    if (patch.type !== 'insert') {
      continue
    }
    if (isSpanArray(value, patch.path, schema)) {
      if (patch.items.some((item) => deepEqual(item, node))) {
        return [...(patch.path.slice(0, -1) as StepPath), {_key: node['_key']}]
      }
      continue
    }
    for (const item of patch.items) {
      if (!isRecord(item) || !Array.isArray(item['children'])) {
        continue
      }
      const copy = item['children'].find(
        (child) => isRecord(child) && child['_key'] === node['_key'],
      )
      if (copy !== undefined && deepEqual(copy, node)) {
        return [
          ...(patch.path.slice(0, -1) as StepPath),
          {_key: String(item['_key'])},
          'children',
          {_key: node['_key']},
        ]
      }
    }
  }
  return undefined
}

function neighborEnd(
  schema: Schema,
  value: unknown,
  spanPath: StepPath,
): {path: StepPath; offset: number} | undefined {
  const blockPath = spanPath.slice(0, -2)
  const block = getValue(value, blockPath as Path)
  if (!isTextBlock({schema: schemaAtPath(value, blockPath, schema)}, block)) {
    return undefined
  }
  const index = block.children.findIndex(
    (child) => child._key === keyOf(spanPath),
  )
  const previous = block.children[index - 1]
  if (isSpan({schema: schemaAtPath(value, blockPath, schema)}, previous)) {
    return {
      path: [...blockPath, 'children', {_key: previous._key}],
      offset: previous.text.length,
    }
  }
  const next = block.children[index + 1]
  if (isSpan({schema: schemaAtPath(value, blockPath, schema)}, next)) {
    return {path: [...blockPath, 'children', {_key: next._key}], offset: 0}
  }
  return undefined
}

function hasInvalidPatchedArrays(
  value: unknown,
  patches: ReadonlyArray<Patch>,
): boolean {
  const affected = patches.filter((patch) => !isEnvelope(patch))
  if (affected.length === 0) {
    return false
  }
  if (
    !Array.isArray(value) ||
    affected.some((patch) => patch.path.length === 0)
  ) {
    return hasInvalidArrays(value, true)
  }
  if (arraySegments(value).some((segment) => typeof segment === 'number')) {
    return true
  }
  const paths = new Map(
    affected.map((patch) => [
      JSON.stringify(patch.path[0]),
      patch.path.slice(0, 1),
    ]),
  )
  return [...paths.values()].some((path) =>
    hasInvalidArrays(getValue(value, path)),
  )
}

function hasInvalidChangedArrays(value: unknown, path: Path): boolean {
  for (let depth = 0; depth <= path.length; depth++) {
    const node = getValue(value, path.slice(0, depth))
    if (
      Array.isArray(node) &&
      (depth === 0 ||
        path[depth - 1] === 'children' ||
        node.some((item) => typeof item === 'object' && item !== null)) &&
      arraySegments(node).some((segment) => typeof segment === 'number')
    ) {
      return true
    }
  }
  return false
}

function hasInvalidArrays(node: unknown, strict = false): boolean {
  if (Array.isArray(node)) {
    return (
      ((strict ||
        node.some((item) => typeof item === 'object' && item !== null)) &&
        arraySegments(node).some((segment) => typeof segment === 'number')) ||
      node.some((item) => hasInvalidArrays(item))
    )
  }
  return (
    isRecord(node) &&
    Object.entries(node).some(([field, child]) =>
      hasInvalidArrays(child, field === 'children'),
    )
  )
}

function applyExactDiff(text: string, patch: string): string | undefined {
  const hunks = parsePatch(patch)
  if (hunks.length === 0) {
    return undefined
  }
  let result = text
  for (const hunk of hunks) {
    if (hunk.start2 < 0 || hunk.start2 > textEncoder.encode(result).length) {
      return undefined
    }
    const offset = hunkStartInUtf16(hunk, result)
    const source = hunk.diffs
      .filter(([operation]) => operation !== 1)
      .map(([, chunk]) => chunk)
      .join('')
    if (
      offset < 0 ||
      offset > result.length ||
      result.slice(offset, offset + source.length) !== source
    ) {
      return undefined
    }
    const replacement = hunk.diffs
      .filter(([operation]) => operation !== -1)
      .map(([, chunk]) => chunk)
      .join('')
    result =
      result.slice(0, offset) +
      replacement +
      result.slice(offset + source.length)
  }
  const [applied] = applyPatches(hunks, text)
  return applied === result ? result : undefined
}

function hunkStartInUtf16(hunk: TextPatch, text: string): number {
  // The converter scans forward from `start1`, so pass `start2` for both slots.
  return adjustIndiciesToUcs2([{...hunk, start1: hunk.start2}], text)[0]!.start2
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    )
  }
  if (isRecord(left) && isRecord(right)) {
    return (
      Object.keys(left).length === Object.keys(right).length &&
      Object.keys(left).every(
        (key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]),
      )
    )
  }
  return false
}

function validGesture(
  schema: Schema,
  base: unknown,
  patches: ReadonlyArray<Patch>,
  tokens: string,
  gesture: string,
): boolean {
  if (tokens === 'tB') {
    const edit = patches.find((patch) => patch.type === 'diffMatchPatch')
    const insert = patches.find((patch) => patch.type === 'insert')
    if (
      !edit ||
      insert?.type !== 'insert' ||
      insert.position !== 'after' ||
      !pathEquals(edit.path.slice(0, -3), insert.path)
    ) {
      return false
    }
    const before = getValue(base, edit.path)
    const after =
      typeof before === 'string'
        ? applyExactDiff(before, edit.value)
        : undefined
    const first = insert.items[0]
    if (
      typeof before !== 'string' ||
      after === undefined ||
      !isRecord(first) ||
      !Array.isArray(first['children'])
    ) {
      return false
    }
    if (before.startsWith(after) && before.length > after.length) {
      const span = first['children'][0]
      return isRecord(span) && span['text'] === before.slice(after.length)
    }
    return false
  }
  if (gesture !== 'block-join') {
    return true
  }
  const removed = patches
    .filter(
      (patch) =>
        patch.type === 'unset' && !isSpanArray(base, patch.path, schema),
    )
    .map((patch) => patch.path)
  const receiver = patches
    .map((patch) => enclosingBlockPath(base, patch.path, schema))
    .find((path) => path && !removed.some((other) => pathEquals(other, path)))
  if (!receiver) {
    return false
  }
  if (/^tX+tX$/.test(tokens)) {
    const siblings = getValue(base, receiver.slice(0, -1))
    if (!Array.isArray(siblings)) {
      return false
    }
    const segments = arraySegments(siblings)
    const receiverIndex = segments.findIndex((segment) =>
      pathEquals([segment], receiver.slice(-1)),
    )
    if (
      receiverIndex >= removed.length &&
      removed.every(
        (path) =>
          pathEquals(path.slice(0, -1), receiver.slice(0, -1)) &&
          segments
            .slice(receiverIndex - removed.length, receiverIndex)
            .some((segment) => pathEquals([segment], path.slice(-1))),
      )
    ) {
      return true
    }
  }
  const removedPaths = new Set(removed.map((path) => JSON.stringify(path)))
  let value = base
  for (const patch of patches) {
    if (
      patch.type === 'unset' &&
      removed.some((path) => pathEquals(path, patch.path))
    ) {
      const siblings = getValue(value, receiver.slice(0, -1))
      if (
        !Array.isArray(siblings) ||
        !pathEquals(receiver.slice(0, -1), patch.path.slice(0, -1))
      ) {
        return false
      }
      const segments = arraySegments(siblings)
      const receiverIndex = segments.findIndex((segment) =>
        pathEquals([segment], receiver.slice(-1)),
      )
      const removedIndex = segments.findIndex((segment) =>
        pathEquals([segment], patch.path.slice(-1)),
      )
      if (
        receiverIndex < 0 ||
        removedIndex <= receiverIndex ||
        !segments
          .slice(receiverIndex + 1, removedIndex)
          .every((segment) =>
            removedPaths.has(
              JSON.stringify([...receiver.slice(0, -1), segment]),
            ),
          )
      ) {
        return false
      }
    }
    value = applyAll(value, [patch])
  }
  return true
}

function keyOf(path: StepPath): string {
  const last = path.at(-1)
  return isKeyedSegment(last) ? last._key : ''
}

function enclosingBlockPath(
  value: unknown,
  path: Path,
  schema: Schema,
): Path | undefined {
  for (let length = path.length - 1; length > 0; length--) {
    const prefix = path.slice(0, length)
    if (
      isTextBlock(
        {schema: schemaAtPath(value, prefix, schema)},
        getValue(value, prefix),
      )
    ) {
      return prefix
    }
  }
  return undefined
}

function isSpanArray(value: unknown, path: Path, schema: Schema): boolean {
  return (
    path.at(-2) === 'children' &&
    isTextBlock(
      {schema: schemaAtPath(value, path.slice(0, -2), schema)},
      getValue(value, path.slice(0, -2)),
    )
  )
}

// A copy of the caret rule in `moveSelectionOutOfNode` (`packages/editor/src/engine/core/apply-operation.ts` on `next`) with `findNearestSpans`, `commonPath` and `isSiblingPath`, kept in sync by hand.
function nearestPoint(
  value: unknown,
  removedPath: StepPath,
  schema: Schema,
): Point | null {
  const {previous, next} = nearestSpans(value, removedPath, schema)
  const previousIsSibling =
    previous !== undefined &&
    previous.path.length === removedPath.length &&
    pathEquals(previous.path.slice(0, -1), removedPath.slice(0, -1))
  const preferNext =
    next !== undefined &&
    (previous === undefined ||
      (!previousIsSibling &&
        commonPathLength(previous.path, removedPath) <=
          commonPathLength(next.path, removedPath)))
  return preferNext && next
    ? {path: next.path, offset: 0}
    : previous
      ? {path: previous.path, offset: previous.text!.length}
      : null
}

function commonPathLength(left: StepPath, right: StepPath): number {
  let length = 0
  while (
    length < left.length &&
    length < right.length &&
    pathEquals([left[length]!], [right[length]!])
  ) {
    length++
  }
  return length
}

function freezeSteps(steps: ReadonlyArray<Step>): ReadonlyArray<Step> {
  const frozen = structuredClone(steps)
  freezeValue(frozen)
  return frozen
}

function freezeValue(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return
  }
  for (const child of Object.values(value)) {
    freezeValue(child)
  }
  Object.freeze(value)
}
