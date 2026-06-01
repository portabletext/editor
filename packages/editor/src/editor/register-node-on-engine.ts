import {normalize} from '../engine/editor/normalize'
import type {RegistrableNode} from '../renderers/renderer.types'
import {buildPublicContainers} from '../schema/build-public-containers'
import {
  resolveNestedContainer,
  resolveTextBlockConfig,
} from '../schema/resolve-containers'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isTypeAlreadyRegistered} from './registration-helpers'

/**
 * Mutate the engine's registration maps for a single `RegistrableNode`.
 * Used by the editor machine's `register` action and by the drain step
 * for registrations that arrived before the engine was attached.
 *
 * For containers, force-normalizes the editor so existing nodes of the
 * registered `_type` pick up the container shape (e.g. `rows: []`).
 *
 * No-op when the type is already registered as an exclusive kind.
 */
export function registerNodeOnEngine(
  engine: PortableTextEditorEngine,
  node: RegistrableNode,
): void {
  if (node.kind === 'container') {
    if (isTypeAlreadyRegistered(engine, 'container', node.type)) {
      return
    }
    const containerConfig = resolveNestedContainer(engine.schema, node)
    if (!containerConfig) {
      // resolveNestedContainer has already warned with chain context.
      return
    }
    const containers = new Map(engine.containers)
    containers.set(node.type, containerConfig)
    engine.containers = containers
    engine.publicContainers = buildPublicContainers(containers)
    normalize(engine, {force: true})
    engine.onChange()
    return
  }
  if (node.kind === 'textBlock') {
    if (isTypeAlreadyRegistered(engine, 'textBlock', node.type)) {
      return
    }
    const textBlocks = new Map(engine.textBlocks)
    textBlocks.set(node.type, resolveTextBlockConfig(node))
    engine.textBlocks = textBlocks
    engine.onChange()
    return
  }
  if (node.kind === 'span') {
    if (isTypeAlreadyRegistered(engine, 'span', node.type)) {
      return
    }
    const spans = new Map(engine.spans)
    spans.set(node.type, {span: node})
    engine.spans = spans
    engine.onChange()
    return
  }
  if (node.kind === 'blockObject') {
    if (isTypeAlreadyRegistered(engine, 'blockObject', node.type)) {
      return
    }
    const blockObjects = new Map(engine.blockObjects)
    blockObjects.set(node.type, {blockObject: node})
    engine.blockObjects = blockObjects
    engine.onChange()
    return
  }
  // inlineObject
  if (isTypeAlreadyRegistered(engine, 'inlineObject', node.type)) {
    return
  }
  const inlineObjects = new Map(engine.inlineObjects)
  inlineObjects.set(node.type, {inlineObject: node})
  engine.inlineObjects = inlineObjects
  engine.onChange()
}

/**
 * Mutate the engine's registration maps to remove a registered node.
 * Reverse of {@link registerNodeOnEngine}; used by the editor machine's
 * `unregister` action.
 */
export function unregisterNodeOnEngine(
  engine: PortableTextEditorEngine,
  node: RegistrableNode,
): void {
  if (node.kind === 'container') {
    const containers = new Map(engine.containers)
    containers.delete(node.type)
    engine.containers = containers
    engine.publicContainers = buildPublicContainers(containers)
    normalize(engine, {force: true})
    engine.onChange()
    return
  }
  if (node.kind === 'textBlock') {
    const textBlocks = new Map(engine.textBlocks)
    textBlocks.delete(node.type)
    engine.textBlocks = textBlocks
    engine.onChange()
    return
  }
  if (node.kind === 'span') {
    const spans = new Map(engine.spans)
    spans.delete(node.type)
    engine.spans = spans
    engine.onChange()
    return
  }
  if (node.kind === 'blockObject') {
    const blockObjects = new Map(engine.blockObjects)
    blockObjects.delete(node.type)
    engine.blockObjects = blockObjects
    engine.onChange()
    return
  }
  // inlineObject
  const inlineObjects = new Map(engine.inlineObjects)
  inlineObjects.delete(node.type)
  engine.inlineObjects = inlineObjects
  engine.onChange()
}
