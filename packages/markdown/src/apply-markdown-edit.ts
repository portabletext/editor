import type {PortableTextBlock, Schema} from '@portabletext/schema'
import {cleanupEfficiency, makeDiff} from '@sanity/diff-match-patch'
import {defaultSchema} from './default-schema'
import {
  truncateSnippet,
  type SerializeDegradation,
  type SerializeDegradationContent,
} from './from-portable-text/degradation-report'
import {
  portableTextToMarkdown,
  portableTextToMarkdownWithLostContent,
} from './from-portable-text/portable-text-to-markdown'
import {defaultKeyGenerator} from './key-generator'
import {degradationMessage} from './to-portable-text/degradation-messages'
import {
  markdownToPortableText,
  type Degradation,
} from './to-portable-text/markdown-to-portable-text'

/**
 * @public
 */
export type ApplyMarkdownEditOptions = {
  /**
   * One compiled schema governing both conversion directions, the same
   * object the standalone converters accept. Taking it once is what
   * keeps the internal canonical dialect consistent: serializing and
   * reparsing under different schemas would change node counts or
   * types, refuse the origin trace, and reset keys document-wide.
   */
  schema?: Schema
  /**
   * Options for the markdown → Portable Text conversion of
   * `editedMarkdown` (matchers, `keyGenerator`). The same options
   * also govern the internal canonicalization of `storedPortableText`
   * used to align the two documents, except `onDegradation`, which is
   * scoped to `editedMarkdown` alone: `keyGenerator` supplies every
   * fresh key the function mints, both for new content and for the
   * sibling-uniqueness key-rename sweep.
   */
  deserialize?: Omit<
    NonNullable<Parameters<typeof markdownToPortableText>[1]>,
    'schema'
  >
  /**
   * Options for the Portable Text → markdown conversion. Pass the same
   * options that produced the markdown that was edited: key
   * resolution aligns the edit against a fresh canonical serialization
   * of `storedPortableText`, so the two serializations must agree for
   * that alignment to be meaningful. Excludes `onDegradation`: this
   * serialization only ever runs internally, to canonicalize
   * `storedPortableText` for alignment, never on `editedMarkdown` or its
   * result, so there is nothing here for a caller to observe losses in.
   */
  serialize?: Omit<
    NonNullable<Parameters<typeof portableTextToMarkdown>[1]>,
    'schema' | 'onDegradation'
  >
  /**
   * Reports how stored `_key`s were reconciled onto the converted
   * value. Reconciliation here is key restoration against the exact
   * snapshot that produced the markdown, never a merge of concurrent
   * edits: those are the caller's job (see the README's Concurrent
   * edits section). Called at most once, and exactly once whenever the
   * option is set and `applyMarkdownEdit` returns (a conversion that
   * throws never reports), synchronously, immediately before the
   * return, including when key matching is skipped outright: that is
   * when a caller needs the report most. A node absent from a performed report's
   * `preservedKeys` was not preserved from the stored value, whether
   * it is a fresh key or a `json:object` payload key that carried its
   * own; the report does not distinguish the two. Which keys
   * survived, every `key` and `path`, `renamedKeys`, and a skipped
   * report's `reason`, and a `round-trip-mismatch` report's
   * `mismatch.type` and `mismatch.storedPath` are facts of that
   * invocation, safe to branch on for that invocation, and so is
   * `hiddenLosses`: every entry names content that is missing from the
   * returned value although the markdown never showed it, and content
   * the edit's restoration put back is not listed. A stored block
   * whose `_key` is absent from the returned value has all of its
   * losses listed, whether the edit deleted it or rewrote it past
   * recognition: whether that removal was intended is the caller's
   * call. `serialize.onDegradation` stays excluded: `hiddenLosses` is
   * where serialize losses that matter to the returned value surface.
   * `markdownLosses` and `undeclaredObjects` are facts of the invocation
   * too.
   *
   * @beta
   */
  onReconciliation?: (report: ReconciliationReport) => void
}

/**
 * A path segment into the value `applyMarkdownEdit` returns (except in
 * a skipped report's `mismatch.storedPath`, which addresses the stored
 * value passed in instead, as every `hiddenLosses` entry's `path`
 * does): a string field name
 * for container nesting (`rows`, `cells`, `value`, and the like),
 * `{_key}` wherever the path lands on a keyed array element,
 * and a number wherever it lands on a keyless one instead. A block's
 * own path is a single `{_key}` segment, or a single number for a
 * keyless top-level block; a child's path is
 * `[{_key: <block key>}, 'children', {_key: <child key>}]`. A keyless
 * node (a `json:object` payload without a `_key` of its own, at the
 * top level or wrapping keyed content in a nested array) contributes
 * its index as a number segment instead of a `{_key}` segment.
 *
 * @beta
 */
export type ReconciliationKeyPath = Array<{_key: string} | string | number>

/**
 * What `applyMarkdownEdit` did with every key, delivered through
 * `onReconciliation`. `keyMatching: 'skipped'` means key matching gave
 * up on the whole document rather than at some local point: the
 * returned value is the plain markdown→Portable Text conversion, so
 * every key in it is fresh except a `json:object` payload key carried
 * through the markdown verbatim, and no preserved key or local key
 * fallback can have happened. `preservedKeys` and `renamedKeys` list
 * their entries in document order, each block before its children and
 * its mark definitions after them; `keyFallbacks` groups by kind
 * instead: `ambiguous-region-too-large` entries in the order their
 * gaps were resolved, then `annotation-key-conflict` entries. `basis`
 * names the matching method that preserved a key, not the edit's
 * semantics: a swap reports one block `content-moved` and its partner
 * `content-unchanged`. The report carries no edit intent: a deleted
 * stored node is not listed at all, so derive deletions as stored
 * keys minus the keys `applyMarkdownEdit` returned. Both variants carry
 * `hiddenLosses`: stored content the `serialize` options could not
 * express in markdown that is also missing from the returned value, so
 * whoever edited the markdown never saw it go. Both also carry
 * `markdownLosses`, what the edited markdown said that the returned
 * value does not hold, and `undeclaredObjects`, objects the edit added
 * whose type the schema does not declare. Undeclared objects are kept
 * as written, so they are not lost: they are content the schema does
 * not allow. Refuse or retry the write when any of the three lists is
 * non-empty and what it lists matters.
 *
 * @beta
 */
export type ReconciliationReport =
  | {
      keyMatching: 'performed'
      /**
       * One entry per node whose stored `_key` key resolution
       * preserved, at every depth (blocks, spans and other inline
       * children, and mark definitions). A node absent from this list
       * did not have its key preserved from the stored value: that
       * covers both a freshly generated key and a `json:object`
       * payload key carried through the markdown verbatim, which the
       * report does not distinguish. `basis` names the tier that
       * matched: `content-unchanged` for an exact content match (a
       * block-level anchor, a uniquely matched child, a preserved
       * empty-block run, or a mark definition uniquely matched by
       * content); `content-moved` for a unique leftover matched
       * across gaps; `content-split` for a fragment that kept its
       * source block's key; `content-merged` for a merge that kept
       * its first contributor's key; `same-position` for an
       * equal-count in-order pairing (also a same-content
       * mark-definition tie, or a single leftover mark definition
       * paired positionally); `similar-content` for a mutual-best
       * match under an unequal count.
       */
      preservedKeys: Array<{
        basis:
          | 'content-unchanged'
          | 'content-moved'
          | 'content-split'
          | 'content-merged'
          | 'same-position'
          | 'similar-content'
        key: string
        path: ReconciliationKeyPath
        /**
         * Whether the node wearing this key in the returned value
         * differs from its stored counterpart, field order aside but
         * array order significant. Any difference counts, including a
         * descendant key rewritten to keep siblings unique, or a key
         * filled in for a stored node that had none. `false`
         * guarantees the returned node deep-equals the stored one.
         * Unlike `basis`, this is a stable fact of the invocation,
         * safe to branch on.
         */
        valueChanged: boolean
      }>
      /**
       * One entry per local point where key resolution gave up rather
       * than adopt, while the rest of the document still resolves
       * keys: `ambiguous-region-too-large` when a gap's residual
       * similarity pairing crossed the evidence pair cap, listing the
       * affected result block keys that fell back to fresh;
       * `annotation-key-conflict` when an adopted mark definition key
       * would have collided with a sibling. The span-merge pair cap,
       * the per-diff similarity timeout, and the gap's earlier
       * concatenation-search cap degrade the same way but are not
       * reported: `ambiguous-region-too-large` covers the residual
       * similarity tier only (a gap that trips the concatenation cap
       * trips it too).
       */
      keyFallbacks: Array<
        | {type: 'ambiguous-region-too-large'; keys: Array<string>}
        | {type: 'annotation-key-conflict'; path: ReconciliationKeyPath}
      >
      /**
       * One entry per key `applyMarkdownEdit` rewrote to keep
       * siblings unique, most commonly a `json:object` payload
       * duplicating a key already present elsewhere in the document.
       */
      renamedKeys: Array<{
        previousKey: string
        key: string
        path: ReconciliationKeyPath
      }>
      /**
       * One entry per serialize degradation of the stored value (an
       * annotation, decorator, block style, or list-item kind the
       * `serialize` options have no renderer for, see
       * `SerializeDegradation`) whose content is missing from the
       * returned value: the markdown never showed it, so the edit could
       * not have removed it on purpose. A degradation the edit's
       * restoration repaired is not listed. In stored document order;
       * `path` addresses the stored value, like `SerializeDegradation`'s.
       * Each entry is checked against the returned node at the same key
       * path: the top-level block by `_key`, then down to the stored
       * text block that held the degraded node, located by identity
       * rather than by `path` (which can name a sibling reusing the
       * span's `_key`). Where a custom renderer rendered a copy of that
       * text block, the whole top-level block is searched instead. An
       * annotation counts as kept when that block's `markDefs` holds an
       * equal definition (`_key` aside) that one of its spans carries; a
       * decorator when one of its spans carries it; a style or list-item
       * kind when the block's own `style` or `listItem` matches. Only
       * `span` children count: an inline object's own `marks` field
       * carries nothing. A stored top-level block whose `_key` is absent
       * from the returned value has every one of its losses listed,
       * whether the edit deleted it or rewrote it so far that it came
       * back with a fresh key: the returned value does not carry its
       * content under that key, and whether the edit meant to remove it
       * is for the caller to decide. A nested node whose
       * own path no longer resolves inside a surviving top-level block
       * is listed: it came back with a fresh key, and fresh content
       * comes from the markdown alone, which never had it. A keyless
       * stored top-level block (a number as `path`'s first segment) has
       * no key to correspond by, so its entries are checked against the
       * whole returned value, as on a skipped report. A stored empty
       * text block restored next to its neighbor corresponds by its own
       * `_key`, whether or not `preservedKeys` lists it.
       */
      hiddenLosses: Array<SerializeDegradation>
      /**
       * One entry per deserialize degradation of `editedMarkdown`, the
       * same entries `deserialize.onDegradation` receives and in the
       * same encounter order, except `object-type-undeclared`: the
       * returned value differs from what the markdown said (a heading
       * level the schema has no style for, a dropped decorator, a
       * flattened table, fields dropped from a `json:object` carrier,
       * an invalid carrier, and the like). An undeclared object is
       * kept as written, so it is listed in `undeclaredObjects` instead
       * when the edit introduced it. Only the parse of `editedMarkdown`
       * counts, never the internal canonicalization of the stored value.
       */
      markdownLosses: Array<Degradation>
      /**
       * One entry per object in the returned value whose type the
       * `schema` does not declare and that the stored value did not
       * already hold, in document order. Declared objects' array fields
       * are searched too, so an undeclared object inside a table cell
       * or another declared container is listed, while an object-typed
       * field, and an array field with no `of` to check its items
       * against, are not searched. An object counts as already held when
       * the stored value has one with the same `_type` and `_key`, at
       * the same position (`block` or `inline`), in the same array: for
       * an inline object that is the Portable Text array holding its
       * block, whatever the block's own key, since editing a paragraph
       * can give its block a fresh key. `path` addresses the returned
       * value.
       */
      undeclaredObjects: Array<UndeclaredObject>
    }
  | {
      keyMatching: 'skipped'
      /**
       * The stored value's own serialize→parse round trip changed its
       * node count, type sequence, or per-position text. A fact of
       * that invocation, safe to branch on.
       */
      reason: 'round-trip-mismatch'
      /**
       * Where and why the round trip first went wrong. The scan walks
       * the stored blocks in document order, skipping empty paragraphs
       * and comparing text without leading and trailing whitespace, and
       * stops at the first block whose type or text came back
       * different.
       */
      mismatch: {
        /**
         * `type-changed` when the first failing block came back as
         * another type, `text-changed` when it kept its type but its
         * text came back different (a custom renderer writing syntax
         * the parser reads back as other text, say). Both apply even
         * when the round trip also changed the block count.
         * `block-count-changed` when every compared block came back
         * intact but the round trip dropped or added blocks, or when
         * every stored block is an empty paragraph. A fact of that
         * invocation, safe to branch on. Match on `type`, not
         * `message`.
         */
        type: 'type-changed' | 'text-changed' | 'block-count-changed'
        /**
         * Unlike every other path in the report but `hiddenLosses`',
         * this one addresses the stored value as passed, not the
         * returned value: a
         * `{_key}` segment for a keyed node, its index for a keyless
         * one, empty paragraphs counted. For `text-changed` it reaches
         * the child (span or inline object) where the text first
         * differs, `[{_key: 'b2'}, 'children', {_key: 'w1'}]`, or stays
         * on the block when the stored text is a prefix of what came
         * back. Otherwise it names a block: the failing block for
         * `type-changed`, and for `block-count-changed` the first stored
         * block with no counterpart when blocks were dropped, the last
         * compared stored block when blocks were added, or the last
         * stored block when every stored block is an empty paragraph.
         * A fact of that invocation, safe to branch on.
         */
        storedPath: ReconciliationKeyPath
        /**
         * Human-readable, naming where the round trip first went
         * wrong. May change between releases.
         */
        message: string
        /**
         * The span text that came back, inline objects skipped,
         * truncated to 40 characters with an ellipsis: for
         * `text-changed`, starting where it first differs, otherwise
         * the round-tripped block's text (the first added block when
         * blocks were added). Absent when there is no span text to
         * quote, such as a block object, dropped blocks, or text that
         * went missing.
         */
        snippet?: string
      }
      /**
       * One entry per key `applyMarkdownEdit` rewrote to keep
       * siblings unique, most commonly a `json:object` payload
       * duplicating a key already present elsewhere in the document.
       * The sibling-uniqueness pass still runs on a skipped document:
       * a pasted duplicate `json:object` fence key still gets
       * renamed even though nothing else adopted.
       */
      renamedKeys: Array<{
        previousKey: string
        key: string
        path: ReconciliationKeyPath
      }>
      /**
       * One entry per serialize degradation of the stored value (an
       * annotation, decorator, block style, or list-item kind the
       * `serialize` options have no renderer for, see
       * `SerializeDegradation`) whose content is missing from the
       * returned value: the markdown never showed it, so the edit could
       * not have removed it on purpose. A degradation the edit's
       * restoration repaired is not listed. In stored document order;
       * `path` addresses the stored value, like `SerializeDegradation`'s.
       * Key matching was skipped, so nothing corresponds by key and
       * nothing was restored: an entry is listed when no text block
       * anywhere in the returned value carries its content (an equal
       * annotation definition, `_key` aside, carried by a span of the
       * same block; the decorator on some span; the style or list-item
       * kind on some block). Content found elsewhere in the document
       * masks a loss, so on a skipped report an empty list is weaker
       * than on a performed one.
       */
      hiddenLosses: Array<SerializeDegradation>
      /**
       * One entry per deserialize degradation of `editedMarkdown`, the
       * same entries `deserialize.onDegradation` receives and in the
       * same encounter order, except `object-type-undeclared`: the
       * returned value differs from what the markdown said (a heading
       * level the schema has no style for, a dropped decorator, a
       * flattened table, fields dropped from a `json:object` carrier,
       * an invalid carrier, and the like). An undeclared object is
       * kept as written, so it is listed in `undeclaredObjects` instead
       * when the edit introduced it. Only the parse of `editedMarkdown`
       * counts, never the internal canonicalization of the stored value.
       */
      markdownLosses: Array<Degradation>
      /**
       * One entry per object in the returned value whose type the
       * `schema` does not declare and that the stored value did not
       * already hold, in document order. Declared objects' array fields
       * are searched too, so an undeclared object inside a table cell
       * or another declared container is listed, while an object-typed
       * field, and an array field with no `of` to check its items
       * against, are not searched. An object counts as already held when
       * the stored value has one with the same `_type` and `_key`, at
       * the same position (`block` or `inline`), in the same array: for
       * an inline object that is the Portable Text array holding its
       * block, whatever the block's own key, since editing a paragraph
       * can give its block a fresh key. `path` addresses the returned
       * value.
       */
      undeclaredObjects: Array<UndeclaredObject>
    }
  | {
      keyMatching: 'skipped'
      /**
       * The document holds more distinct block forms than alignment
       * can token. A fact of that invocation, safe to branch on.
       */
      reason: 'document-too-large'
      /**
       * One entry per key `applyMarkdownEdit` rewrote to keep
       * siblings unique, most commonly a `json:object` payload
       * duplicating a key already present elsewhere in the document.
       * The sibling-uniqueness pass still runs on a skipped document:
       * a pasted duplicate `json:object` fence key still gets
       * renamed even though nothing else adopted.
       */
      renamedKeys: Array<{
        previousKey: string
        key: string
        path: ReconciliationKeyPath
      }>
      /**
       * One entry per serialize degradation of the stored value (an
       * annotation, decorator, block style, or list-item kind the
       * `serialize` options have no renderer for, see
       * `SerializeDegradation`) whose content is missing from the
       * returned value: the markdown never showed it, so the edit could
       * not have removed it on purpose. A degradation the edit's
       * restoration repaired is not listed. In stored document order;
       * `path` addresses the stored value, like `SerializeDegradation`'s.
       * Key matching was skipped, so nothing corresponds by key and
       * nothing was restored: an entry is listed when no text block
       * anywhere in the returned value carries its content (an equal
       * annotation definition, `_key` aside, carried by a span of the
       * same block; the decorator on some span; the style or list-item
       * kind on some block). Content found elsewhere in the document
       * masks a loss, so on a skipped report an empty list is weaker
       * than on a performed one.
       */
      hiddenLosses: Array<SerializeDegradation>
      /**
       * One entry per deserialize degradation of `editedMarkdown`, the
       * same entries `deserialize.onDegradation` receives and in the
       * same encounter order, except `object-type-undeclared`: the
       * returned value differs from what the markdown said (a heading
       * level the schema has no style for, a dropped decorator, a
       * flattened table, fields dropped from a `json:object` carrier,
       * an invalid carrier, and the like). An undeclared object is
       * kept as written, so it is listed in `undeclaredObjects` instead
       * when the edit introduced it. Only the parse of `editedMarkdown`
       * counts, never the internal canonicalization of the stored value.
       */
      markdownLosses: Array<Degradation>
      /**
       * One entry per object in the returned value whose type the
       * `schema` does not declare and that the stored value did not
       * already hold, in document order. Declared objects' array fields
       * are searched too, so an undeclared object inside a table cell
       * or another declared container is listed, while an object-typed
       * field, and an array field with no `of` to check its items
       * against, are not searched. An object counts as already held when
       * the stored value has one with the same `_type` and `_key`, at
       * the same position (`block` or `inline`), in the same array: for
       * an inline object that is the Portable Text array holding its
       * block, whatever the block's own key, since editing a paragraph
       * can give its block a fresh key. `path` addresses the returned
       * value.
       */
      undeclaredObjects: Array<UndeclaredObject>
    }

