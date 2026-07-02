import type {SyntheticBehaviorEvent} from '@portabletext/editor/behaviors'
import {expect, test} from 'vitest'
import {tableBehaviors} from '../plugin.table'

/**
 * How the plugin treats each synthetic event when the selection spans more
 * than one table cell:
 *
 * - `remap`: the event acts on the selection, so the plugin intercepts it
 *   and gives it rectangle semantics (fan out per member cell, or clear the
 *   rectangle).
 * - `pass`: the event is safe as-is, because it is path-addressed, keyed,
 *   pure caret motion, history, or a result notification.
 * - `pending`: the event acts on the selection but has no rectangle
 *   semantics yet.
 *
 * The `Record` is total over the event union on purpose: when the editor
 * adds a synthetic event, this file stops compiling until the new event is
 * classified.
 */
const treatments: Record<
  SyntheticBehaviorEvent['type'],
  'remap' | 'pass' | 'pending'
> = {
  'annotation.add': 'remap',
  'annotation.remove': 'remap',
  // Keyed to an existing annotation, not selection-scoped.
  'annotation.set': 'pass',
  'annotation.toggle': 'remap',
  'block.set': 'pass',
  'block.unset': 'pass',
  'child.set': 'pass',
  'child.unset': 'pass',
  'decorator.add': 'remap',
  'decorator.remove': 'remap',
  'decorator.toggle': 'remap',
  'delete': 'remap',
  // Expected to decompose through `delete`, which is remapped; pin with
  // tests before flipping to `pass`.
  'delete.backward': 'pending',
  'delete.block': 'pass',
  'delete.child': 'pass',
  'delete.forward': 'pending',
  'delete.text': 'pending',
  // Paste over a rectangle.
  'deserialize': 'pending',
  'deserialize.data': 'pending',
  // Applies through `insert.blocks`, which is classified separately.
  'deserialization.failure': 'pass',
  'deserialization.success': 'pass',
  'history.redo': 'pass',
  'history.undo': 'pass',
  'insert': 'pass',
  // Typing or inserting over a rectangle should replace the rectangle.
  'insert.block': 'pending',
  'insert.blocks': 'pending',
  'insert.break': 'pending',
  'insert.child': 'pending',
  'insert.inline object': 'pending',
  'insert.soft break': 'pending',
  'insert.span': 'pending',
  'insert.text': 'pending',
  'list item.add': 'remap',
  'list item.remove': 'remap',
  'list item.toggle': 'remap',
  'move.backward': 'pass',
  'move.forward': 'pass',
  'move.block': 'pass',
  // Moving "the selected block" is ambiguous for a rectangle; rows and
  // columns move through the plugin's own custom events instead.
  'move.block down': 'pending',
  'move.block up': 'pending',
  'remove.text': 'pass',
  'select': 'pass',
  'select.block': 'pass',
  'select.next block': 'pass',
  'select.previous block': 'pass',
  // Copy/cut should serialize the rectangle, not the linear fragment.
  'serialize': 'pending',
  'serialize.data': 'pending',
  'serialization.failure': 'pass',
  'serialization.success': 'pass',
  'set': 'pass',
  'split': 'remap',
  'style.add': 'remap',
  'style.remove': 'remap',
  'style.toggle': 'remap',
  'unset': 'pass',
}

test('every remapped event has an interceptor wired into tableBehaviors', () => {
  const wired = new Set(tableBehaviors.map((behavior) => behavior.on))
  const remapped = Object.entries(treatments)
    .filter(([, treatment]) => treatment === 'remap')
    .map(([eventType]) => eventType)

  for (const eventType of remapped) {
    expect(wired).toContain(eventType)
  }
})
