---
name: feature-map
description: Where each feature of the Portable Text Editor monorepo is specified, implemented, and tested. Use before changing or debugging a feature to find its Gherkin spec, its main source, and its canonical test suite, and when triaging a bug report to the right spec and code. Covers the core editor features grouped by area and one line per package in `packages/`.
---

# Feature map

## How to use it

1. Find the feature below.
2. Read the spec for the intended behavior. Core specs are Gherkin `.feature` files in `packages/editor/gherkin-spec/`, run by the test files in `packages/editor/gherkin-tests/` against the shared step definitions in `packages/editor/src/test/vitest/step-definitions.tsx`. Editor-local plugin integration specs, such as `packages/editor/gherkin-tests/plugin.structured-lists.feature`, sit in `packages/editor/gherkin-tests/` next to the test file that runs them. A spec family shares one test file named after the family: `packages/editor/gherkin-tests/annotations.test.ts` runs the five `annotations*.feature` specs other than `annotations-collaboration.feature`, and `packages/editor/gherkin-tests/decorators.test.ts` also runs `decorators-overlapping.feature`. A feature without a spec is specified by its browser suites, its unit suites, or both.
3. Open the source. Paths are starting points, not exhaustive lists.
4. Run the canonical suite, filtered by file name: `pnpm --filter @portabletext/editor test:browser:chromium event.decorator.toggle` for a browser suite, `pnpm --filter @portabletext/editor test:unit selector.get-active-style` for a unit suite. A fresh checkout needs its dependencies built first (see `./AGENTS.md`).

Test placement and the file extension convention live in the `writing-tests` skill (`.agents/skills/writing-tests/SKILL.md`). In `packages/editor` the browser project also runs the `.test.ts` files under `packages/editor/tests/`, `packages/editor/gherkin-tests/`, and `packages/editor/src/editor/` (see `packages/editor/vitest.config.ts`).

`pnpm check:feature-map` fails when a path in this file no longer exists. It checks backticked paths without spaces, written from the repo root: starting with `packages/`, `apps/`, `.agents/`, or `.github/`, or with `./` for a root file such as `./AGENTS.md`. Write every path that way, since the check reads anything else as prose. Moving or deleting a file named here means updating this map in the same change.

## How an edit flows

Most features follow one path, so a bug usually sits at one of these steps:

1. Native DOM events become behavior events. `packages/editor/src/engine/react/components/editable.tsx` translates `beforeinput` (typing, deleting, breaks, IME composition) and syncs the DOM selection. `packages/editor/src/editor/Editable.tsx` (`PortableTextEditable`) handles clipboard, mouse, focus, and drag events. Keyboard handling is split between the two. The engine's `onKeyDown` in `editable.tsx` ignores a keydown entirely while the editor is read-only or when the target is not editable. Otherwise it calls the `Editable.tsx` handler, which runs the consumer's `onKeyDown`, then the legacy `hotkeys` (`packages/editor/src/editor/perform-hotkey.ts`), and sends the keydown as a `keyboard.keydown` behavior event only when neither prevented it. When the keydown is still not prevented, not stopped, and not part of an IME composition after that, the engine moves the caret by line and word itself and, in browsers without `beforeinput` support (`HAS_BEFORE_INPUT_SUPPORT` in `packages/editor/src/engine/dom/utils/environment.ts`), guesses the intent from the key and sends `insert.break`, `insert.soft break`, `delete.backward`, and their siblings.
2. `packages/editor/src/behaviors/behavior.perform-event.ts` runs the event through the registered Behaviors (consumer Behaviors and the core ones listed in `packages/editor/src/behaviors/behavior.core.ts`, sorted by priority), then the abstract Behaviors in `packages/editor/src/behaviors/behavior.abstract.ts`, which reduce high-level events to smaller ones.
3. A synthetic event no Behavior claims (`insert.text`, `delete`, `insert.block`, `select`, `decorator.add`, and the other events the abstract Behaviors reduce to) runs as an operation: `packages/editor/src/operations/operation.perform.ts` dispatches to one `operation.*.ts` file per operation. An unclaimed native event (`keyboard.*`, `clipboard.*`, `drag.*`, `mouse.click`, `input.*`) or custom event runs no operation and leaves the DOM event alone.
4. The engine in `packages/editor/src/engine/` applies each operation to the tree and transforms the selection along with it (`packages/editor/src/engine/core/apply-operation.ts`, for local and remote operations alike), normalizes (`packages/editor/src/engine/core/normalize-node.ts`), then the editor turns the operations into patches and emitted events.