/**
 * An object of a type the `schema` does not declare, in a
 * `ReconciliationReport`'s `undeclaredObjects`. `position` is `inline`
 * for a text block's child and `block` otherwise, including inside a
 * declared container's array field. `path` addresses the returned
 * value, like every `ReconciliationKeyPath` in the report: `[{_key}]`
 * for a top-level block object, `[{_key: <block key>}, 'children',
 * {_key: <child key>}]` for an inline object. `_key` is absent when the
 * object has none. `message` is the same text as the
 * `object-type-undeclared` degradation for the object, for display: it
 * can change between releases, so do not match on it.
 *
 * @beta
 */
export type UndeclaredObject = {
  _type: string
  _key?: string
  position: 'block' | 'inline'
  path: ReconciliationKeyPath
  message: string
}

/**
 * Deliberately high pending calibration against real agent edit
 * traces: a wrong match moves anchors onto unrelated text, a fresh
 * key resets one block.
 */
const MIN_BLOCK_SIMILARITY = 0.8

/**
 * Caps for the split, merge, and similarity tiers: above this many
 * pairs, or past this per-diff time, evidence gathering stops and the
 * affected blocks get new keys, the safe failure mode. Without the
 * caps a single large unequal gap of long unique texts is quadratic in
 * both concatenation search and similarity scoring, and runs for tens
 * of seconds.
 */
const MAX_SIMILARITY_PAIRS = 2500
const SIMILARITY_DIFF_TIMEOUT_SECONDS = 0.05

/**
 * Bounded attempts at a caller-supplied `keyGenerator` before falling
 * back to deterministic suffixing: a generator that always returns
 * the same value (a constant stub, a buggy sequence) would otherwise
 * spin the collision loop forever.
 */
const MAX_KEY_GENERATOR_ATTEMPTS = 3

/**
 * One block, one UTF-16 code unit: past this many distinct block
 * forms the token alphabet would wrap into collisions and surrogate
 * territory, so alignment gives up and every key stays fresh.
 */
const MAX_DISTINCT_BLOCK_FORMS = 55_000

/**
 * Converts edited markdown to Portable Text, restores stored keys, and
 * restores fields the markdown dialect cannot express (dropped by
 * serialization, so the edit could not have touched them); a field
 * markdown does express follows the edit. The same rule covers a
 * custom style or decorator markdown has no syntax for, coerced to a
 * built-in on the round trip. An empty or whitespace-only text block
 * is the same case taken to the whole block: markdown has no form for
 * either, so it is restored next to its surviving neighbor and
 * dropped along with that neighbor if the neighbor does not survive.
 * Keys aim for what the
 * same edit would have produced in an editor:
 * unchanged, moved, and rewritten-in-place content keeps its keys
 * (rewriting a paragraph in place keeps its identity, like typing over
 * it), a split keeps the key on its first non-empty fragment, a merge
 * keeps the first source block's key, and a `json:object` payload keeps
 * the key it carries, unless reconciliation matches it to stored
 * content, which takes the stored key even over a differing key in the
 * payload. When an insertion or deletion makes positions ambiguous,
 * only clear similarity evidence adopts a key and everything else gets
 * a new one; gathering that evidence is time-capped, so on very large
 * ambiguous edits the set of adopted keys can differ across machine
 * speeds, degrading toward fresh keys.
 * Output keys are unique among siblings. The function does not mutate
 * `storedPortableText` and returns a value, not patches. The `schema`
 * is taken once and governs both directions; pass the same `serialize`
 * options that produced the markdown that was edited. A throwing or
 * stateful custom matcher or renderer propagates or degrades matching
 * respectively.
 * Reconciliation never merges concurrent edits: compare the stored
 * field against the live document before writing the result back.
 * The trades in one line: same-position replacement inherits identity,
 * a count-preserving rewrite pairs positionally (block-level and
 * sibling-level alike), and evidence gathering is capped, degrading to
 * fresh keys.
 *
 * @public
 */
export function applyMarkdownEdit(
  storedPortableText: ReadonlyArray<PortableTextBlock>,
  editedMarkdown: string,
  options?: ApplyMarkdownEditOptions,
): Array<PortableTextBlock> {
  const onReconciliation = options?.onReconciliation
  const recorder: ReconciliationRecorder | undefined = onReconciliation
    ? {
        preservation: new WeakMap(),
        renamePreviousKey: new WeakMap(),
        annotationKeyConflicts: [],
        ambiguousRegionGroups: [],
        skip: undefined,
      }
    : undefined
  const markdownLosses: Array<Degradation> = []
  const callerOnDegradation = options?.deserialize?.onDegradation
  const result = structuredClone(
    markdownToPortableText(editedMarkdown, {
      ...options?.deserialize,
      schema: options?.schema,
      onDegradation: (report) => {
        markdownLosses.push(
          ...report.degradations.filter(
            // The deserializer keeps an undeclared object as written, so
            // it is no loss of what the markdown said:
            // `undeclaredObjects` reports the ones the edit introduces.
            (degradation) => degradation.type !== 'object-type-undeclared',
          ),
        )
        callerOnDegradation?.(report)
      },
    }),
  ) as unknown as Array<Node>
  const {canonical, degradations} = canonicalizeStored(
    storedPortableText,
    options,
  )
  const nonEmptyStored = nonEmptyBlocks(storedPortableText, options)
  const originOf = traceOrigins(
    storedPortableText,
    nonEmptyStored,
    canonical,
    recorder,
  )
  const adoptedNodes: AdoptedNodes = new WeakSet()
  if (originOf) {
    const alignment = alignBlocks(canonical, result, recorder)
    if (alignment) {
      adoptAnchors(alignment.anchors, originOf, result, adoptedNodes, recorder)
      const gaps = adoptMoves(
        alignment.gaps,
        canonical,
        result,
        originOf,
        adoptedNodes,
        recorder,
      )
      for (const gap of gaps) {
        resolveGap(
          gap.storedIndexes,
          gap.editedIndexes,
          canonical,
          result,
          originOf,
          adoptedNodes,
          recorder,
        )
      }
      // Inside the successful trace only: a document-wide skip of key
      // matching means nothing adopts, and a reinserted empty block
      // would adopt its stored key past that skip, since its anchor
      // can still be found whenever a `json:object` payload carries
      // the neighboring key through the markdown verbatim.
      reinsertEmptyRuns(
        storedPortableText,
        result,
        adoptedNodes,
        options,
        recorder,
      )
    }
  }
  enforceSiblingKeyUniqueness(
    result,
    options?.deserialize?.keyGenerator ?? defaultKeyGenerator,
    adoptedNodes,
    recorder,
  )
  if (recorder && onReconciliation) {
    onReconciliation(
      buildReconciliationReport(result, recorder, {
        hiddenLosses: findHiddenLosses(
          degradations,
          result,
          recorder.skip ? 'skipped' : 'performed',
        ),
        markdownLosses,
        undeclaredObjects: findIntroducedUndeclaredObjects(
          storedPortableText,
          result,
          options?.schema ?? defaultSchema,
        ),
      }),
    )
  }
  return result as unknown as Array<PortableTextBlock>
}

