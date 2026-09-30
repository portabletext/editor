import {hasUsableKey, nodeSegment} from '../../paths/node-segment'
import {serializePath} from '../../paths/serialize-path'
import {getChildren} from '../../traversal/get-children'
import type {TraversalSnapshot} from '../../traversal/traversal-snapshot'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {DirtyPathEntry} from '../interfaces/dirty-path-entry'
import type {Editor, TouchedPaths} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path, PathSegment} from '../interfaces/path'
import {pathEquals} from '../path/path-equals'

export function buildTouchedPaths(
  editor: Editor,
  entries: ReadonlyArray<DirtyPathEntry>,
): TouchedPaths {
  const touched = createTouchedPaths()
  const childrenCache = new Map<string, Array<Node>>()
  const resolve = (path: Path) =>
    resolveTouchedPaths(editor.snapshot, path, childrenCache)

  for (const entry of entries) {
    if (entry.origin !== 'local') {
      continue
    }

    if (entry.kind === 'adjacency') {
      const nextPaths = resolve(entry.adjacency.next)

      for (const previousPath of resolve(entry.adjacency.previous)) {
        for (const nextPath of nextPaths) {
          touchRemovalBoundary(touched, previousPath, nextPath)
        }
      }

      continue
    }

    if (
      (entry.kind !== 'node' && entry.kind !== 'descendant') ||
      entry.path.length === 0
    ) {
      continue
    }

    for (const path of resolve(entry.path)) {
      touchPath(touched, path)
    }
  }

  return touched
}

export function isPairTouched(
  touched: TouchedPaths | undefined,
  previousPath: Path,
  path: Path,
): boolean {
  if (!touched) {
    return false
  }

  if (findNode(touched, previousPath)?.rightEdge) {
    return true
  }

  if (findNode(touched, path)?.touched) {
    return true
  }

  const previousSegment = previousPath.at(-1)
  const segment = path.at(-1)

  if (
    previousSegment === undefined ||
    segment === undefined ||
    !pathEquals(previousPath.slice(0, -1), path.slice(0, -1))
  ) {
    return false
  }

  return (
    findNode(touched, previousPath.slice(0, -1))?.boundaries?.get(
      segmentId(previousSegment),
    ) === segmentId(segment)
  )
}

export function inheritRightEdge(
  touched: TouchedPaths | undefined,
  previousPath: Path,
  absorbedPath: Path,
): void {
  if (!touched) {
    return
  }

  if (findNode(touched, absorbedPath)?.rightEdge) {
    getOrCreateNode(touched, previousPath).rightEdge = true
  } else {
    const previous = findNode(touched, previousPath)
    if (previous) {
      previous.rightEdge = false
    }
  }

  const previousSegment = previousPath.at(-1)
  const absorbedSegment = absorbedPath.at(-1)

  if (previousSegment === undefined || absorbedSegment === undefined) {
    return
  }

  const siblings = findNode(touched, previousPath.slice(0, -1))
  const absorbedBoundary = siblings?.boundaries?.get(segmentId(absorbedSegment))

  if (siblings && absorbedBoundary !== undefined) {
    getOrCreateBoundaries(siblings).set(
      segmentId(previousSegment),
      absorbedBoundary,
    )
  } else {
    siblings?.boundaries?.delete(segmentId(previousSegment))
  }
}

export function touchRemovalBoundary(
  touched: TouchedPaths | undefined,
  previousPath: Path,
  nextPath: Path,
): void {
  const previousSegment = previousPath.at(-1)
  const nextSegment = nextPath.at(-1)

  if (!touched || previousSegment === undefined || nextSegment === undefined) {
    return
  }

  getOrCreateBoundaries(
    getOrCreateNode(touched, previousPath.slice(0, -1)),
  ).set(segmentId(previousSegment), segmentId(nextSegment))
}