## Behavior API

- Source: `packages/editor/src/behaviors/behavior.types.behavior.ts` (`defineBehavior`), `packages/editor/src/behaviors/behavior.types.action.ts` (`raise`, `forward`, `execute`, `effect`), `packages/editor/src/behaviors/behavior.perform-event.ts` (runs guards and actions, claims or leaves the native event, aborts event chains past a maximum depth), `packages/editor/src/editor/create-editor.ts` (`registerBehavior`, which ranks consumer Behaviors above the core ones), `packages/editor/src/plugins/plugin.behavior.tsx` (`BehaviorPlugin`), `packages/editor/src/priority/` (the priority graph that orders Behaviors, applied by the `sort behaviors` action in `packages/editor/src/editor/editor-machine.ts`)
- Tests: `packages/editor/tests/behavior-api.test.tsx` (the canonical suite for Behavior API contracts), `packages/editor/tests/behavior.native-event-prevented.test.tsx`, `packages/editor/tests/behavior-event-chain-depth.test.tsx`, `packages/editor/tests/behavior.snapshot-leak.test.tsx` (the snapshot keys guards and actions receive), `packages/editor/src/priority/priority.sort.test.ts`

## Editing text

### Text input and typing

- Spec: `packages/editor/gherkin-spec/insert.text.feature`
- Source: `packages/editor/src/engine/react/components/editable.tsx` (the `beforeinput` translation), `packages/editor/src/engine/react/hooks/android-input-manager/`, `packages/editor/src/behaviors/behavior.abstract.input.ts` (`input.*` events carrying a `DataTransfer`), `packages/editor/src/behaviors/behavior.core.insert.ts` (typing with a changed mark state), `packages/editor/src/behaviors/behavior.abstract.insert.ts` (`insert.text` deletes an expanded selection first, steps past a selected inline object first, and selects the end of the last block first when there is no selection), `packages/editor/src/operations/operation.insert.text.ts`
- Tests: `packages/editor/tests/event.insert.text.test.tsx`, `packages/editor/tests/event.input.test.tsx`, `packages/editor/tests/event.input.replacement-text.test.tsx`, `packages/editor/tests/composition.test.ts` (IME)

### Decorators

- Spec: `packages/editor/gherkin-spec/decorators.feature`, `packages/editor/gherkin-spec/decorators-overlapping.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.decorator.ts`, `packages/editor/src/behaviors/behavior.core.decorators.ts` (default shortcuts), `packages/editor/src/operations/operation.decorator.add.ts`, `packages/editor/src/operations/operation.decorator.remove.ts`, `packages/editor/src/selectors/selector.is-active-decorator.ts`, `packages/editor/src/selectors/selector.get-mark-state.ts`
- Tests: `packages/editor/tests/event.decorator.toggle.test.tsx`, `packages/editor/tests/event.decorator.add.test.tsx`, `packages/editor/tests/event.decorator.remove.test.tsx`, `packages/editor/tests/mark-model.test.tsx`, `packages/editor/tests/schema-less-marks.test.tsx`

### Annotations

- Spec: `packages/editor/gherkin-spec/annotations.feature`, `packages/editor/gherkin-spec/annotations-across-blocks.feature`, `packages/editor/gherkin-spec/annotations-edge-cases.feature`, `packages/editor/gherkin-spec/annotations-overlapping.feature`, `packages/editor/gherkin-spec/annotations-overlapping-decorators.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.annotation.ts`, `packages/editor/src/behaviors/behavior.core.annotations.ts` (collapsed-selection add, keeping annotations of the same type from overlapping, and stripping the annotations from a span whose text is deleted in full when no adjacent span shares them), `packages/editor/src/operations/operation.annotation.add.ts`, `packages/editor/src/operations/operation.annotation.remove.ts`, `packages/editor/src/selectors/selector.is-active-annotation.ts`
- Tests: `packages/editor/tests/event.annotation.add.test.tsx`, `packages/editor/tests/event.annotation.remove.test.tsx`, `packages/editor/tests/event.annotation.toggle.test.tsx`, `packages/editor/tests/overlapping-annotations.test.tsx`