type Node = Record<string, unknown>

/**
 * Adoption targets, so the deduplication pass can tell an adopted
 * (authoritative) key from a verbatim payload duplicate.
 */
type AdoptedNodes = WeakSet<object>

type PreservationBasis = Extract<
  ReconciliationReport,
  {keyMatching: 'performed'}
>['preservedKeys'][number]['basis']

/**
 * Accumulates key resolution decisions against node identity as the
 * passes make them; keys and paths are only meaningful once the
 * sibling-uniqueness pass has settled every `_key`, so materializing
 * the public report happens afterward, in `buildReconciliationReport`.
 * `undefined` when the caller passed no `onReconciliation`, so every
 * call site can skip its recording work with a plain optional-chain.
 */
type ReconciliationRecorder = {
  preservation: WeakMap<
    Node,
    {basis: PreservationBasis; storedCounterpart: Node}
  >
  renamePreviousKey: WeakMap<Node, string>
  annotationKeyConflicts: Array<Node>
  ambiguousRegionGroups: Array<Array<Node>>
  skip:
    | {reason: 'round-trip-mismatch'; mismatch: RoundTripMismatch}
    | {reason: 'document-too-large'}
    | undefined
}

type RoundTripMismatch = Extract<
  ReconciliationReport,
  {reason: 'round-trip-mismatch'}
>['mismatch']

/**
 * Re-expresses the stored value in the parser's dialect by serializing
 * it and parsing it right back: the parser merges same-mark sibling
 * spans, reorders marks, collapses list levels, and fills defaults, so
 * content the edit never touched only deep-equals its parsed
 * counterpart after both sides have been through the same round trip.
 * The replacement keys are positional (`__canonical_<n>`), so a match
 * against canonical node `n` can be traded back for stored node `n`'s
 * real `_key`.
 */
function canonicalizeStored(
  stored: ReadonlyArray<PortableTextBlock>,
  options: ApplyMarkdownEditOptions | undefined,
): {canonical: Array<Node>; degradations: Array<LostContentDegradation>} {
  const storedClone = structuredClone(stored) as Array<PortableTextBlock>
  const {markdown: storedMarkdown, degradations} =
    portableTextToMarkdownWithLostContent(storedClone, {
      ...stripOnDegradation(options?.serialize),
      schema: options?.schema,
    })
  const {onDegradation, ...canonicalDeserializeOptions} =
    options?.deserialize ?? {}
  let canonicalKeyCounter = 0
  const canonical = markdownToPortableText(storedMarkdown, {
    ...canonicalDeserializeOptions,
    schema: options?.schema,
    keyGenerator: () => `__canonical_${canonicalKeyCounter++}`,
  }) as unknown as Array<Node>
  return {canonical, degradations}
}

type LostContentDegradation = SerializeDegradation & SerializeDegradationContent

function stripOnDegradation<T extends object>(
  value: T | undefined,
): Omit<T, 'onDegradation'> {
  const {onDegradation: _onDegradation, ...rest} = (value ?? {}) as T & {
    onDegradation?: unknown
  }
  return rest
}

/**
 * Positional pairing between `stored` and `canonical` is only
 * trustworthy when serialization preserved the node count and the
 * type sequence; when it did not (heading hard-break splits, lossy
 * table normalization), no key can be traced back to its owner, so
 * nothing adopts. `stored` is already the non-empty subsequence: empty
 * text blocks have no markdown form, so `canonical` never carries them
 * either, and `reinsertEmptyRuns` restores them afterward.
 */
function traceOrigins(
  storedPortableText: ReadonlyArray<PortableTextBlock>,
  stored: ReadonlyArray<PortableTextBlock>,
  canonical: ReadonlyArray<Node>,
  recorder: ReconciliationRecorder | undefined,
): ((canonicalIndex: number) => Node) | undefined {
  if (canonical.length !== stored.length) {
    recordRoundTripMismatch(storedPortableText, stored, canonical, recorder)
    return undefined
  }
  for (let index = 0; index < stored.length; index++) {
    if ((stored[index] as Node)['_type'] !== canonical[index]?.['_type']) {
      recordRoundTripMismatch(storedPortableText, stored, canonical, recorder)
      return undefined
    }
  }
  for (let index = 0; index < stored.length; index++) {
    if (
      !textSurvivesRoundTrip(
        stored[index] as unknown as Node,
        canonical[index]!,
      )
    ) {
      recordRoundTripMismatch(storedPortableText, stored, canonical, recorder)
      return undefined
    }
  }
  return (canonicalIndex: number): Node =>
    stored[canonicalIndex] as unknown as Node
}

function textSurvivesRoundTrip(storedNode: Node, canonicalNode: Node): boolean {
  if (!(isTextBlock(storedNode) && isTextBlock(canonicalNode))) {
    return true
  }
  // CommonMark trims whitespace on reparse, so text identity compares
  // trimmed text.
  return blockText(storedNode).trim() === blockText(canonicalNode).trim()
}

function recordRoundTripMismatch(
  storedPortableText: ReadonlyArray<PortableTextBlock>,
  stored: ReadonlyArray<PortableTextBlock>,
  canonical: ReadonlyArray<Node>,
  recorder: ReconciliationRecorder | undefined,
): void {
  if (!recorder) {
    return
  }
  const commonLength = Math.min(stored.length, canonical.length)
  let failingIndex = 0
  while (
    failingIndex < commonLength &&
    (stored[failingIndex] as Node)['_type'] ===
      canonical[failingIndex]!['_type'] &&
    textSurvivesRoundTrip(
      stored[failingIndex] as unknown as Node,
      canonical[failingIndex]!,
    )
  ) {
    failingIndex++
  }
  const storedIndexes: Array<number> = []
  storedPortableText.forEach((node, index) => {
    if (node === stored[storedIndexes.length]) {
      storedIndexes.push(index)
    }
  })
  const blockSegmentAt = (
    nonEmptyIndex: number,
  ): ReconciliationKeyPath[number] => {
    const storedIndex =
      stored.length === 0
        ? storedPortableText.length - 1
        : storedIndexes[nonEmptyIndex]!
    return pathSegment(
      storedPortableText[storedIndex] as unknown as Node,
      storedIndex,
    )
  }
  recorder.skip = {
    reason: 'round-trip-mismatch',
    mismatch:
      failingIndex < commonLength
        ? positionMismatch(
            stored[failingIndex] as unknown as Node,
            canonical[failingIndex]!,
            blockSegmentAt(failingIndex),
          )
        : blockCountMismatch(stored, canonical, blockSegmentAt),
  }
}

function positionMismatch(
  storedNode: Node,
  canonicalNode: Node,
  blockSegment: ReconciliationKeyPath[number],
): RoundTripMismatch {
  const storedType = String(storedNode['_type'])
  const canonicalType = String(canonicalNode['_type'])
  if (storedType !== canonicalType) {
    return withSnippet(
      {
        type: 'type-changed',
        storedPath: [blockSegment],
        message: `${describeBlock(storedType)} came back as ${withArticle(`\`${canonicalType}\``, canonicalType)}`,
      },
      roundTrippedSnippet(canonicalNode),
    )
  }
  const storedText = blockText(storedNode)
  const storedTrimmed = storedText.trim()
  const canonicalText = blockText(canonicalNode)
  const canonicalTrimmed = canonicalText.trim()
  const sharedLength = Math.min(storedTrimmed.length, canonicalTrimmed.length)
  let differsAt = 0
  while (
    differsAt < sharedLength &&
    storedTrimmed[differsAt] === canonicalTrimmed[differsAt]
  ) {
    differsAt++
  }
  if (
    splitsSurrogatePair(storedTrimmed, differsAt) ||
    splitsSurrogatePair(canonicalTrimmed, differsAt)
  ) {
    differsAt--
  }
  const child =
    differsAt < storedTrimmed.length
      ? childAtOffset(storedNode, leadingWhitespace(storedText) + differsAt)
      : undefined
  return withSnippet(
    {
      type: 'text-changed',
      storedPath: child
        ? [blockSegment, 'children', pathSegment(child.node, child.index)]
        : [blockSegment],
      message: child
        ? `The block's text came back different, starting at ${describeChildFrom(child)}`
        : "The block's text came back with more text at the end",
    },
    truncateSnippet(
      spanTextFrom(
        canonicalNode,
        leadingWhitespace(canonicalText) + differsAt,
      ).trim(),
    ),
  )
}

function blockCountMismatch(
  stored: ReadonlyArray<PortableTextBlock>,
  canonical: ReadonlyArray<Node>,
  blockSegmentAt: (nonEmptyIndex: number) => ReconciliationKeyPath[number],
): RoundTripMismatch {
  if (stored.length === 0) {
    return withSnippet(
      {
        type: 'block-count-changed',
        storedPath: [blockSegmentAt(0)],
        message: `The empty paragraphs came back as ${blockCount(canonical.length)}`,
      },
      roundTrippedSnippet(canonical[0]!),
    )
  }
  if (stored.length > canonical.length) {
    const firstDropped = stored[canonical.length] as unknown as Node
    return {
      type: 'block-count-changed',
      storedPath: [blockSegmentAt(canonical.length)],
      message: `${blockCount(stored.length - canonical.length)} did not come back, starting with ${lowercaseFirst(describeBlock(String(firstDropped['_type'])))}`,
    }
  }
  const lastStored = stored[stored.length - 1] as unknown as Node
  return withSnippet(
    {
      type: 'block-count-changed',
      storedPath: [blockSegmentAt(stored.length - 1)],
      message: `The round trip added ${blockCount(canonical.length - stored.length)} after ${lowercaseFirst(describeBlock(String(lastStored['_type'])))}`,
    },
    roundTrippedSnippet(canonical[stored.length]!),
  )
}

function childAtOffset(
  block: Node,
  offset: number,
): {node: Node; index: number; offset: number} | undefined {
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return undefined
  }
  let start = 0
  for (let index = 0; index < children.length; index++) {
    const end = start + childText(children[index]!).length
    if (offset < end) {
      return {node: children[index]!, index, offset: offset - start}
    }
    start = end
  }
  return undefined
}

function describeChildFrom(child: {node: Node; offset: number}): string {
  const text = child.node['text']
  return typeof text === 'string'
    ? `the text \`${truncateSnippet(text.slice(child.offset))}\``
    : `the \`${String(child.node['_type'])}\` inline object`
}

function spanTextFrom(block: Node, offset: number): string {
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return ''
  }
  let start = 0
  let text = ''
  for (const child of children) {
    const childLength = childText(child).length
    if (typeof child['text'] === 'string' && start + childLength > offset) {
      text += child['text'].slice(Math.max(0, offset - start))
    }
    start += childLength
  }
  return text
}

function leadingWhitespace(text: string): number {
  return text.length - text.trimStart().length
}

function splitsSurrogatePair(text: string, offset: number): boolean {
  return (
    offset > 0 &&
    isHighSurrogate(text.charCodeAt(offset - 1)) &&
    isLowSurrogate(text.charCodeAt(offset))
  )
}

function isHighSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff
}

function isLowSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff
}

function pathSegment(node: Node, index: number): ReconciliationKeyPath[number] {
  const key = node['_key']
  return typeof key === 'string' ? {_key: key} : index
}

function roundTrippedSnippet(canonicalNode: Node): string | undefined {
  return isTextBlock(canonicalNode)
    ? truncateSnippet(spanTextFrom(canonicalNode, 0).trim())
    : undefined
}

function withSnippet(
  mismatch: RoundTripMismatch,
  snippet: string | undefined,
): RoundTripMismatch {
  return snippet === undefined ? mismatch : {...mismatch, snippet}
}

function describeBlock(type: string): string {
  return type === 'block' ? 'The text block' : `The \`${type}\` block`
}

