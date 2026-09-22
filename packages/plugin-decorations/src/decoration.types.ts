import type {Decoration, EditorSelection} from '@portabletext/editor'

/**
 * One layer's worth of events for one settled, normalized change: `on`
 * receives this array once per change, never mid-operation. A single
 * settled change can deliver more than one event for the same
 * decoration when local and remote operations mix in one burst, in
 * chronological order.
 * @beta
 */
export type DecorationEvent =
  | {
      type: 'moved'
      /** The decoration as registered. */
      decoration: Decoration
      previousRange: NonNullable<EditorSelection>
      newRange: NonNullable<EditorSelection>
      origin: 'local' | 'remote'
    }
  | {
      type: 'content-changed'
      decoration: Decoration
      /**
       * Current, edit-adjusted position: where to read the changed
       * content. `decoration.range` (the configured range) may be
       * stale.
       */
      range: NonNullable<EditorSelection>
      origin: 'local' | 'remote'
    }
  | {
      type: 'lost'
      decoration: Decoration
      previousRange: NonNullable<EditorSelection>
      origin: 'local' | 'remote'
    }

/**
 * One layer is one unit of z-order, lifecycle, and event delivery.
 * @beta
 */
export interface DecorationLayer {
  /** Full-set replacement, reconciled by `id`. */
  update(decorations: Array<Decoration>): void
  /** A no-op if already unregistered. */
  unregister(): void
  /**
   * Live decorations with edit-adjusted ranges. Lost and removed entries
   * are absent. Updates at the settled boundary (the same cadence as
   * `on`) and after `update()`; the reference is stable between changes,
   * so it is safe in a dependency array. An empty array after
   * `unregister()`.
   */
  readonly current: ReadonlyArray<{
    id: string
    range: NonNullable<EditorSelection>
  }>
}