`packages/editor/gherkin-tests/registered-decorator-annotation-renders.test.tsx` runs the decorator and annotation specs a second time with registered renderers mounted.

### Block styles

- Source: `packages/editor/src/behaviors/behavior.abstract.style.ts`, `packages/editor/src/selectors/selector.get-active-style.ts`
- Tests: `packages/editor/tests/event.style.toggle.test.tsx`, `packages/editor/src/selectors/selector.get-active-style.test.ts`

## Blocks and objects

### Block objects

- Spec: `packages/editor/gherkin-spec/block-objects.feature`
- Source: `packages/editor/src/behaviors/behavior.core.block-objects.ts` (arrow keys and clicks around a lonely block object, Enter on a block object, deleting an adjacent empty text block), `packages/editor/src/editor/render.block-object.tsx`
- Tests: `packages/editor/tests/click-lonely-block-object-container.test.tsx`, `packages/editor/tests/define-leaf-block-object-wrapper.test.tsx`, `packages/editor/tests/event.delete.block.test.tsx`

### Inline objects

- Spec: `packages/editor/gherkin-spec/inline-objects.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.insert.ts` (`insert.inline object`, `insert.child`), `packages/editor/src/operations/operation.insert.child.ts`, `packages/editor/src/behaviors/behavior.core.insert-break.ts` (breaking on an inline object), `packages/editor/src/editor/render.inline-object.tsx`
- Tests: `packages/editor/tests/inline-objects.test.tsx`, `packages/editor/tests/event.insert.inline-object.test.tsx`, `packages/editor/tests/inline-object-contenteditable.test.tsx`

### Lists

- Spec: `packages/editor/gherkin-spec/lists.feature`, plus `packages/editor/gherkin-tests/plugin.structured-lists.feature` for list items modeled as containers
- Source: `packages/editor/src/behaviors/behavior.core.lists.ts` (Tab indentation, Shift+Tab unindentation, Backspace and Enter clearing, inheriting list properties), `packages/editor/src/behaviors/behavior.abstract.list-item.ts`, `packages/editor/src/selectors/selector.is-active-list-item.ts`, `packages/editor/gherkin-tests/plugin.structured-lists.test.tsx` (the test plugin that indents and unindents list items modeled as containers)
- Tests: `packages/editor/tests/event.list-item.add.test.tsx`, `packages/editor/tests/selector.is-active-list-item.test.tsx`, `packages/editor/tests/recursive-schema.test.tsx` (nested lists modeled as containers, lists inside list items, not flat `level` lists)

### Splitting blocks and Enter

- Spec: `packages/editor/gherkin-spec/splitting-blocks.feature`, `packages/editor/gherkin-spec/insert.break.feature`
- Source: `packages/editor/src/behaviors/behavior.core.insert-break.ts`, `packages/editor/src/behaviors/behavior.abstract.split.ts` (a collapsed split mid-text deletes the rest of the block and inserts it as a new block after, a split at the block end only inserts an empty block, an expanded selection between two text blocks is deleted and then split only when it neither starts at a block start nor ends at a block end, an expanded selection touching an object is only deleted, and a split with a collapsed selection on a block object or inline object does nothing), `packages/editor/src/operations/operation.insert.block.ts`
- Tests: `packages/editor/tests/event.split.test.tsx`, `packages/editor/tests/unique-sibling-keys.test.tsx`

### Soft breaks

- Spec: the soft-splitting scenarios in `packages/editor/gherkin-spec/splitting-blocks.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.keyboard.ts` (Shift+Enter, the `lineBreak` shortcut, raises `insert.soft break`), `packages/editor/src/engine/react/components/editable.tsx` (`insertLineBreak` input), `packages/editor/src/behaviors/behavior.abstract.insert.ts` (`insert.soft break` becomes `insert.text` with a `\n`)
- Tests: `packages/editor/tests/composition.test.ts` (composing after a soft break), `packages/editor/tests/undo-redo-collaboration.test.tsx`

### Merging blocks