function lowercaseFirst(text: string): string {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

function withArticle(phrase: string, word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${phrase}`
}

function blockCount(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`
}

type Anchor = {canonicalIndex: number; resultIndex: number}
type Gap = {storedIndexes: Array<number>; editedIndexes: Array<number>}

/**
 * Equal runs become anchor pairs (so repeated content pairs
 * first-to-first when adopted), and the delete/insert runs between
 * them form the gaps.
 */
function alignBlocks(
  canonical: ReadonlyArray<Node>,
  result: ReadonlyArray<Node>,
  recorder: ReconciliationRecorder | undefined,
): {anchors: Array<Anchor>; gaps: Array<Gap>} | undefined {
  const tokenByNeutral = new Map<string, string>()
  const tokenOf = (node: Node): string => {
    const neutral = neutralForm(node)
    let token = tokenByNeutral.get(neutral)
    if (token === undefined) {
      token = String.fromCharCode(tokenByNeutral.size + 1)
      tokenByNeutral.set(neutral, token)
    }
    return token
  }
  const canonicalTokens = canonical.map(tokenOf).join('')
  const resultTokens = result.map(tokenOf).join('')
  if (tokenByNeutral.size > MAX_DISTINCT_BLOCK_FORMS) {
    if (recorder) {
      recorder.skip = {reason: 'document-too-large'}
    }
    return undefined
  }
  // The tenth distinct block form draws `'\n'` as its token, and past
  // 100 tokens per side `makeDiff`'s line-mode heuristic would split on
  // it, making alignment shape depend on which block form drew that
  // character. Blocks are already atomic, so line mode adds nothing.
  const diffs = makeDiff(canonicalTokens, resultTokens, {checkLines: false})

  const anchors: Array<Anchor> = []
  const gaps: Array<Gap> = []
  let gap: Gap = {storedIndexes: [], editedIndexes: []}
  const flushGap = () => {
    if (gap.storedIndexes.length > 0 || gap.editedIndexes.length > 0) {
      gaps.push(gap)
      gap = {storedIndexes: [], editedIndexes: []}
    }
  }

  let canonicalIndex = 0
  let resultIndex = 0
  for (const [operation, text] of diffs) {
    if (operation === 0) {
      flushGap()
      for (let offset = 0; offset < text.length; offset++) {
        anchors.push({canonicalIndex, resultIndex})
        canonicalIndex++
        resultIndex++
      }
    } else if (operation === -1) {
      for (let offset = 0; offset < text.length; offset++) {
        gap.storedIndexes.push(canonicalIndex++)
      }
    } else {
      for (let offset = 0; offset < text.length; offset++) {
        gap.editedIndexes.push(resultIndex++)
      }
    }
  }
  flushGap()

  return {anchors, gaps}
}

function adoptAnchors(
  anchors: ReadonlyArray<Anchor>,
  originOf: (canonicalIndex: number) => Node,
  result: Array<Node>,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
): void {
  for (const anchor of anchors) {
    result[anchor.resultIndex] = adoptVerbatim(
      originOf(anchor.canonicalIndex),
      result[anchor.resultIndex]!,
      adoptedNodes,
      'content-unchanged',
      recorder,
    )
  }
}

/**
 * An anchor or a unique exact leftover pairs a canonical block against
 * a parsed one that share the same neutral form (that is what put them
 * in the same equal-diff run or the same neutral-form bucket), so
 * everything the dialect can express is untouched and everything it
 * cannot express was invisible to the edit. The stored subtree is the
 * truth at every depth, spans, marks, markDefs, and any field the
 * dialect drops, so adoption replaces the whole node rather than
 * reconciling into the parsed shape (which would otherwise, for
 * instance, keep a parser-side span merge that collapsed an
 * unmappable mark boundary the edit never touched). `restoreFields`
 * and per-child reconciliation are skipped entirely: a verbatim clone
 * of the stored node is already complete.
 */
function adoptVerbatim(
  original: Node,
  target: Node,
  adoptedNodes: AdoptedNodes,
  basis: PreservationBasis,
  recorder: ReconciliationRecorder | undefined,
  filledKeys: 'report-filled-keys' | 'omit-filled-keys' = 'report-filled-keys',
): Node {
  const clone = structuredClone(original)
  fillMissingKeysFromTarget(clone, target)
  markSubtreeAdopted(clone, adoptedNodes)
  if (recorder) {
    // The subtree tags every keyed node `content-unchanged`, the root
    // included. A non-default basis overrides the root only: a moved
    // block's children were not themselves moved.
    const storedCounterpart = structuredClone(original)
    tagSubtreePreservedAgainst(
      clone,
      storedCounterpart,
      recorder,
      filledKeys === 'omit-filled-keys',
    )
    if (basis !== 'content-unchanged' && typeof clone['_key'] === 'string') {
      recorder.preservation.set(clone, {basis, storedCounterpart})
    }
  }
  return clone
}

/**
 * A stored node practically always carries its own `_key`; when it
 * genuinely does not, there is nothing to adopt, so the clone keeps
 * whatever key the plain parse already minted at the corresponding
 * position, the same key adoption would have left in place. The walk
 * follows both trees positionally (not by content matching, which is
 * exactly what an exact-signature match already guarantees agrees at
 * every position the two sides both still have).
 */
function fillMissingKeysFromTarget(clone: Node, target: Node): void {
  if (typeof clone['_key'] !== 'string' && typeof target['_key'] === 'string') {
    clone['_key'] = target['_key']
  }
  for (const field of Object.keys(clone)) {
    const cloneValue = clone[field]
    const targetValue = target[field]
    if (isTypedObjectArray(cloneValue) && isTypedObjectArray(targetValue)) {
      const length = Math.min(cloneValue.length, targetValue.length)
      for (let index = 0; index < length; index++) {
        fillMissingKeysFromTarget(cloneValue[index]!, targetValue[index]!)
      }
    } else if (
      typeof cloneValue === 'object' &&
      cloneValue !== null &&
      !Array.isArray(cloneValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      fillMissingKeysFromTarget(cloneValue as Node, targetValue as Node)
    }
  }
}

/**
 * Every keyed node in a verbatim clone is adopted, not only its root:
 * the sibling-key-uniqueness pass recurses into every nested keyed
 * array, and an adopted-first ordering there only favors a clone's
 * descendants if they are themselves marked adopted.
 */
function markSubtreeAdopted(node: Node, adoptedNodes: AdoptedNodes): void {
  adoptedNodes.add(node)
  for (const value of Object.values(node)) {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null) &&
      value.length > 0
    ) {
      for (const child of value as Array<Node>) {
        markSubtreeAdopted(child, adoptedNodes)
      }
    } else if (typeof value === 'object' && value !== null) {
      markSubtreeAdopted(value as Node, adoptedNodes)
    }
  }
}

/**
 * Moves: content that left one gap and reappeared in another. Unique
 * exact pairs across all gaps adopt before any gap-local pairing can
 * consume the keys they need.
 */
function adoptMoves(
  gaps: ReadonlyArray<Gap>,
  canonical: ReadonlyArray<Node>,
  result: Array<Node>,
  originOf: (canonicalIndex: number) => Node,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
): Array<Gap> {
  const consumedStored = new Set<number>()
  const consumedEdited = new Set<number>()
  const storedLeftovers = gaps.flatMap((g) => g.storedIndexes)
  const editedLeftovers = gaps.flatMap((g) => g.editedIndexes)
  const storedByNeutral = new Map<string, Array<number>>()
  for (const index of storedLeftovers) {
    const neutral = neutralForm(canonical[index]!)
    storedByNeutral.set(neutral, [
      ...(storedByNeutral.get(neutral) ?? []),
      index,
    ])
  }
  const editedByNeutral = new Map<string, Array<number>>()
  for (const index of editedLeftovers) {
    const neutral = neutralForm(result[index]!)
    editedByNeutral.set(neutral, [
      ...(editedByNeutral.get(neutral) ?? []),
      index,
    ])
  }
  for (const [neutral, storedIndexes] of storedByNeutral) {
    const editedIndexes = editedByNeutral.get(neutral)
    if (
      storedIndexes.length !== 1 ||
      !editedIndexes ||
      editedIndexes.length !== 1
    ) {
      continue
    }
    consumedStored.add(storedIndexes[0]!)
    consumedEdited.add(editedIndexes[0]!)
    const clone = adoptVerbatim(
      originOf(storedIndexes[0]!),
      result[editedIndexes[0]!]!,
      adoptedNodes,
      'content-moved',
      recorder,
    )
    result[editedIndexes[0]!] = clone
  }

  return gaps.map((currentGap) => ({
    storedIndexes: currentGap.storedIndexes.filter(
      (index) => !consumedStored.has(index),
    ),
    editedIndexes: currentGap.editedIndexes.filter(
      (index) => !consumedEdited.has(index),
    ),
  }))
}

/**
 * Gap policy, in order: split/merge survivor (the first fragment or
 * first source block keeps the key, matching what pressing enter or
 * backspace does in the editor), positional zip for equal counts
 * (typing over a paragraph keeps its identity), similarity for
 * unequal counts (an insertion or deletion shifted positions, so
 * position lies and only mutual unique best evidence adopts).
 */
function resolveGap(
  storedIndexes: Array<number>,
  editedIndexes: Array<number>,
  canonical: ReadonlyArray<Node>,
  result: ReadonlyArray<Node>,
  originOf: (canonicalIndex: number) => Node,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
): void {
  const remainingStored = new Set(storedIndexes)
  const remainingEdited = new Set(editedIndexes)

  // The concatenation search below is quadratic in the gap's size, so
  // it shares the similarity tier's pair cap: past it, splits and
  // merges get skipped too rather than adopted at tens-of-seconds cost.
  const withinConcatenationCap =
    storedIndexes.length * editedIndexes.length <= MAX_SIMILARITY_PAIRS

  // Splits: one stored block's text equals the concatenation of
  // adjacent edited blocks.
  if (withinConcatenationCap) {
    for (const storedIndex of storedIndexes) {
      if (!remainingStored.has(storedIndex)) {
        continue
      }
      const storedBlock = canonical[storedIndex]!
      if (!isTextBlock(storedBlock)) {
        continue
      }
      const fragments = findConcatenation(
        blockText(storedBlock),
        editedIndexes.filter((index) => remainingEdited.has(index)),
        result,
      )
      if (fragments) {
        remainingStored.delete(storedIndex)
        for (const fragment of fragments) {
          remainingEdited.delete(fragment)
        }
        const survivor =
          fragments.find(
            (fragment) => blockText(result[fragment]!).length > 0,
          ) ?? fragments[0]!
        adoptNode(
          originOf(storedIndex),
          canonical[storedIndex],
          result[survivor]!,
          adoptedNodes,
          'content-split',
          recorder,
        )
      }
    }
  }

  // Merges: one edited block's text equals the concatenation of
  // adjacent stored blocks. The first source block survives.
  if (withinConcatenationCap) {
    for (const editedIndex of editedIndexes) {
      if (!remainingEdited.has(editedIndex)) {
        continue
      }
      const editedBlock = result[editedIndex]!
      if (!isTextBlock(editedBlock)) {
        continue
      }
      const sources = findConcatenation(
        blockText(editedBlock),
        storedIndexes.filter((index) => remainingStored.has(index)),
        canonical,
      )
      if (sources) {
        remainingEdited.delete(editedIndex)
        for (const source of sources) {
          remainingStored.delete(source)
        }
        adoptNode(
          originOf(sources[0]!),
          canonical[sources[0]!],
          result[editedIndex]!,
          adoptedNodes,
          'content-merged',
          recorder,
        )
      }
    }
  }

  const storedRest = [...remainingStored]
  const editedRest = [...remainingEdited]

  if (storedRest.length === editedRest.length) {
    for (let offset = 0; offset < storedRest.length; offset++) {
      const storedBlock = canonical[storedRest[offset]!]!
      const editedBlock = result[editedRest[offset]!]!
      if (storedBlock['_type'] === editedBlock['_type']) {
        adoptNode(
          originOf(storedRest[offset]!),
          canonical[storedRest[offset]!],
          editedBlock,
          adoptedNodes,
          'same-position',
          recorder,
        )
      }
    }
    return
  }

  if (storedRest.length * editedRest.length > MAX_SIMILARITY_PAIRS) {
    if (recorder) {
      recorder.ambiguousRegionGroups.push(
        editedRest.map((editedIndex) => result[editedIndex]!),
      )
    }
    return
  }

  const scores = new Map<string, number>()
  for (const storedIndex of storedRest) {
    for (const editedIndex of editedRest) {
      const score = blockSimilarity(
        canonical[storedIndex]!,
        result[editedIndex]!,
      )
      if (score >= MIN_BLOCK_SIMILARITY) {
        scores.set(`${storedIndex}:${editedIndex}`, score)
      }
    }
  }
  for (const storedIndex of storedRest) {
    const best = uniqueBest(editedRest, (editedIndex) =>
      scores.get(`${storedIndex}:${editedIndex}`),
    )
    if (best === undefined) {
      continue
    }
    const bestBack = uniqueBest(storedRest, (otherStoredIndex) =>
      scores.get(`${otherStoredIndex}:${best}`),
    )
    if (bestBack !== storedIndex) {
      continue
    }
    adoptNode(
      originOf(storedIndex),
      canonical[storedIndex],
      result[best]!,
      adoptedNodes,
      'similar-content',
      recorder,
    )
  }
}

/**
 * Fragments join with nothing or a single space, since a markdown
 * merge is often a soft-wrap join that inserts one ("alpha\nbeta"
 * parses to "alpha beta").
 */
function findConcatenation(
  wholeText: string,
  candidateIndexes: Array<number>,
  nodes: ReadonlyArray<Node>,
): Array<number> | undefined {
  if (wholeText.length === 0) {
    return undefined
  }
  for (const joiner of ['', ' ']) {
    for (let start = 0; start < candidateIndexes.length; start++) {
      let concatenated = ''
      const used: Array<number> = []
      for (
        let position = start;
        position < candidateIndexes.length;
        position++
      ) {
        const index = candidateIndexes[position]!
        if (position > start && candidateIndexes[position - 1] !== index - 1) {
          break
        }
        if (!isTextBlock(nodes[index]!)) {
          break
        }
        concatenated =
          used.length === 0
            ? blockText(nodes[index]!)
            : concatenated + joiner + blockText(nodes[index]!)
        used.push(index)
        if (concatenated.length > wholeText.length) {
          break
        }
        if (concatenated === wholeText && used.length > 1) {
          return used
        }
      }
    }
  }
  return undefined
}

