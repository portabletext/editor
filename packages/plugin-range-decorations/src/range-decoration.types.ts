import type {
  EditorSelection,
  RegistrableRangeDecoration,
} from '@portabletext/editor'

/**
 * One layer's worth of events for one settled, normalized change: `on`
 * receives this array once per change, never mid-operation.
 * @beta
 */
export type RangeDecorationEvent =
  | {
      type: 'moved'
      /** The decoration as registered. */
      rangeDecoration: RegistrableRangeDecoration
      previousRange: NonNullable<EditorSelection>
      newRange: NonNullable<EditorSelection>
      origin: 'local' | 'remote'
    }
  | {
      type: 'content-changed'
      rangeDecoration: RegistrableRangeDecoration
      /**
       * Current, edit-adjusted position: where to read the changed
       * content. `rangeDecoration.range` (the configured range) may be
       * stale.
       */
      range: NonNullable<EditorSelection>
      origin: 'local' | 'remote'
    }
  | {
      type: 'lost'
      rangeDecoration: RegistrableRangeDecoration
      previousRange: NonNullable<EditorSelection>
      origin: 'local' | 'remote'
    }

/**
 * One layer is one unit of z-order, lifecycle, and event delivery.
 * @beta
 */
export interface RangeDecorationLayer {
  /** Full-set replacement, reconciled by `id`. */
  update(rangeDecorations: Array<RegistrableRangeDecoration>): void
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