- Spec: the merge scenarios in `packages/editor/gherkin-spec/delete.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.delete.ts` (Backspace at the start or Delete at the end of a text block next to another text block deletes the following block and inserts it into the preceding one, and Delete in an empty text block removes that block and selects the next one), `packages/editor/src/internal-utils/delete-internal.ts` (an expanded delete across sibling blocks under the same parent merges the end text block into the start text block, removes object endpoints instead of merging them, and keeps blocks under different parents separate), `packages/editor/src/internal-utils/apply-merge-node.ts`, `packages/editor/src/internal-utils/plan-merge-key-renames.ts`
- Tests: `packages/editor/tests/block-merge-duplicate-keys.test.tsx`, `packages/editor/tests/undo-merge-blocks.test.tsx`

### Moving blocks

- Source: `packages/editor/src/behaviors/behavior.abstract.move.ts` (`move.block` becomes `unset` plus `insert`)
- Tests: `packages/editor/tests/event.move.block.test.tsx`, `packages/editor/tests/event.move.block.selection.test.tsx`, `packages/editor/tests/event.move.block.cross-container.test.tsx`

### Setting and unsetting properties

- Source: `packages/editor/src/operations/operation.block.set.ts`, `packages/editor/src/operations/operation.block.unset.ts`, `packages/editor/src/operations/operation.child.set.ts`, `packages/editor/src/operations/operation.child.unset.ts`, `packages/editor/src/operations/operation.set.ts`, `packages/editor/src/operations/operation.unset.ts`
- Tests: `packages/editor/tests/event.block.set.test.tsx`, `packages/editor/tests/event.block.unset.test.tsx`, `packages/editor/tests/event.child.set.test.tsx`, `packages/editor/tests/event.child.unset.test.tsx`, `packages/editor/tests/event.set.test.tsx`, `packages/editor/tests/event.unset.test.tsx`

## Deleting

- Spec: `packages/editor/gherkin-spec/delete.feature`, `packages/editor/gherkin-spec/removing-blocks.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.delete.ts`, `packages/editor/src/operations/operation.delete.ts`, `packages/editor/src/internal-utils/delete-collapsed.ts`, `packages/editor/src/internal-utils/delete-range.ts`, `packages/editor/src/internal-utils/delete-internal.ts`
- Tests: `packages/editor/tests/event.delete.test.tsx`, `packages/editor/tests/event.delete.backward.test.tsx`, `packages/editor/tests/event.delete.forward.test.tsx`, `packages/editor/tests/event.delete.matrix.test.tsx`

## Insert events

- Spec: `packages/editor/gherkin-spec/insert.block.feature`, `packages/editor/gherkin-spec/insert.blocks.feature`, `packages/editor/gherkin-spec/insert.child.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.insert.ts`, `packages/editor/src/operations/operation.insert.block.ts`, `packages/editor/src/operations/operation.insert.child.ts`, `packages/editor/src/operations/operation.insert.ts`, `packages/editor/src/behaviors/fit-blocks-to-destination.ts` (reshapes pasted or dropped blocks for their destination)
- Tests: `packages/editor/tests/event.insert.test.tsx`, `packages/editor/tests/event.insert.block.test.tsx`, `packages/editor/tests/event.insert.blocks.test.tsx`, `packages/editor/tests/event.insert.child.test.tsx`, `packages/editor/tests/event.insert.span.test.tsx`, `packages/editor/tests/insert-respects-sub-schema.test.tsx`, `packages/editor/src/behaviors/fit-blocks-to-destination.test.ts`

## Clipboard, paste, and drag and drop

### Copy, cut, and paste

- Spec: `packages/editor/gherkin-spec/paste.feature`, plus the cut scenarios in `packages/editor/gherkin-spec/delete.feature`
- Source: `packages/editor/src/editor/Editable.tsx` (clipboard handlers), `packages/editor/src/behaviors/behavior.abstract.ts` (`clipboard.*` into `serialize` and `deserialize`), `packages/editor/src/behaviors/behavior.abstract.serialize.ts`, `packages/editor/src/behaviors/behavior.abstract.deserialize.ts`, `packages/editor/src/converters/` (one converter per MIME type, `text/html` serialized through `@portabletext/to-html` and deserialized through `@portabletext/html`)
- Tests: `packages/editor/tests/event.paste.test.tsx`, `packages/editor/tests/serialize-deserialize.test.tsx`, `packages/editor/tests/text-plain-paste.test.tsx`, `packages/editor/tests/upload-images-on-paste.test.tsx`, plus the converter unit suites in `packages/editor/src/converters/`

### Drag and drop