/**
 * Adopts the original node's `_key`, its markdown-inexpressible
 * fields, then its `markDefs` before its other keyed children, since
 * `span.marks` references need the adopted `markDefs` keys already in
 * place.
 */
function adoptNode(
  original: Node,
  canonicalCounterpart: Node | undefined,
  target: Node,
  adoptedNodes: AdoptedNodes,
  basis: PreservationBasis,
  recorder: ReconciliationRecorder | undefined,
): void {
  adoptedNodes.add(target)
  if (typeof original['_key'] === 'string') {
    target['_key'] = original['_key']
    recorder?.preservation.set(target, {basis, storedCounterpart: original})
  }

  restoreFields(original, canonicalCounterpart, target)

  const markDefKeyMap = adoptMarkDefs(
    original,
    canonicalCounterpart,
    target,
    recorder,
  )
  rewriteMarkReferences(target, markDefKeyMap)

  for (const field of Object.keys(target)) {
    if (field === 'markDefs') {
      continue
    }
    const originalChildren = original[field]
    const targetChildren = target[field]
    if (
      !isTypedObjectArray(originalChildren) ||
      !isTypedObjectArray(targetChildren)
    ) {
      continue
    }
    const canonicalChildren = canonicalChildArray(
      canonicalCounterpart,
      field,
      originalChildren,
    )

    const matchedOriginal = new Set<number>()
    const matchedTarget = new Set<number>()
    const isSpanLevel = field === 'children'
    // Children reference their parent block's `markDefs`, so their
    // neutral forms alias marks against the parent, not themselves.
    const originalGroups = isSpanLevel
      ? groupByNeutralForm(
          originalChildren,
          matchedOriginal,
          buildAliasMap(original),
        )
      : groupByForm(
          originalChildren.map(
            (child, index) => canonicalChildren?.[index] ?? child,
          ),
          matchedOriginal,
          adoptionForm,
        )
    const targetGroups = isSpanLevel
      ? groupByNeutralForm(targetChildren, matchedTarget, buildAliasMap(target))
      : groupByForm(targetChildren, matchedTarget, adoptionForm)

    for (const [form, originalIndexes] of originalGroups) {
      const targetIndexes = targetGroups.get(form)
      if (
        originalIndexes.length !== 1 ||
        !targetIndexes ||
        targetIndexes.length !== 1
      ) {
        continue
      }
      const originalIndex = originalIndexes[0]!
      const targetIndex = targetIndexes[0]!
      matchedOriginal.add(originalIndex)
      matchedTarget.add(targetIndex)
      if (isSpanLevel) {
        // A verbatim span would keep stored `marks` keys that point at
        // `markDefs` this edited block may not have adopted.
        adoptNode(
          originalChildren[originalIndex]!,
          canonicalChildren?.[originalIndex],
          targetChildren[targetIndex]!,
          adoptedNodes,
          'content-unchanged',
          recorder,
        )
      } else {
        targetChildren[targetIndex] = adoptVerbatim(
          originalChildren[originalIndex]!,
          targetChildren[targetIndex]!,
          adoptedNodes,
          'content-unchanged',
          recorder,
          'omit-filled-keys',
        )
      }
    }

    // The concatenation search is quadratic in the block's span count,
    // so it shares the similarity tier's pair cap: past it, the merge
    // search is skipped and the unmatched spans fall through to fresh
    // keys rather than adopting at tens-of-seconds cost.
    if (
      field === 'children' &&
      originalChildren.length * targetChildren.length <= MAX_SIMILARITY_PAIRS
    ) {
      adoptMergedSpans(
        originalChildren,
        canonicalChildren,
        matchedOriginal,
        targetChildren,
        matchedTarget,
        adoptedNodes,
        recorder,
      )
    }

    adoptResidualZip(
      originalChildren,
      canonicalChildren,
      matchedOriginal,
      targetChildren,
      matchedTarget,
      adoptedNodes,
      recorder,
    )
  }
}

/**
 * The container-level counterpart of `traceOrigins`'s guard: a
 * child's canonical form is only trustworthy when the canonical
 * container holds the same field as the same typed object array,
 * equal in length and `_type` sequence to the original's, so pairing
 * by index (original child `i` to canonical child `i`) means the same
 * content on both sides.
 */
function canonicalChildArray(
  canonicalCounterpart: Node | undefined,
  field: string,
  originalChildren: ReadonlyArray<Node>,
): Array<Node> | undefined {
  if (!canonicalCounterpart) {
    return undefined
  }
  const candidate = canonicalCounterpart[field]
  if (
    !isTypedObjectArray(candidate) ||
    candidate.length !== originalChildren.length
  ) {
    return undefined
  }
  for (let index = 0; index < originalChildren.length; index++) {
    if (originalChildren[index]!['_type'] !== candidate[index]!['_type']) {
      return undefined
    }
  }
  return candidate
}

/**
 * Restores fields the markdown dialect dropped or altered: present on
 * the original, unchanged by the edit (the target still agrees with
 * the original's own canonical round trip), and different on that
 * round trip from the original (so the parse, left to itself, could
 * never have produced the original's value). Absence counts as a
 * value under both comparisons, which is what folds a wholly dropped
 * field (no markdown form at all) and a coerced one (a custom style
 * or decorator markdown silently maps to its closest built-in) into
 * one rule. Structural child arrays (`children`, `markDefs`, and
 * typed object arrays generally) are excluded: their elements adopt
 * individually through the recursive per-child walk instead, except
 * when the target has no such element to walk at all: a typed-object
 * array field the dialect drops entirely leaves nothing on the target
 * side for that walk to reconcile, so it falls through to the same
 * absent-on-target, absent-on-canonical oracle as every scalar field,
 * restored verbatim rather than left missing. Restored values are
 * cloned, since the sibling-key-uniqueness pass may rewrite `_key`s
 * inside a restored array of objects, and the original must stay
 * untouched.
 */
function restoreFields(
  original: Node,
  canonicalCounterpart: Node | undefined,
  target: Node,
): void {
  if (!canonicalCounterpart) {
    return
  }
  for (const field of Object.keys(original)) {
    if (
      field === '_key' ||
      field === '_type' ||
      field === 'markDefs' ||
      field === 'children'
    ) {
      continue
    }
    if (isTypedObjectArray(original[field])) {
      if (
        target[field] === undefined &&
        canonicalCounterpart[field] === undefined
      ) {
        target[field] = structuredClone(original[field])
      }
      continue
    }
    const canonicalValue = canonicalCounterpart[field]
    if (!valuesEqual(target[field], canonicalValue)) {
      continue
    }
    if (valuesEqual(canonicalValue, original[field])) {
      continue
    }
    target[field] = structuredClone(original[field])
  }
}

/**
 * Deep equality for restoration's before/after comparison: the
 * `encodeNeutral` encoding without alias rewriting, so it compares
 * `marks` arrays (and any other array or nested object) by value
 * rather than by identity. Absent (`undefined`) encodes to the same
 * string on both sides, so two absent fields count as equal.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  return encodeNeutral(a, undefined) === encodeNeutral(b, undefined)
}

/**
 * A span in the edited output can be the merge of several stored
 * spans: the parser merges adjacent same-mark spans, and an edit that
 * removes formatting merges across the old mark boundary too. Matching
 * is by text alone, and the first contributor's key survives, matching
 * the editor's own span-merge normalization.
 */
function adoptMergedSpans(
  originalChildren: ReadonlyArray<Node>,
  canonicalChildren: ReadonlyArray<Node> | undefined,
  matchedOriginal: Set<number>,
  targetChildren: ReadonlyArray<Node>,
  matchedTarget: Set<number>,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
): void {
  for (
    let targetIndex = 0;
    targetIndex < targetChildren.length;
    targetIndex++
  ) {
    if (matchedTarget.has(targetIndex)) {
      continue
    }
    const targetSpan = targetChildren[targetIndex]!
    const targetText = targetSpan['text']
    if (typeof targetText !== 'string') {
      continue
    }

    for (let start = 0; start < originalChildren.length; start++) {
      if (matchedOriginal.has(start)) {
        continue
      }
      let concatenated = ''
      const used: Array<number> = []
      for (let index = start; index < originalChildren.length; index++) {
        if (matchedOriginal.has(index)) {
          break
        }
        const originalSpan = originalChildren[index]!
        if (typeof originalSpan['text'] !== 'string') {
          break
        }
        concatenated += originalSpan['text']
        used.push(index)
        if (concatenated.length > targetText.length) {
          break
        }
        if (concatenated === targetText && used.length > 1) {
          matchedTarget.add(targetIndex)
          for (const usedIndex of used) {
            matchedOriginal.add(usedIndex)
          }
          adoptNode(
            originalChildren[used[0]!]!,
            canonicalChildren?.[used[0]!],
            targetSpan,
            adoptedNodes,
            'content-merged',
            recorder,
          )
          break
        }
      }
      if (matchedTarget.has(targetIndex)) {
        break
      }
    }
  }
}

/**
 * The equal-count residual rule, mirroring `resolveGap`'s positional
 * zip: elements left unmatched after neutral-form (and, for
 * `children`, span-merge) matching are treated as in-place edits when
 * both sides leave the same count, position being the same evidence
 * the block-level zip already trusts, and the trade is the same too:
 * a reorder-plus-edit with balanced counts mispairs. Unequal counts
 * adopt nothing, since position no longer lines up.
 */
function adoptResidualZip(
  originalChildren: ReadonlyArray<Node>,
  canonicalChildren: ReadonlyArray<Node> | undefined,
  matchedOriginal: ReadonlySet<number>,
  targetChildren: ReadonlyArray<Node>,
  matchedTarget: ReadonlySet<number>,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
): void {
  const originalRest = originalChildren
    .map((node, index) => ({node, index}))
    .filter(({index}) => !matchedOriginal.has(index))
  const targetRest = targetChildren.filter(
    (_, index) => !matchedTarget.has(index),
  )
  if (originalRest.length !== targetRest.length) {
    return
  }
  for (let offset = 0; offset < originalRest.length; offset++) {
    const originalNode = originalRest[offset]!.node
    const targetNode = targetRest[offset]!
    if (originalNode['_type'] === targetNode['_type']) {
      adoptNode(
        originalNode,
        canonicalChildren?.[originalRest[offset]!.index],
        targetNode,
        adoptedNodes,
        'same-position',
        recorder,
      )
    }
  }
}

/**
 * Matches `markDefs` by definition content, `_key` excluded. Returns
 * the mapping from the target's fresh keys to the adopted stored
 * keys, for rewriting `span.marks` references.
 */
function adoptMarkDefs(
  original: Node,
  canonicalCounterpart: Node | undefined,
  target: Node,
  recorder: ReconciliationRecorder | undefined,
): Map<string, string> {
  const keyMap = new Map<string, string>()
  const originalDefs = original['markDefs']
  const targetDefs = target['markDefs']
  if (!isTypedObjectArray(originalDefs) || !isTypedObjectArray(targetDefs)) {
    return keyMap
  }
  const canonicalDefs = canonicalChildArray(
    canonicalCounterpart,
    'markDefs',
    originalDefs,
  )

  const matchedOriginal = new Set<number>()
  const matchedTarget = new Set<number>()
  // Stored definitions can carry fields the dialect drops (restored
  // later from the stored side), which the parsed definitions never
  // have; fingerprinting the stored side via its canonical twin keeps
  // the two sides' fingerprints dialect-consistent.
  const originalFingerprintSource = originalDefs.map(
    (def, index) => canonicalDefs?.[index] ?? def,
  )
  const originalGroups = groupByNeutralForm(
    originalFingerprintSource,
    matchedOriginal,
  )
  const targetGroups = groupByNeutralForm(targetDefs, matchedTarget)

  const adoptDef = (
    originalDef: Node,
    canonicalDef: Node | undefined,
    targetDef: Node,
    basis: PreservationBasis,
  ): void => {
    restoreFields(originalDef, canonicalDef, targetDef)
    if (
      typeof originalDef['_key'] === 'string' &&
      typeof targetDef['_key'] === 'string'
    ) {
      const adoptedKey = originalDef['_key']
      const collidesWithSibling = targetDefs.some(
        (def) => def !== targetDef && def['_key'] === adoptedKey,
      )
      if (collidesWithSibling) {
        recorder?.annotationKeyConflicts.push(targetDef)
        return
      }
      keyMap.set(targetDef['_key'], adoptedKey)
      targetDef['_key'] = adoptedKey
      recorder?.preservation.set(targetDef, {
        basis,
        storedCounterpart: originalDef,
      })
    }
  }

  for (const [neutral, originalIndexes] of originalGroups) {
    const targetIndexes = targetGroups.get(neutral)
    if (!targetIndexes || targetIndexes.length !== originalIndexes.length) {
      continue
    }
    // Equal-count identical definitions pair in order, the repeated-content
    // policy: the definitions are content-equal, so no pairing can
    // mis-resolve a reference.
    for (let offset = 0; offset < originalIndexes.length; offset++) {
      matchedOriginal.add(originalIndexes[offset]!)
      matchedTarget.add(targetIndexes[offset]!)
      adoptDef(
        originalDefs[originalIndexes[offset]!]!,
        canonicalDefs?.[originalIndexes[offset]!],
        targetDefs[targetIndexes[offset]!]!,
        originalIndexes.length === 1 ? 'content-unchanged' : 'same-position',
      )
    }
  }

  const originalRest = originalDefs
    .map((node, index) => ({node, index}))
    .filter(({index}) => !matchedOriginal.has(index))
  const targetRest = targetDefs.filter((_, index) => !matchedTarget.has(index))
  if (
    originalRest.length === 1 &&
    targetRest.length === 1 &&
    originalRest[0]!.node['_type'] === targetRest[0]!['_type']
  ) {
    adoptDef(
      originalRest[0]!.node,
      canonicalDefs?.[originalRest[0]!.index],
      targetRest[0]!,
      'same-position',
    )
  }

  return keyMap
}