export function carryTouchThroughRekey(
  touched: TouchedPaths | undefined,
  siblingsPath: Path,
  rekeyed: {key: unknown; index: number},
  newKey: string,
): void {
  if (!touched) {
    return
  }

  const siblings = findNode(touched, siblingsPath)

  if (!siblings) {
    return
  }

  const fromId = segmentId(nodeSegment({_key: rekeyed.key}, rekeyed.index))
  const toId = segmentId({_key: newKey})
  const carried = siblings.children?.get(fromId)

  if (carried) {
    getOrCreateChildren(siblings).set(toId, cloneTouchedPaths(carried))
  }

  if (!siblings.boundaries) {
    return
  }

  for (const [previousId, nextId] of siblings.boundaries) {
    if (nextId === fromId) {
      siblings.boundaries.set(previousId, toId)
    }
  }

  const fromBoundary = siblings.boundaries.get(fromId)

  if (fromBoundary !== undefined) {
    siblings.boundaries.set(toId, fromBoundary)
  }
}

function resolveTouchedPaths(
  snapshot: TraversalSnapshot,
  path: Path,
  childrenCache: Map<string, Array<Node>>,
): Array<Path> {
  if (path.every(isResolvedSegment)) {
    return [path]
  }

  let resolvedPaths: Array<Path> = [[]]

  for (const segment of path) {
    if (isResolvedSegment(segment)) {
      resolvedPaths = resolvedPaths.map((resolvedPath) => [
        ...resolvedPath,
        segment,
      ])
      continue
    }

    const nextPaths: Array<Path> = []

    for (const parentPath of resolvedPaths) {
      const children = getCachedChildren(snapshot, parentPath, childrenCache)

      if (typeof segment === 'number') {
        const child = segment >= 0 ? children[segment] : undefined

        if (child) {
          nextPaths.push([...parentPath, nodeSegment(child, segment)])
        }

        continue
      }

      for (let index = 0; index < children.length; index++) {
        if (!hasUsableKey(children[index]!._key)) {
          nextPaths.push([...parentPath, index])
        }
      }
    }

    resolvedPaths = nextPaths
  }

  return resolvedPaths
}

function isResolvedSegment(segment: PathSegment): boolean {
  if (isKeyedSegment(segment)) {
    return hasUsableKey(segment._key)
  }

  return typeof segment !== 'number'
}

function getCachedChildren(
  snapshot: TraversalSnapshot,
  parentPath: Path,
  childrenCache: Map<string, Array<Node>>,
): Array<Node> {
  const id = serializePath(parentPath)
  let children = childrenCache.get(id)

  if (!children) {
    children = getChildren(snapshot, parentPath).map((entry) => entry.node)
    childrenCache.set(id, children)
  }

  return children
}

function createTouchedPaths(): TouchedPaths {
  return {touched: false, rightEdge: false}
}

function touchPath(touched: TouchedPaths, path: Path): void {
  const node = getOrCreateNode(touched, path)
  node.touched = true
  node.rightEdge = true
}

function segmentId(segment: PathSegment): string {
  if (isKeyedSegment(segment)) {
    return `[_key=="${segment._key}"]`
  }

  if (typeof segment === 'number') {
    return `[${segment}]`
  }

  if (typeof segment === 'string') {
    return `.${segment}`
  }

  return `[${segment.join(':')}]`
}

function findNode(touched: TouchedPaths, path: Path): TouchedPaths | undefined {
  let node: TouchedPaths | undefined = touched

  for (const segment of path) {
    node = node.children?.get(segmentId(segment))

    if (!node) {
      return undefined
    }
  }

  return node
}

function getOrCreateNode(touched: TouchedPaths, path: Path): TouchedPaths {
  let node = touched

  for (const segment of path) {
    const children = getOrCreateChildren(node)
    const id = segmentId(segment)
    let child = children.get(id)

    if (!child) {
      child = createTouchedPaths()
      children.set(id, child)
    }

    node = child
  }

  return node
}

function getOrCreateChildren(node: TouchedPaths): Map<string, TouchedPaths> {
  node.children ??= new Map()
  return node.children
}

function getOrCreateBoundaries(node: TouchedPaths): Map<string, string> {
  node.boundaries ??= new Map()
  return node.boundaries
}

function cloneTouchedPaths(node: TouchedPaths): TouchedPaths {
  return {
    touched: node.touched,
    rightEdge: node.rightEdge,
    children: node.children
      ? new Map(
          Array.from(node.children, ([id, child]) => [
            id,
            cloneTouchedPaths(child),
          ]),
        )
      : undefined,
    boundaries: node.boundaries ? new Map(node.boundaries) : undefined,
  }
}