- Source: `packages/editor/src/editor/Editable.tsx` (drag handlers), `packages/editor/src/behaviors/behavior.core.dnd.ts`, `packages/editor/src/selectors/drag-selection.ts`, `packages/editor/src/internal-utils/event-position.ts` (the block a drag or mouse event lands on, telling the editor root and container chrome apart from blocks)
- Tests: `packages/editor/tests/event.drag.drop.test.tsx`, `packages/editor/tests/event.drag.drop.self-drop.test.tsx`, `packages/editor/tests/event.drag.test.tsx`, `packages/editor/tests/event.drag.dragstart-container-chrome.test.tsx`, `packages/editor/src/selectors/drag-selection.test.ts`

## Selection and focus

### Selection

- Spec: `packages/editor/gherkin-spec/selection.feature`
- Source: `packages/editor/src/engine/react/components/editable.tsx` (DOM `selectionchange` to model and back), `packages/editor/src/engine/dom/plugin/dom-editor.ts` (conversion between DOM ranges and editor selections), `packages/editor/src/operations/operation.select.ts`, `packages/editor/src/behaviors/behavior.abstract.select.ts`, `packages/editor/src/editor/validate-selection-machine.ts`, `packages/editor/src/editor/selection-state-context.tsx` (focused and selected state for renderers)
- Tests: `packages/editor/tests/event.select.test.tsx`, `packages/editor/tests/selection-validation.test.tsx`, `packages/editor/tests/select-all.test.tsx`, `packages/editor/tests/selection-scroll-into-view.test.tsx`

### Focus

- Source: `packages/editor/src/editor/Editable.tsx` (focus and blur handlers), `packages/editor/src/editor/editor-machine.ts` (`focus` and `blur` events)
- Tests: `packages/editor/tests/event.focus.test.tsx`, `packages/editor/tests/focus.test.tsx`

### Selectors and traversal

- Source: `packages/editor/src/selectors/` (one `selector.*.ts` file per public selector), `packages/editor/src/traversal/`, `packages/editor/src/utils/`, `packages/editor/src/editor/editor-selector.ts` (`useEditorSelector`)
- Tests: colocated unit suites cover some selectors, traversal functions, and utils. The browser suites are `packages/editor/tests/focus-selectors.test.tsx`, `packages/editor/tests/selector.get-fragment.test.tsx`, `packages/editor/tests/selector.is-active-list-item.test.tsx`, `packages/editor/tests/use-editor-selector-regression.test.tsx`, `packages/editor/tests/use-editor-selector.coalesce.test.tsx`, and `packages/editor/tests/block-selectors-container.test.tsx` with its `*-selectors-container` siblings for selection inside containers

## Undo and redo

- Spec: `packages/editor/gherkin-spec/undo-redo.feature`
- Source: `packages/editor/src/editor/subscriber.history.ts` (records undo steps and the remote patches that arrive after them), `packages/editor/src/editor/undo-step.ts`, `packages/editor/src/operations/operation.history.undo.ts` and `packages/editor/src/operations/operation.history.redo.ts` (rebase the step against those remote patches at undo or redo time), `packages/editor/src/internal-utils/transform-operation.ts` (`transformOperation`, the rebase itself)
- Tests: `packages/editor/tests/event.history.undo.test.tsx`, `packages/editor/tests/event.history.redo.test.tsx`, `packages/editor/tests/history.preserving-keys.test.tsx`, `packages/editor/tests/no-op-history-skip.test.tsx`

## Collaboration and remote patches