function rewriteMarkReferences(block: Node, keyMap: Map<string, string>): void {
  if (keyMap.size === 0) {
    return
  }
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return
  }
  for (const child of children) {
    const marks = child['marks']
    if (!Array.isArray(marks)) {
      continue
    }
    child['marks'] = marks.map((mark) =>
      typeof mark === 'string' && keyMap.has(mark) ? keyMap.get(mark) : mark,
    )
  }
}

function groupByNeutralForm(
  nodes: ReadonlyArray<Node>,
  exclude: ReadonlySet<number>,
  aliasByKey?: Map<string, string>,
): Map<string, Array<number>> {
  return groupByForm(nodes, exclude, (node) =>
    aliasByKey ? encodeNeutral(node, aliasByKey) : neutralForm(node),
  )
}

function groupByForm(
  nodes: ReadonlyArray<Node>,
  exclude: ReadonlySet<number>,
  formOf: (node: Node) => string,
): Map<string, Array<number>> {
  const groups = new Map<string, Array<number>>()
  for (let index = 0; index < nodes.length; index++) {
    if (exclude.has(index)) {
      continue
    }
    const form = formOf(nodes[index]!)
    const group = groups.get(form)
    if (group) {
      group.push(index)
    } else {
      groups.set(form, [index])
    }
  }
  return groups
}

/**
 * A stored child whose adoption form equals the parse's can be
 * returned verbatim. Only keys adoption reconciles are identity: the
 * node's own, those of typed object array members reached through
 * typed object arrays, and a definition's own `_key` (references
 * compare through `marks` instead). `adoptMarkDefs` does not reconcile
 * inside a definition, and nothing reconciles below any other field, so
 * every `_key` there is content an edit can change.
 */
function adoptionForm(node: Node): string {
  return encodeAdoption(node, 'identity', undefined)
}

type KeyRole = 'identity' | 'definition' | 'content'

function encodeAdoption(
  value: unknown,
  keyRole: KeyRole,
  aliasByKey: Map<string, AdoptionMarkAlias> | undefined,
): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => encodeAdoption(item, keyRole, aliasByKey))
      .join(',')}]`
  }
  if (typeof value !== 'object' || value === null) {
    return JSON.stringify(value) ?? 'undefined'
  }
  const node = value as Node
  const ownAliasByKey =
    keyRole === 'identity'
      ? (buildAdoptionAliasMap(node) ?? aliasByKey)
      : undefined
  const entries = Object.entries(node)
    .filter(([field]) => !(keyRole !== 'content' && field === '_key'))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([field, fieldValue]) => {
      if (field === 'marks' && ownAliasByKey && Array.isArray(fieldValue)) {
        const tagged = fieldValue.map((mark) =>
          typeof mark === 'string' && ownAliasByKey.has(mark)
            ? ownAliasByKey.get(mark)
            : ['m', mark],
        )
        return `${JSON.stringify(field)}:${JSON.stringify(tagged)}`
      }
      return `${JSON.stringify(field)}:${encodeAdoption(
        fieldValue,
        childKeyRole(keyRole, field, fieldValue),
        ownAliasByKey,
      )}`
    })
  return `{${entries.join(',')}}`
}

function childKeyRole(
  parentRole: KeyRole,
  field: string,
  fieldValue: unknown,
): KeyRole {
  if (parentRole !== 'identity' || !isTypedObjectArray(fieldValue)) {
    return 'content'
  }
  return field === 'markDefs' ? 'definition' : 'identity'
}

function buildAdoptionAliasMap(
  node: Node,
): Map<string, AdoptionMarkAlias> | undefined {
  const markDefs = node['markDefs']
  if (!isTypedObjectArray(markDefs)) {
    return undefined
  }
  const aliasByKey = new Map<string, AdoptionMarkAlias>()
  const occurrenceByForm = new Map<string, number>()
  for (const definition of markDefs) {
    const key = definition['_key']
    if (typeof key !== 'string') {
      continue
    }
    const form = encodeAdoption(definition, 'definition', undefined)
    const occurrence = occurrenceByForm.get(form) ?? 0
    occurrenceByForm.set(form, occurrence + 1)
    aliasByKey.set(key, ['a', form, occurrence])
  }
  return aliasByKey
}

/**
 * A reference encodes as `['a', form, occurrence]` and a literal mark
 * as `['m', mark]`, so no decorator string can spell a reference.
 */
type AdoptionMarkAlias = ['a', string, number]

/**
 * A canonical JSON encoding that erases identity: `_key` properties
 * are dropped, object properties are sorted, and annotation `_key`
 * references inside `span.marks` are rewritten to the definition's
 * position in `markDefs` (dropping `_key` alone would compare the
 * stored annotation key against the fresh one and reject an unchanged
 * link).
 */
function neutralForm(node: Node): string {
  return encodeNeutral(node, buildAliasMap(node))
}

/**
 * Aliases each `markDefs` key to a key-independent spelling of the
 * definition itself, so `span.marks` references compare by what the
 * annotation is rather than which key it carries. The spelling is the
 * definition's own neutral form, not its array position: aliasing by
 * position made every annotated sibling span's neutral form shift when
 * a definition was inserted or removed before its own, so adding one
 * link re-keyed unrelated annotated spans. Identical definitions (the
 * same link twice) are disambiguated by occurrence order among
 * identical forms only, which no unrelated insertion can shift.
 */
function buildAliasMap(node: Node): Map<string, string> | undefined {
  const markDefs = node['markDefs']
  if (!isTypedObjectArray(markDefs)) {
    return undefined
  }
  const aliasByKey = new Map<string, string>()
  const occurrenceByForm = new Map<string, number>()
  for (const definition of markDefs) {
    const key = definition['_key']
    if (typeof key !== 'string') {
      continue
    }
    const form = encodeNeutral(definition, undefined)
    const occurrence = occurrenceByForm.get(form) ?? 0
    occurrenceByForm.set(form, occurrence + 1)
    aliasByKey.set(key, `@annotation:${occurrence}:${form}`)
  }
  return aliasByKey
}

function encodeNeutral(
  value: unknown,
  aliasByKey: Map<string, string> | undefined,
): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => encodeNeutral(item, aliasByKey)).join(',')}]`
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Node)
      .filter(([field]) => field !== '_key')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([field, fieldValue]) => {
        if (field === 'marks' && aliasByKey && Array.isArray(fieldValue)) {
          const aliased = fieldValue.map((mark) =>
            typeof mark === 'string' && aliasByKey.has(mark)
              ? aliasByKey.get(mark)
              : mark,
          )
          return `${JSON.stringify(field)}:${JSON.stringify(aliased)}`
        }
        return `${JSON.stringify(field)}:${encodeNeutral(fieldValue, aliasByKey)}`
      })
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

const INLINE_OBJECT_SENTINEL = '\uFFFC'

/**
 * The block's comparison text: concatenated span text with inline
 * objects as sentinels. Marks are ignored, since a formatting-only
 * edit does not change textual identity.
 */
function blockText(block: Node): string {
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return ''
  }
  return children.map(childText).join('')
}

function childText(child: Node): string {
  return typeof child['text'] === 'string'
    ? child['text']
    : INLINE_OBJECT_SENTINEL
}

/**
 * Text similarity in `[0, 1]`, gated to `0` unless the block shells
 * agree and the inline objects are compatible: however alike the
 * prose, blocks that disagree on structure are not the same block.
 * The length prescreen skips the diff when the size difference alone
 * puts the score under `MIN_BLOCK_SIMILARITY`.
 */
function blockSimilarity(canonicalBlock: Node, resultBlock: Node): number {
  if (!shellEquals(canonicalBlock, resultBlock)) {
    return 0
  }
  if (!inlineObjectsCompatible(canonicalBlock, resultBlock)) {
    return 0
  }
  const canonicalText = blockText(canonicalBlock)
  const resultText = blockText(resultBlock)
  if (canonicalText.length === 0 || resultText.length === 0) {
    return 0
  }
  const longer = Math.max(canonicalText.length, resultText.length)
  const lengthBound =
    1 - Math.abs(canonicalText.length - resultText.length) / longer
  if (lengthBound < MIN_BLOCK_SIMILARITY) {
    return 0
  }
  const diffs = cleanupEfficiency(
    makeDiff(canonicalText, resultText, {
      timeout: SIMILARITY_DIFF_TIMEOUT_SECONDS,
    }),
  )
  return 1 - levenshteinFromDiffs(diffs) / longer
}

/**
 * The distance derivation from diff runs: insertions and deletions
 * between equality runs accumulate as the larger of the two, so a
 * delete-plus-insert counts as one substitution.
 */
function levenshteinFromDiffs(diffs: ReadonlyArray<[number, string]>): number {
  let distance = 0
  let insertions = 0
  let deletions = 0
  for (const [operation, text] of diffs) {
    if (operation === 1) {
      insertions += text.length
    } else if (operation === -1) {
      deletions += text.length
    } else {
      distance += Math.max(insertions, deletions)
      insertions = 0
      deletions = 0
    }
  }
  return distance + Math.max(insertions, deletions)
}

/**
 * The block minus its content: `_type`, `style`, `listItem`, `level`,
 * and any custom fields must agree before text similarity means
 * anything.
 */
function shellEquals(a: Node, b: Node): boolean {
  const shellOf = (node: Node): string =>
    encodeNeutral(
      Object.fromEntries(
        Object.entries(node).filter(
          ([field]) => field !== 'children' && field !== 'markDefs',
        ),
      ),
      undefined,
    )
  return shellOf(a) === shellOf(b)
}

/**
 * Inline objects are opaque content: two blocks whose objects differ
 * are different blocks no matter how similar their prose is.
 */
function inlineObjectsCompatible(a: Node, b: Node): boolean {
  const objectsOf = (node: Node): Array<Node> => {
    const children = node['children']
    if (!isTypedObjectArray(children)) {
      return []
    }
    return children.filter((child) => typeof child['text'] !== 'string')
  }
  const aObjects = objectsOf(a)
  const bObjects = objectsOf(b)
  if (aObjects.length !== bObjects.length) {
    return false
  }
  return aObjects.every((aObject, index) => {
    const bObject = bObjects[index]!
    if (aObject['_type'] !== bObject['_type']) {
      return false
    }
    if (
      typeof aObject['_key'] === 'string' &&
      aObject['_key'] === bObject['_key']
    ) {
      return true
    }
    return neutralForm(aObject) === neutralForm(bObject)
  })
}

/**
 * The highest-scoring candidate, or `undefined` on a tie: a tie is
 * ambiguity, and ambiguity refuses adoption rather than guessing.
 */
function uniqueBest(
  candidates: ReadonlyArray<number>,
  scoreOf: (candidate: number) => number | undefined,
): number | undefined {
  let best: number | undefined
  let bestScore = 0
  let tied = false
  for (const candidate of candidates) {
    const score = scoreOf(candidate)
    if (score === undefined) {
      continue
    }
    if (score > bestScore) {
      best = candidate
      bestScore = score
      tied = false
    } else if (score === bestScore && best !== undefined) {
      tied = true
    }
  }
  return tied ? undefined : best
}

/**
 * Deliberately loose: any node with a `children` array reconciles like
 * a text block, custom block types included.
 */
function isTextBlock(node: Node): boolean {
  return Array.isArray(node['children'])
}

/**
 * A text block the round trip drops. Whether a whitespace-only block
 * survives serialize→parse depends on the converters, not on
 * structure: a heading renders `## ` and survives, a custom style
 * falls back to a plain paragraph and vanishes, and a non-breaking
 * space renders "blank-looking" output the parser still keeps (JS
 * `trim` folds NBSP, CommonMark does not), so any string check here is
 * a hand-written mirror of one converter or the other that drifts. The
 * block's own render-then-reparse is the authority, the same round
 * trip `canonicalizeStored` performs, so this predicate cannot
 * disagree with the canonical node count. The JS-trim pre-check only
 * keeps the per-block round trip off paths that cannot qualify: it
 * over-admits candidates (NBSP text passes it), and the reparse then
 * decides.
 */
function isEmptyTextBlock(
  node: Node,
  options: ApplyMarkdownEditOptions | undefined,
): boolean {
  if (!(isTextBlock(node) && blockText(node).trim() === '')) {
    return false
  }
  const rendered = portableTextToMarkdown(
    [structuredClone(node)] as unknown as Array<PortableTextBlock>,
    {...stripOnDegradation(options?.serialize), schema: options?.schema},
  )
  if (rendered === '') {
    return true
  }
  const {onDegradation: _onDegradation, ...deserializeOptions} =
    options?.deserialize ?? {}
  let probeKeyCounter = 0
  return (
    markdownToPortableText(rendered, {
      ...deserializeOptions,
      schema: options?.schema,
      keyGenerator: () => `empty-probe-${probeKeyCounter++}`,
    }).length === 0
  )
}

