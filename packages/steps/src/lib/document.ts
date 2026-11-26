import {isSpan, isTextBlock, type Schema} from '@portabletext/schema'
import type {StepPath} from '../step-mapper'
import {arrayIndex, getArrayKeys, type ArrayKeyCache} from './array-index'
import {isRecord} from './is-record'
import {pathContains, pathEquals} from '@portabletext/traversal'
import {schemaForField} from './span'

export function arraySegments(
  value: ReadonlyArray<unknown>,
  cache?: ArrayKeyCache,
): StepPath {
  return getArrayKeys(value, cache ?? new WeakMap()).segments
}

export function walkNodes(
  value: unknown,
  path: StepPath = [],
  textSchema?: Schema,
  cache?: ArrayKeyCache,
): Array<{
  node: Record<string, unknown>
  path: StepPath
  text?: string
  inline?: boolean
}> {
  const nodes: Array<{
    node: Record<string, unknown>
    path: StepPath
    text?: string
    inline?: boolean
  }> = []
  const pending = [
    {value, path, schema: textSchema, textChildren: false, annotation: false},
  ]
  while (pending.length > 0) {
    const current = pending.pop()!
    if (Array.isArray(current.value)) {
      const segments = arraySegments(current.value, cache)
      for (let index = current.value.length - 1; index >= 0; index--) {
        pending.push({
          ...current,
          value: current.value[index],
          textChildren:
            current.textChildren && !Array.isArray(current.value[index]),
          path: [...current.path, segments[index]!],
        })
      }
    } else if (isRecord(current.value)) {
      nodes.push({
        node: current.value,
        path: current.path,
        inline:
          current.textChildren &&
          !current.annotation &&
          !!current.schema &&
          !isSpan({schema: current.schema}, current.value),
        ...(current.schema &&
        current.textChildren &&
        !current.annotation &&
        isSpan({schema: current.schema}, current.value)
          ? {text: current.value.text}
          : {}),
      })
      const entries = Object.entries(current.value)
      for (let index = entries.length - 1; index >= 0; index--) {
        const [field, child] = entries[index]!
        if (typeof child === 'object' && child !== null) {
          pending.push({
            value: child,
            path: [...current.path, field],
            schema: current.schema
              ? schemaForField(current.value, field, current.schema)
              : undefined,
            textChildren:
              field === 'children' &&
              !!current.schema &&
              isTextBlock({schema: current.schema}, current.value),
            annotation: current.annotation || field === 'markDefs',
          })
        }
      }
    }
  }
  return nodes
}

export type RangePoint = {
  path: StepPath
  offset: number
  length: number
  inline?: boolean
}

export function collectRangePoints(
  value: unknown,
  schema: Schema,
): Array<RangePoint> {
  return walkNodes(value, [], schema, new WeakMap()).flatMap(
    ({path, text, inline}) =>
      text !== undefined || inline
        ? [
            {
              path,
              offset: 0,
              length: text?.length ?? 0,
              ...(inline ? {inline: true} : {}),
            },
          ]
        : [],
  )
}

export function nearestSpans(value: unknown, path: StepPath, schema: Schema) {
  const cache: ArrayKeyCache = new WeakMap()
  const ancestors: Array<{
    context: WalkContext
    segments: StepPath
    index: number
  }> = []
  let context: WalkContext = {
    value,
    path: [],
    schema,
    textChildren: false,
    annotation: false,
  }
  for (const segment of path) {
    const segments = Array.isArray(context.value)
      ? arraySegments(context.value, cache)
      : isRecord(context.value)
        ? Object.keys(context.value)
        : []
    const index = Array.isArray(context.value)
      ? arrayIndex(context.value, segment, cache)
      : segments.indexOf(segment)
    if (index < 0) {
      return {
        previous: undefined,
        next: edgeSpan(
          {value, path: [], schema, textChildren: false, annotation: false},
          false,
          cache,
          path,
        ),
      }
    }
    ancestors.push({context, segments, index})
    context = childContext(context, segments[index]!, index)
  }
  if (!isRecord(context.value) || !pathEquals(context.path, path)) {
    return {
      previous: undefined,
      next: edgeSpan(
        {value, path: [], schema, textChildren: false, annotation: false},
        false,
        cache,
        path,
      ),
    }
  }
  let previous: SpanEntry | undefined
  let next: SpanEntry | undefined
  for (const ancestor of ancestors.reverse()) {
    for (let index = ancestor.index - 1; !previous && index >= 0; index--) {
      previous = edgeSpan(
        childContext(ancestor.context, ancestor.segments[index]!, index),
        true,
        cache,
      )
    }
    for (
      let index = ancestor.index + 1;
      !next && index < ancestor.segments.length;
      index++
    ) {
      next = edgeSpan(
        childContext(ancestor.context, ancestor.segments[index]!, index),
        false,
        cache,
      )
    }
    if (
      !previous &&
      ancestor.context.textChildren &&
      !ancestor.context.annotation &&
      isSpan({schema: ancestor.context.schema}, ancestor.context.value)
    ) {
      previous = {
        path: ancestor.context.path,
        text: ancestor.context.value.text,
      }
    }
    if (previous && next) {
      break
    }
  }
  return {previous, next}
}

type WalkContext = {
  value: unknown
  path: StepPath
  schema: Schema
  textChildren: boolean
  annotation: boolean
}
type SpanEntry = {path: StepPath; text: string}

function childContext(
  context: WalkContext,
  segment: StepPath[number],
  index: number,
): WalkContext {
  if (Array.isArray(context.value)) {
    const value = context.value[index]
    return {
      ...context,
      value,
      path: [...context.path, segment],
      textChildren: context.textChildren && !Array.isArray(value),
    }
  }
  const field = String(segment)
  const node = context.value
  if (!isRecord(node)) {
    return {...context, value: undefined}
  }
  const value = node[field]
  return {
    value: typeof value === 'object' && value !== null ? value : undefined,
    path: [...context.path, field],
    schema: schemaForField(node, field, context.schema),
    textChildren:
      field === 'children' && isTextBlock({schema: context.schema}, node),
    annotation: context.annotation || field === 'markDefs',
  }
}

function edgeSpan(
  context: WalkContext,
  reverse: boolean,
  cache: ArrayKeyCache,
  excludedPath?: StepPath,
): SpanEntry | undefined {
  if (excludedPath && pathContains(excludedPath, context.path)) {
    return undefined
  }
  if (!Array.isArray(context.value) && !isRecord(context.value)) {
    return undefined
  }
  const ownSpan =
    context.textChildren &&
    !context.annotation &&
    isSpan({schema: context.schema}, context.value)
      ? {path: context.path, text: context.value.text}
      : undefined
  if (!reverse && ownSpan) {
    return ownSpan
  }
  const segments = Array.isArray(context.value)
    ? arraySegments(context.value, cache)
    : Object.keys(context.value)
  for (let offset = 0; offset < segments.length; offset++) {
    const index = reverse ? segments.length - offset - 1 : offset
    const span = edgeSpan(
      childContext(context, segments[index]!, index),
      reverse,
      cache,
      excludedPath,
    )
    if (span) {
      return span
    }
  }
  return ownSpan
}