- Spec: `packages/editor/gherkin-spec/annotations-collaboration.feature`, `packages/editor/gherkin-spec/selection-adjustment.feature`
- Source: `packages/editor/src/editor/remote-patches.ts` (applies incoming patches), `packages/editor/src/internal-utils/applyPatch.ts`, `packages/editor/src/engine-plugins/engine-plugin.remote-changes.ts`, `packages/editor/src/engine/core/apply-operation.ts` (the engine's general operation applier, which also moves the selection when a remote operation shifts content around it), `packages/editor/src/editor/subscriber.patch-generation.ts` and `packages/editor/src/internal-utils/operation-to-patches.ts` (outgoing patches)
- Tests: `packages/editor/tests/collaborative-editing.test.tsx`, `packages/editor/tests/selection-after-remote-patches.test.tsx`, `packages/editor/tests/undo-redo-collaboration.test.tsx`, `packages/editor/tests/remote-patches.cosmetic-normalization.test.tsx`, `packages/editor/tests/event.patches.test.tsx`

## Value sync and the host contract

- Source: `packages/editor/src/editor.ts` (the public `Editor` type and the `update value` contract), `packages/editor/src/editor/editor-provider.tsx` (`EditorProvider`), `packages/editor/src/editor/sync-machine.ts` (reconciles incoming values, emits `invalid value` and `value changed`), `packages/editor/src/editor/relay.ts` (the `EditorEmittedEvent` union), `packages/editor/src/editor/mutation-batcher.ts` (`mutation` events), `packages/editor/src/plugins/plugin.event-listener.tsx`
- Tests: `packages/editor/tests/event.update-value.test.tsx`, `packages/editor/tests/editor-value-adoption.test.tsx`, `packages/editor/tests/event.mutation.test.tsx`, `packages/editor/tests/event.patch.test.tsx`, `packages/editor/tests/event.value-changed.test.tsx`, `packages/editor/tests/event.ready.test.tsx`, `packages/editor/tests/validation.test.tsx`

The legacy `PortableTextEditor` class API lives in `packages/editor/src/editor/PortableTextEditor.tsx` and `packages/editor/src/editor/create-editable-api.ts`.

## Read-only

- Source: `packages/editor/src/editor/editor-machine.ts` (the `edit mode` states, which let only the `clipboard.copy`, `mouse.click`, `serialize`, `serialization.success`, `serialization.failure`, and `select` behavior events through while read-only), `packages/editor/src/editor/create-editor.ts` (`update readOnly`), `packages/editor/src/engine/react/components/editable.tsx` (sets `contentEditable={false}` and drops keyboard, input, and paste handling while read-only, but keeps syncing a DOM selection inside the editor so text can be selected and copied), `packages/editor/src/editor/Editable.tsx` (no drag start while read-only)
- Tests: `packages/editor/tests/selection-readonly-sync.test.tsx`, `packages/editor/tests/event.mutation.test.tsx` (mutations deferred while read-only)

## Schema and normalization

- Source: `packages/schema/src/define-schema.ts` and `packages/schema/src/compile-schema.ts` (schema definition), `packages/schema/src/get-sub-schema.ts` (`getSubSchema`, the schema a container field's `of` declaration resolves to), `packages/editor/src/traversal/get-path-sub-schema.ts` (the schema that applies at a path, built on `getSubSchema`), `packages/editor/src/selectors/selector.get-applicable-schema.ts`, `packages/editor/src/engine/core/normalize-node.ts` (missing `_type`, `_key`, and children, duplicate keys, span merging), `packages/editor/src/internal-utils/validateValue.ts`
- Tests: `packages/editor/tests/normalization.test.tsx`, `packages/editor/tests/self-solving.test.tsx`, `packages/editor/tests/setup.test.tsx`, `packages/editor/tests/insert-respects-sub-schema.test.tsx`, `packages/editor/tests/recursive-schema.test.tsx`, `packages/editor/tests/container-normalization.test.tsx` and `packages/editor/tests/schema-no-intermediate-row.test.tsx` (normalization inside containers), `packages/schema/src/get-sub-schema.test.ts`

### The placeholder block

- Source: `packages/editor/src/internal-utils/create-placeholder-block.ts` (the empty text block, with the container's default style inside a container), `packages/editor/src/engine/core/normalize-node.ts` (inserts it without patches when the value empties), `packages/editor/src/internal-utils/field-lifecycle-patches.ts` (on the first edit, adds the `setIfMissing` and `insert` patches that create the field with the placeholder in it, and adds `unset([])` when an edit's own result is the placeholder, so a placeholder that normalization inserts afterwards, for example after deleting the last block object, emits no `unset`), `createDecorate` in `packages/editor/src/editor/range-decorations-machine.ts` and `packages/editor/src/editor/render.leaf.tsx` (show `renderPlaceholder` on it)
- Tests: `packages/editor/tests/placeholder-block.test.tsx`, `packages/editor/src/internal-utils/field-lifecycle-patches.test.ts`

## Containers and nesting

- Source: `packages/editor/src/schema/` (resolving which registered container applies at a path), `packages/editor/src/behaviors/behavior.core.containers.ts` (arrow keys and Enter escaping a container), `packages/editor/src/behaviors/behavior.core.block-objects.ts` (clicks above or below a container), `packages/editor/src/internal-utils/unwrap-container.ts` (deleting in an empty container), `packages/editor/src/editor/render.container.tsx`, `defineContainer` in `packages/editor/src/renderers/renderer.types.ts`
- Tests: `packages/editor/tests/container-rendering.test.tsx`, `packages/editor/tests/container-resolution-rules.test.tsx`, `packages/editor/tests/container-normalization.test.tsx`, `packages/editor/tests/container-enter-escape.test.tsx`, `packages/editor/tests/container-edge-escape.test.tsx`, `packages/editor/tests/delete-empty-container.test.tsx`, `packages/editor/tests/backspace-before-container.test.tsx`, `packages/editor/tests/container-typing.test.tsx`, `packages/editor/tests/cross-container-range-delete.test.tsx`, `packages/editor/tests/tables.test.tsx`, `packages/editor/tests/code-block.test.tsx`

## Rendering

- Source: `packages/editor/src/renderers/renderer.types.ts` (the `defineX` node factories), `packages/editor/src/plugins/plugin.node.tsx` (`NodePlugin`), `packages/editor/src/editor/register-node-on-engine.ts`, `packages/editor/src/editor/render.element.tsx` (dispatch to `render.text-block.tsx`, `render.container.tsx`, `render.block-object.tsx`, `render.inline-object.tsx`), `packages/editor/src/editor/render.leaf.tsx`, `packages/editor/src/editor/find-positional-override.ts`
- Tests: `packages/editor/tests/render-block.test.tsx`, `packages/editor/tests/render-child.test.tsx`, `packages/editor/tests/dom-structure.test.tsx`, `packages/editor/tests/positional-override-block-level.test.tsx` and its `positional-override-*` siblings, `packages/editor/tests/render-count-regression.test.tsx`

### `editor.dom`

- Source: `packages/editor/src/editor/editor-dom.ts` (DOM lookups for the current snapshot: block and child nodes, selection rect, point at coordinates), wired up in `packages/editor/src/editor/create-editor.ts`
- Tests: `packages/editor/tests/editor-dom-selection-rect.test.tsx`, `packages/editor/tests/editor-dom-point-at-coordinates.test.tsx`

### Range decorations

- Source: `packages/editor/src/editor/range-decorations-machine.ts`, `packages/editor/src/editor/range-decorations-registration.ts`, `packages/editor/src/define-decoration.ts`
- Tests: `packages/editor/tests/range-decorations.test.tsx`, `packages/editor/tests/range-decorations-registration.test.tsx`, `packages/editor/src/editor/range-decorations-machine.test.ts`

## Keyboard shortcuts

- Source: `packages/editor/src/editor/default-keyboard-shortcuts.ts` (built on `@portabletext/keyboard-shortcuts`), `packages/editor/src/behaviors/behavior.abstract.keyboard.ts` (Enter, Backspace, Delete, undo, redo, select-all), `packages/editor/src/behaviors/behavior.core.decorators.ts`, `packages/editor/src/editor/perform-hotkey.ts` (the legacy `hotkeys` prop)
- Tests: `packages/editor/tests/event.keyboard.keydown.test.tsx`, `packages/editor/tests/event.decorator.toggle.shortcut.test.tsx`

## Other packages

- `packages/block-tools/`: Sanity-flavored HTML to Portable Text, wrapping `@portabletext/html`. Source `packages/block-tools/src/index.ts`, tests in `packages/block-tools/test/`.
- `packages/html/`: HTML to Portable Text with Google Docs, Word, and Notion support. Source `packages/html/src/index.ts`, tests in `packages/html/src/tests/`.
- `packages/keyboard-shortcuts/`: platform-aware keyboard shortcut definitions. Source `packages/keyboard-shortcuts/src/index.ts`, tests `packages/keyboard-shortcuts/src/is-keyboard-shortcut.test.ts`.
- `packages/markdown/`: Portable Text to and from Markdown, plus `applyMarkdownEdit`, which turns edited Markdown back into Portable Text restoring stored keys and the fields Markdown cannot express on the content it can match, and falling back to fresh keys when matching fails. Source `packages/markdown/src/index.ts` and `packages/markdown/src/apply-markdown-edit.ts`, tests next to the source in `packages/markdown/src/`, with `packages/markdown/src/apply-markdown-edit.test.ts` for `applyMarkdownEdit`.
- `packages/patches/`: applies Sanity patches to a value. Source `packages/patches/src/index.ts`, tests `packages/patches/src/apply-patch.test.ts`.
- `packages/plugin-character-pair-decorator/`: decorates text between a matched pair of characters. Spec `packages/plugin-character-pair-decorator/src/backspace.feature`, source `packages/plugin-character-pair-decorator/src/index.ts`, tests next to the source.
- `packages/plugin-decorations/`: composes independent decoration layers. Source `packages/plugin-decorations/src/index.ts`, tests `packages/plugin-decorations/src/decorations-registration.test.tsx`.
- `packages/plugin-dnd/`: tracks the drop position for custom drop indicators. Source `packages/plugin-dnd/src/index.ts`, tests `packages/plugin-dnd/src/plugin.dnd.test.tsx`.
- `packages/plugin-emoji-picker/`: emoji picker. Spec `packages/plugin-emoji-picker/src/emoji-picker.feature`, source `packages/plugin-emoji-picker/src/index.ts`, tests `packages/plugin-emoji-picker/src/emoji-picker.test.tsx`.
- `packages/plugin-input-rule/`: input rules that transform typed text. Specs `packages/plugin-input-rule/src/edge-cases.feature` and three more `.feature` files beside it, source `packages/plugin-input-rule/src/index.ts`, tests next to the source.
- `packages/plugin-list-index/`: computes list item indexes for custom list rendering. Source `packages/plugin-list-index/src/index.ts`, tests next to the source.
- `packages/plugin-markdown-shortcuts/`: Markdown shortcuts. Specs `packages/plugin-markdown-shortcuts/src/behavior.markdown.feature` and `packages/plugin-markdown-shortcuts/src/rule.markdown-link.feature`, source `packages/plugin-markdown-shortcuts/src/index.ts`, tests next to the source.
- `packages/plugin-one-line/`: keeps the editor to a single text block. Enter deletes an expanded selection and otherwise does nothing, an inserted text block merges into the focus block, inserted text blocks merge into one, non-text blocks are dropped, `insert.block` with a `before` or `after` placement is dropped, and `insert.blocks` ignores the requested placement and inserts with `auto`. Soft breaks are not blocked, so Shift+Enter still inserts a line break. Source `packages/plugin-one-line/src/plugin.one-line.tsx`, no tests.
- `packages/plugin-paste-link/`: pasting a URL creates a link. Spec `packages/plugin-paste-link/src/paste-link.feature`, source `packages/plugin-paste-link/src/index.ts`, tests `packages/plugin-paste-link/src/paste-link.test.tsx`.
- `packages/plugin-sdk-value/`: connects the editor to a Sanity document through the SDK, with presence and comments. Source `packages/plugin-sdk-value/src/index.ts`, tests next to the source.
- `packages/plugin-table/`: tables as Portable Text with spreadsheet-style selection. Source `packages/plugin-table/src/index.ts`, tests in `packages/plugin-table/src/behaviors/` and next to the source.
- `packages/plugin-typeahead-picker/`: typeahead pickers (emoji, mentions, slash commands). Specs `packages/plugin-typeahead-picker/src/typeahead-picker.feature` and five more `.feature` files beside it, source `packages/plugin-typeahead-picker/src/index.ts`, tests next to the source.
- `packages/plugin-typography/`: typographic input rules (smart quotes, em dash, ellipsis). Specs `packages/plugin-typography/src/input-rule.smart-quotes.feature` and four more `.feature` files beside it, source `packages/plugin-typography/src/index.ts`, tests next to the source.
- `packages/racejar/`: the Gherkin driver behind every `.feature` suite. Source `packages/racejar/src/index.ts`, examples in `packages/racejar/example/`.
- `packages/sanity-bridge/`: converts a Sanity schema to a Portable Text schema. Source `packages/sanity-bridge/src/index.ts`, tests next to the source.
- `packages/schema/`: the Portable Text schema (`defineSchema`, `compileSchema`). Source `packages/schema/src/index.ts`, tests next to the source.
- `packages/test/`: test utilities (`createTestKeyGenerator`, textspec). Source `packages/test/src/index.ts`, tests `packages/test/src/terse-pt.test.ts`.
- `packages/toolbar/`: hooks for building a toolbar. Source `packages/toolbar/src/index.ts`, tests next to the source.