/**
 * Blank lines are markdown's block separator, so an empty text block
 * has no serialized form: `canonicalizeStored`'s round trip drops it,
 * the same way `markdownToPortableText` would if it were parsed back
 * from `editedMarkdown`. Tracing origins and aligning blocks over this
 * subsequence keeps both sides the same length; `reinsertEmptyRuns`
 * restores the dropped blocks afterward.
 */
function nonEmptyBlocks(
  stored: ReadonlyArray<PortableTextBlock>,
  options: ApplyMarkdownEditOptions | undefined,
): Array<PortableTextBlock> {
  return stored.filter(
    (node) => !isEmptyTextBlock(node as unknown as Node, options),
  )
}

function isTypedObjectArray(value: unknown): value is Array<Node> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Node)['_type'] === 'string',
    )
  )
}

type EmptyRun = {
  anchorKey: string
  insertAfter: boolean
  blocks: Array<Node>
}

/**
 * Maximal runs of empty text blocks, each paired with the surviving
 * neighbor its restoration hangs off: a run with a preceding block
 * anchors to it (insert after); a run at the document's start, with
 * none, anchors to the block that follows it (insert before). A run
 * with neither (the whole document is empty blocks) has nothing to
 * anchor to and is dropped.
 */
function findEmptyRuns(
  stored: ReadonlyArray<PortableTextBlock>,
  options: ApplyMarkdownEditOptions | undefined,
): Array<EmptyRun> {
  const runs: Array<EmptyRun> = []
  let index = 0
  while (index < stored.length) {
    if (!isEmptyTextBlock(stored[index] as unknown as Node, options)) {
      index++
      continue
    }
    const runStart = index
    while (
      index < stored.length &&
      isEmptyTextBlock(stored[index] as unknown as Node, options)
    ) {
      index++
    }
    const precedingBlock =
      runStart > 0 ? (stored[runStart - 1] as unknown as Node) : undefined
    const followingBlock =
      index < stored.length ? (stored[index] as unknown as Node) : undefined
    const anchor = precedingBlock ?? followingBlock
    if (anchor && typeof anchor['_key'] === 'string') {
      runs.push({
        anchorKey: anchor['_key'],
        insertAfter: precedingBlock !== undefined,
        blocks: stored.slice(runStart, index) as unknown as Array<Node>,
      })
    }
  }
  return runs
}

/**
 * Restores each empty run next to the result node that adopted its
 * anchor's key, found by `_key` since positions have already shifted
 * under insertion, deletion, and move. An anchor whose key did not
 * survive into `result` (its region was rewritten or deleted) drops
 * the run with it, consistent with rewrite semantics elsewhere in this
 * module. Runs are cloned and marked adopted, the same authoritative
 * status as every other restored key, so a collision resolves in
 * their favor like `enforceSiblingKeyUniqueness` already does for
 * `json:object` duplicates.
 */
function reinsertEmptyRuns(
  stored: ReadonlyArray<PortableTextBlock>,
  result: Array<Node>,
  adoptedNodes: AdoptedNodes,
  options: ApplyMarkdownEditOptions | undefined,
  recorder: ReconciliationRecorder | undefined,
): void {
  for (const run of findEmptyRuns(stored, options)) {
    // A pasted `json:object` duplicate can wear the anchor's key at an
    // earlier position until the uniqueness pass renames it, so an
    // adopted bearer of the key outranks a verbatim duplicate.
    const adoptedAnchorIndex = result.findIndex(
      (node) => node['_key'] === run.anchorKey && adoptedNodes.has(node),
    )
    const anchorIndex =
      adoptedAnchorIndex !== -1
        ? adoptedAnchorIndex
        : result.findIndex((node) => node['_key'] === run.anchorKey)
    if (anchorIndex === -1) {
      continue
    }
    const clones = run.blocks.map((block) => structuredClone(block))
    for (const clone of clones) {
      adoptedNodes.add(clone)
      if (recorder) {
        tagSubtreePreserved(clone, recorder)
      }
    }
    result.splice(run.insertAfter ? anchorIndex + 1 : anchorIndex, 0, ...clones)
  }
}

/**
 * Every keyed node in a reinserted empty run is the stored value
 * verbatim, at every depth, so key resolution reporting tags the
 * whole subtree `content-unchanged` rather than only the run's top
 * block.
 */
function tagSubtreePreserved(
  node: Node,
  recorder: ReconciliationRecorder,
): void {
  tagSubtreePreservedAgainst(node, structuredClone(node), recorder)
}

function tagSubtreePreservedAgainst(
  node: Node,
  counterpart: Node,
  recorder: ReconciliationRecorder,
  storedKeysOnly = false,
): void {
  if (
    typeof node['_key'] === 'string' &&
    (!storedKeysOnly || typeof counterpart['_key'] === 'string')
  ) {
    recorder.preservation.set(node, {
      basis: 'content-unchanged',
      storedCounterpart: counterpart,
    })
  }
  for (const [field, value] of Object.entries(node)) {
    const counterpartValue = counterpart[field]
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null) &&
      value.length > 0
    ) {
      const counterpartChildren = counterpartValue as Array<Node>
      value.forEach((child, index) => {
        tagSubtreePreservedAgainst(
          child as Node,
          counterpartChildren[index]!,
          recorder,
          storedKeysOnly,
        )
      })
    } else if (typeof value === 'object' && value !== null) {
      tagSubtreePreservedAgainst(
        value as Node,
        counterpartValue as Node,
        recorder,
        storedKeysOnly,
      )
    }
  }
}

/**
 * `json:object` payloads transport their `_key` verbatim, so a
 * copy-pasted fence puts the same key on two siblings, and everything
 * downstream (patches, anchors, editor normalization) assumes sibling
 * keys are unique. Adopted keys are authoritative, so a duplicate that
 * was adopted from the stored value wins and the other occurrences are
 * regenerated.
 */
function enforceSiblingKeyUniqueness(
  nodes: Array<Node>,
  keyGenerator: () => string,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
  onKeyRewritten?: (oldKey: string, newKey: string) => void,
): void {
  const usedKeys = new Set<string>()
  // A fresh key must not take a key a later sibling keeps, or that
  // sibling would be the one renamed when its turn comes.
  const siblingKeys = new Set(
    nodes
      .map((node) => node['_key'])
      .filter((key): key is string => typeof key === 'string'),
  )
  const isTaken = (key: string) => usedKeys.has(key) || siblingKeys.has(key)

  const claim = (node: Node): void => {
    const key = node['_key']
    if (typeof key !== 'string') {
      return
    }
    if (usedKeys.has(key)) {
      let freshKey: string | undefined
      for (let attempt = 0; attempt < MAX_KEY_GENERATOR_ATTEMPTS; attempt++) {
        const candidate = keyGenerator()
        if (!isTaken(candidate)) {
          freshKey = candidate
          break
        }
      }
      if (freshKey === undefined) {
        let suffix = 1
        let candidate = `${key}_${suffix}`
        while (isTaken(candidate)) {
          suffix++
          candidate = `${key}_${suffix}`
        }
        freshKey = candidate
      }
      node['_key'] = freshKey
      usedKeys.add(freshKey)
      onKeyRewritten?.(key, freshKey)
      recorder?.renamePreviousKey.set(node, key)
      return
    }
    usedKeys.add(key)
  }

  const adopted = nodes.filter((node) => adoptedNodes.has(node))
  const rest = nodes.filter((node) => !adoptedNodes.has(node))
  for (const node of [...adopted, ...rest]) {
    claim(node)
  }

  for (const node of nodes) {
    enforceNestedSiblingKeyUniqueness(
      node,
      keyGenerator,
      adoptedNodes,
      recorder,
    )
  }
}

function enforceNestedSiblingKeyUniqueness(
  node: Node,
  keyGenerator: () => string,
  adoptedNodes: AdoptedNodes,
  recorder: ReconciliationRecorder | undefined,
): void {
  for (const [field, value] of Object.entries(node)) {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null) &&
      value.length > 0
    ) {
      enforceSiblingKeyUniqueness(
        value as Array<Node>,
        keyGenerator,
        adoptedNodes,
        recorder,
        field === 'markDefs' ? buildMarkDefKeyRewriter(node) : undefined,
      )
    } else if (typeof value === 'object' && value !== null) {
      enforceNestedSiblingKeyUniqueness(
        value as Node,
        keyGenerator,
        adoptedNodes,
        recorder,
      )
    }
  }
}

/**
 * A colliding `keyGenerator` can mint the identical string for two
 * `markDefs` entries, which means the block's spans already reference
 * that shared string ambiguously before any rewrite happens: a
 * blanket find-and-replace of the old key would move every span's
 * reference, including the one that was never renamed. The
 * `markDefs` array and each span's `marks` are walked in the same
 * fixed document order, so the Nth occurrence of a given key in one
 * lines up with the Nth occurrence in the other; the first occurrence
 * is always the survivor (`enforceSiblingKeyUniqueness` only renames
 * on collision, never the first sighting of a key), so each rename
 * event retargets the next occurrence in that shared order instead of
 * every occurrence.
 */
function buildMarkDefKeyRewriter(
  block: Node,
): (oldKey: string, newKey: string) => void {
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return () => {}
  }
  const occurrencesByKey = new Map<
    string,
    Array<{child: Node; markIndex: number}>
  >()
  for (const child of children) {
    const marks = child['marks']
    if (!Array.isArray(marks)) {
      continue
    }
    for (let markIndex = 0; markIndex < marks.length; markIndex++) {
      const mark = marks[markIndex]
      if (typeof mark !== 'string') {
        continue
      }
      const occurrences = occurrencesByKey.get(mark) ?? []
      occurrences.push({child, markIndex})
      occurrencesByKey.set(mark, occurrences)
    }
  }
  const consumedByKey = new Map<string, number>()
  return (oldKey: string, newKey: string): void => {
    const occurrences = occurrencesByKey.get(oldKey)
    // The first occurrence of `oldKey` is the survivor and is never
    // passed here, so the first rename event targets the second
    // occurrence.
    const index = consumedByKey.get(oldKey) ?? 1
    consumedByKey.set(oldKey, index + 1)
    const target = occurrences?.[index]
    if (!target) {
      return
    }
    const marks = target.child['marks']
    if (Array.isArray(marks)) {
      marks[target.markIndex] = newKey
    }
  }
}

/**
 * Materializes the public report from the recorder's node-identity
 * decisions, walking the settled result tree once so every `key` and
 * `path` matches the returned value exactly: key resolution records
 * decisions before the sibling-uniqueness pass can still rewrite a
 * key, so keys and paths are only trustworthy read back from the
 * final tree, not from the moment a decision was made.
 */
function buildReconciliationReport(
  result: Array<Node>,
  recorder: ReconciliationRecorder,
  losses: Pick<
    ReconciliationReport,
    'hiddenLosses' | 'markdownLosses' | 'undeclaredObjects'
  >,
): ReconciliationReport {
  const preservedKeys: Extract<
    ReconciliationReport,
    {keyMatching: 'performed'}
  >['preservedKeys'] = []
  const renamedKeys: Extract<
    ReconciliationReport,
    {keyMatching: 'performed'}
  >['renamedKeys'] = []
  const pathByNode = new WeakMap<Node, ReconciliationKeyPath>()

  const walk = (node: Node, path: ReconciliationKeyPath): void => {
    pathByNode.set(node, path)
    const key = node['_key']
    if (typeof key === 'string') {
      const preservation = recorder.preservation.get(node)
      const previousKey = recorder.renamePreviousKey.get(node)
      if (preservation && previousKey === undefined) {
        // A node that was adopted and then renamed (possible only when
        // the stored value itself carries duplicate sibling keys) did
        // not keep its stored key: the renamed-key entry carries that
        // story, and a preserved-key entry would report a key that
        // exists nowhere in the stored value.
        preservedKeys.push({
          basis: preservation.basis,
          key,
          path,
          valueChanged: !deepEqualNodes(preservation.storedCounterpart, node),
        })
      }
      if (previousKey !== undefined) {
        renamedKeys.push({previousKey, key, path})
      }
    }
    for (const [field, value] of Object.entries(node)) {
      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'object' && item !== null) &&
        value.length > 0
      ) {
        // `enforceNestedSiblingKeyUniqueness` recurses into every
        // element of an all-object array whether or not the element
        // itself carries a `_key` (a `json:object` payload can nest a
        // keyless wrapper around keyed content); the walk enters the
        // same nodes, or a renamed key or key fallback on a keyed
        // descendant of a keyless wrapper never gets a path to report
        // against.
        value.forEach((child, index) => {
          const childKey = (child as Node)['_key']
          walk(child as Node, [
            ...path,
            field,
            typeof childKey === 'string' ? {_key: childKey} : index,
          ])
        })
      } else if (typeof value === 'object' && value !== null) {
        walk(value as Node, [...path, field])
      }
    }
  }

  result.forEach((block, index) => {
    const key = block['_key']
    // `enforceSiblingKeyUniqueness` enters every top-level node whether
    // or not it carries a `_key` (a `json:object` fence payload needs
    // only `_type`), so the walk must too, or a renamed key inside a
    // keyless block never gets reported. A keyless root contributes
    // its index as a number segment, like a keyless wrapper at any
    // depth.
    walk(block, [typeof key === 'string' ? {_key: key} : index])
  })

  if (recorder.skip) {
    return {keyMatching: 'skipped', ...recorder.skip, renamedKeys, ...losses}
  }

  const keyFallbacks: Extract<
    ReconciliationReport,
    {keyMatching: 'performed'}
  >['keyFallbacks'] = []
  for (const group of recorder.ambiguousRegionGroups) {
    keyFallbacks.push({
      type: 'ambiguous-region-too-large',
      keys: group
        .map((node) => node['_key'])
        .filter((key): key is string => typeof key === 'string'),
    })
  }
  for (const node of recorder.annotationKeyConflicts) {
    // The walk above reaches every node in `result`, keyless
    // intermediates included, so a key fallback's target `markDefs`
    // entry always has a path by the time the report is built.
    keyFallbacks.push({
      type: 'annotation-key-conflict',
      path: pathByNode.get(node)!,
    })
  }

  return {
    keyMatching: 'performed',
    preservedKeys,
    keyFallbacks,
    renamedKeys,
    ...losses,
  }
}

/**
 * Undeclared objects the returned value holds that the stored value did
 * not. A field may already hold such objects from before a schema
 * change. A result object counts as already held when a stored one in
 * the same position has the same `_type` and `_key`. A stored
 * object with no `_key` gets a fresh one from the round trip, so it
 * counts as held by a result object of the same type and content
 * instead. Each stored object is held by at most one result object.
 */
function findIntroducedUndeclaredObjects(
  stored: ReadonlyArray<PortableTextBlock>,
  result: Array<Node>,
  schema: Schema,
): Array<UndeclaredObject> {
  const held = new Map<string, number>()
  const count = (identity: string, delta: number) =>
    held.set(identity, (held.get(identity) ?? 0) + delta)
  for (const object of collectUndeclaredObjects(stored, schema)) {
    count(keyIdentity(object), 1)
  }
  const unheld = collectUndeclaredObjects(result, schema).filter((object) => {
    const identity = keyIdentity(object)
    if ((held.get(identity) ?? 0) > 0) {
      count(identity, -1)
      return false
    }
    return true
  })
  return unheld
    .filter((object) => {
      const identity = contentIdentity(object)
      if ((held.get(identity) ?? 0) > 0) {
        count(identity, -1)
        return false
      }
      return true
    })
    .map(({scope: _scope, node: _node, ...object}) => object)
}

/**
 * A stored object with no `_key` gets the content identity instead, so
 * only a result object of the same content can count as holding it.
 */
function keyIdentity(object: FoundUndeclaredObject): string {
  return object._key === undefined
    ? contentIdentity(object)
    : JSON.stringify([object.scope, object.position, object._type, object._key])
}

function contentIdentity(object: FoundUndeclaredObject): string {
  return JSON.stringify([
    object.scope,
    object.position,
    encodeNeutral(object.node, undefined),
  ])
}

type FoundUndeclaredObject = UndeclaredObject & {
  node: Node
  /**
   * Where the object sits, without keys: `[]` for a top-level block
   * object, `['children']` for an inline object, since editing a
   * paragraph can give its block a fresh key.
   */
  scope: Array<string>
}

/**
 * Collects the top-level block objects and the inline objects of
 * top-level text blocks whose type the schema does not declare. The
 * fields of a declared object are not searched: what a `json:object`
 * payload holds inside its own fields is the payload's business, the
 * same as for any other write of that object.
 */
function collectUndeclaredObjects(
  blocks: ReadonlyArray<unknown>,
  schema: Schema,
): Array<FoundUndeclaredObject> {
  const found: Array<FoundUndeclaredObject> = []
  const add = (
    node: Node,
    position: UndeclaredObject['position'],
    scope: Array<string>,
    path: ReconciliationKeyPath,
  ) =>
    found.push({
      _type: String(node['_type']),
      ...(typeof node['_key'] === 'string' && {_key: node['_key']}),
      position,
      path,
      message: degradationMessage['object-type-undeclared'](
        String(node['_type']),
        position,
      ),
      scope,
      node,
    })

  blocks.forEach((block, index) => {
    if (!isObjectNode(block)) {
      return
    }
    const blockPath = [pathSegment(block, index)]
    if (block['_type'] !== schema.block.name) {
      if (!schema.blockObjects.some(({name}) => name === block['_type'])) {
        add(block, 'block', [], blockPath)
      }
      return
    }
    const children = Array.isArray(block['children']) ? block['children'] : []
    children.forEach((child: unknown, childIndex) => {
      if (
        !isObjectNode(child) ||
        child['_type'] === schema.span.name ||
        schema.inlineObjects.some(({name}) => name === child['_type'])
      ) {
        return
      }
      add(
        child,
        'inline',
        ['children'],
        [...blockPath, 'children', pathSegment(child, childIndex)],
      )
    })
  })
  return found
}

function isObjectNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null
}

/**
 * Keeps the stored value's serialize degradations whose content the
 * returned value no longer carries, so a degradation the edit's
 * restoration repaired is not reported. Listed implies gone; the
 * reverse only holds where a stored block has a key to correspond by.
 * The indexes are built at most once per scope, so the check stays
 * linear in the document however many degradations it has.
 */
function findHiddenLosses(
  degradations: ReadonlyArray<LostContentDegradation>,
  result: Array<Node>,
  keyMatching: 'performed' | 'skipped',
): Array<SerializeDegradation> {
  if (degradations.length === 0) {
    return []
  }
  const lookup: HiddenLossLookup = {
    topLevelByKey: new Map(),
    childrenByKey: new WeakMap(),
    contentByScope: new WeakMap(),
    contentByTextBlock: new WeakMap(),
  }
  for (const node of result) {
    const key = node['_key']
    if (typeof key === 'string' && !lookup.topLevelByKey.has(key)) {
      lookup.topLevelByKey.set(key, node)
    }
  }
  return degradations
    .filter((degradation) =>
      isHiddenLoss(degradation, result, keyMatching, lookup),
    )
    .map(({type, message, path, snippet}) =>
      snippet === undefined
        ? {type, message, path}
        : {type, message, path, snippet},
    )
}

type HiddenLossLookup = {
  topLevelByKey: Map<string, Node>
  childrenByKey: WeakMap<Array<unknown>, Map<string, unknown>>
  contentByScope: WeakMap<object, CarriedContent>
  contentByTextBlock: WeakMap<Node, CarriedContent>
}

/**
 * Everything the text blocks inside one scope carry, in the shape
 * `hasLostContent` looks degradations up by.
 */
type CarriedContent = {
  annotations: Set<string>
  decorators: Set<string>
  styles: Set<unknown>
  listItems: Set<unknown>
}

function isHiddenLoss(
  degradation: LostContentDegradation,
  result: Array<Node>,
  keyMatching: 'performed' | 'skipped',
  lookup: HiddenLossLookup,
): boolean {
  const [topSegment] = degradation.path
  if (
    keyMatching === 'skipped' ||
    typeof topSegment !== 'object' ||
    topSegment === null
  ) {
    // Nothing corresponds by key: a keyless stored block's key is
    // filled in fresh, and a skipped document's keys are all fresh.
    return !hasLostContent(carriedContent(result, lookup), degradation)
  }
  const topLevelBlock = lookup.topLevelByKey.get(topSegment._key)
  if (!topLevelBlock) {
    return true
  }
  if (degradation.ownerPath === undefined) {
    // A renderer rendered a copy of the stored text block, so which
    // block held the content is unknown: search the whole top-level
    // block rather than report a loss that cannot be confirmed.
    return !hasLostContent(carriedContent(topLevelBlock, lookup), degradation)
  }
  const owner = resolveNestedPath(
    topLevelBlock,
    degradation.ownerPath.slice(1),
    lookup,
  )
  return !(
    typeof owner === 'object' &&
    owner !== null &&
    isTextBlock(owner as Node) &&
    hasLostContent(textBlockContent(owner as Node, lookup), degradation)
  )
}

function resolveNestedPath(
  root: unknown,
  path: ReadonlyArray<SerializeDegradation['path'][number]>,
  lookup: HiddenLossLookup,
): unknown {
  let current = root
  for (const segment of path) {
    if (typeof segment === 'string') {
      current =
        typeof current === 'object' && current !== null
          ? (current as Node)[segment]
          : undefined
    } else if (typeof segment === 'number') {
      current = Array.isArray(current) ? current[segment] : undefined
    } else {
      current = Array.isArray(current)
        ? childrenByKey(current, lookup).get(segment._key)
        : undefined
    }
    if (current === undefined) {
      return undefined
    }
  }
  return current
}

function childrenByKey(
  items: Array<unknown>,
  lookup: HiddenLossLookup,
): Map<string, unknown> {
  const cached = lookup.childrenByKey.get(items)
  if (cached) {
    return cached
  }
  const byKey = new Map<string, unknown>()
  for (const item of items) {
    const key =
      typeof item === 'object' && item !== null
        ? (item as Node)['_key']
        : undefined
    if (typeof key === 'string' && !byKey.has(key)) {
      byKey.set(key, item)
    }
  }
  lookup.childrenByKey.set(items, byKey)
  return byKey
}

/**
 * Merges what `scope` and every text block nested inside it carry,
 * built once per scope and reused by every degradation looked up in it.
 */
function carriedContent(
  scope: object,
  lookup: HiddenLossLookup,
): CarriedContent {
  const cached = lookup.contentByScope.get(scope)
  if (cached) {
    return cached
  }
  const content: CarriedContent = {
    annotations: new Set(),
    decorators: new Set(),
    styles: new Set(),
    listItems: new Set(),
  }
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (typeof value !== 'object' || value === null) {
      return
    }
    const node = value as Node
    if (isTextBlock(node)) {
      addTextBlockContent(node, content)
    }
    Object.values(node).forEach(visit)
  }
  visit(scope)
  lookup.contentByScope.set(scope, content)
  return content
}

function textBlockContent(
  block: Node,
  lookup: HiddenLossLookup,
): CarriedContent {
  const cached = lookup.contentByTextBlock.get(block)
  if (cached) {
    return cached
  }
  const content: CarriedContent = {
    annotations: new Set(),
    decorators: new Set(),
    styles: new Set(),
    listItems: new Set(),
  }
  addTextBlockContent(block, content)
  lookup.contentByTextBlock.set(block, content)
  return content
}

/**
 * Only real spans count as carrying a mark: an inline object's own
 * `marks` field is arbitrary data, and a definition only it references
 * still renders as nothing.
 */
function addTextBlockContent(block: Node, content: CarriedContent): void {
  content.styles.add(block['style'])
  content.listItems.add(block['listItem'])
  const carriedMarks = new Set<unknown>()
  for (const child of block['children'] as Array<unknown>) {
    const marks =
      typeof child === 'object' &&
      child !== null &&
      (child as Node)['_type'] === 'span'
        ? (child as Node)['marks']
        : undefined
    if (Array.isArray(marks)) {
      for (const mark of marks) {
        carriedMarks.add(mark)
        content.decorators.add(mark)
      }
    }
  }
  const markDefs = block['markDefs']
  if (!Array.isArray(markDefs)) {
    return
  }
  for (const markDef of markDefs) {
    if (typeof markDef !== 'object' || markDef === null) {
      continue
    }
    const {_key: key, ...definition} = markDef as Node
    if (carriedMarks.has(key)) {
      content.annotations.add(encodeDefinition(definition))
    }
  }
}

function hasLostContent(
  content: CarriedContent,
  degradation: LostContentDegradation,
): boolean {
  switch (degradation.type) {
    case 'annotation-dropped': {
      const {_key: _storedKey, ...storedDefinition} =
        degradation.markDefinition as Node
      return content.annotations.has(encodeDefinition(storedDefinition))
    }
    case 'decorator-dropped':
      return content.decorators.has(degradation.decorator)
    case 'style-fallback':
      return content.styles.has(degradation.style)
    case 'list-item-fallback':
      return content.listItems.has(degradation.listItem)
  }
}

/**
 * The same equality as `deepEqualNodes`, as a string to index by:
 * field order is noise, array order and nested `_key`s are not.
 */
function encodeDefinition(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(encodeDefinition).join(',')}]`
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Node)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(
        ([field, fieldValue]) =>
          `${JSON.stringify(field)}:${encodeDefinition(fieldValue)}`,
      )
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

/**
 * Field order is noise here, matching the fingerprints this module
 * compares on, while array order is part of the value.
 */
function deepEqualNodes(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false
    }
    return a.every((item, index) => deepEqualNodes(item, b[index]))
  }
  if (
    typeof a === 'object' &&
    a !== null &&
    typeof b === 'object' &&
    b !== null
  ) {
    const aRecord = a as Record<string, unknown>
    const bRecord = b as Record<string, unknown>
    const aFields = Object.keys(aRecord)
    const bFields = Object.keys(bRecord)
    if (aFields.length !== bFields.length) {
      return false
    }
    return aFields.every(
      (field) =>
        Object.hasOwn(bRecord, field) &&
        deepEqualNodes(aRecord[field], bRecord[field]),
    )
  }
  return false
}
