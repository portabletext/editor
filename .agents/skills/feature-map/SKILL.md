---
name: feature-map
description: Where each feature of the Portable Text Editor monorepo is specified, implemented, and tested. Use before changing or debugging a feature to find its Gherkin spec, its main source, and the test suites to start from, and when triaging a bug report to the right spec and code. Covers the core editor features grouped by area and one line per package in `packages/`.
---

# Feature map

## How to use it

1. Find the feature below.
2. Read the spec for the intended behavior. Core specs are Gherkin `.feature` files in `packages/editor/gherkin-spec/`, run by the test files in `packages/editor/gherkin-tests/` against the shared step definitions in `packages/editor/src/test/vitest/step-definitions.tsx`. Editor-local plugin integration specs, such as `packages/editor/gherkin-tests/plugin.structured-lists.feature`, sit in `packages/editor/gherkin-tests/` next to the test file that runs them. A spec family shares one test file named after the family: `packages/editor/gherkin-tests/annotations.test.ts` runs the five `annotations*.feature` specs other than `annotations-collaboration.feature`, and `packages/editor/gherkin-tests/decorators.test.ts` also runs `decorators-overlapping.feature`. A feature without a spec is specified by its browser suites, its unit suites, or both.
3. Open the source. Paths are starting points, not exhaustive lists.
4. Run the suites, filtered by file name: `pnpm --filter @portabletext/editor test:browser:chromium event.decorator.toggle` for a browser suite, `pnpm --filter @portabletext/editor test:unit selector.get-active-style` for a unit suite. The listed suites are where to start, not full coverage of the feature. A fresh checkout needs its dependencies built first (see `./AGENTS.md`).

Test placement and the file extension convention live in the `writing-tests` skill (`.agents/skills/writing-tests/SKILL.md`). In `packages/editor` the browser project also runs the `.test.ts` files under `packages/editor/tests/`, `packages/editor/gherkin-tests/`, and `packages/editor/src/editor/` (see `packages/editor/vitest.config.ts`).

This map is navigation only. The specs and tests are the account of how each feature behaves.

`pnpm check:feature-map` fails when a path in this file no longer exists. It checks backticked paths without spaces, written from the repo root: starting with `packages/`, `apps/`, `.agents/`, or `.github/`, or with `./` for a root file such as `./AGENTS.md`. Write every path that way, since the check reads anything else as prose. Moving or deleting a file named here means updating this map in the same change. The author of any change that affects an entry updates that entry, and the reviewer confirms it.

## Behavior API

- Source: `packages/editor/src/behaviors/behavior.types.behavior.ts` (`defineBehavior`), `packages/editor/src/behaviors/behavior.types.action.ts` (`raise`, `forward`, `execute`, `effect`), `packages/editor/src/behaviors/behavior.perform-event.ts` (event dispatch through Behaviors), `packages/editor/src/behaviors/behavior.core.ts` (core Behaviors), `packages/editor/src/behaviors/behavior.abstract.ts` (abstract Behaviors), `packages/editor/src/operations/operation.perform.ts` (operation dispatch), `packages/editor/src/editor/create-editor.ts` (`registerBehavior`), `packages/editor/src/plugins/plugin.behavior.tsx` (`BehaviorPlugin`), `packages/editor/src/priority/` (Behavior priorities), `packages/editor/src/editor/editor-machine.ts` (the `sort behaviors` action)
- Tests: `packages/editor/tests/behavior-api.test.tsx`, `packages/editor/tests/behavior.native-event-prevented.test.tsx`, `packages/editor/tests/behavior-event-chain-depth.test.tsx`, `packages/editor/tests/behavior.snapshot-leak.test.tsx`, `packages/editor/src/priority/priority.sort.test.ts`

## Editing text

### Text input and typing

- Spec: `packages/editor/gherkin-spec/insert.text.feature`
- Source: `packages/editor/src/engine/react/components/editable.tsx` (the `beforeinput` translation), `packages/editor/src/engine/react/hooks/android-input-manager/`, `packages/editor/src/behaviors/behavior.abstract.input.ts` (`input.*` events), `packages/editor/src/behaviors/behavior.core.insert.ts`, `packages/editor/src/behaviors/behavior.abstract.insert.ts` (`insert.text`), `packages/editor/src/operations/operation.insert.text.ts`
- Tests: `packages/editor/tests/event.insert.text.test.tsx`, `packages/editor/tests/event.input.test.tsx`, `packages/editor/tests/event.input.replacement-text.test.tsx`, `packages/editor/tests/composition.test.ts` (IME)

### Decorators

- Spec: `packages/editor/gherkin-spec/decorators.feature`, `packages/editor/gherkin-spec/decorators-overlapping.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.decorator.ts`, `packages/editor/src/behaviors/behavior.core.decorators.ts` (default shortcuts), `packages/editor/src/operations/operation.decorator.add.ts`, `packages/editor/src/operations/operation.decorator.remove.ts`, `packages/editor/src/selectors/selector.is-active-decorator.ts`, `packages/editor/src/selectors/selector.get-mark-state.ts`
- Tests: `packages/editor/tests/event.decorator.toggle.test.tsx`, `packages/editor/tests/event.decorator.add.test.tsx`, `packages/editor/tests/event.decorator.remove.test.tsx`, `packages/editor/tests/mark-model.test.tsx`, `packages/editor/tests/schema-less-marks.test.tsx`

### Annotations

- Spec: `packages/editor/gherkin-spec/annotations.feature`, `packages/editor/gherkin-spec/annotations-across-blocks.feature`, `packages/editor/gherkin-spec/annotations-edge-cases.feature`, `packages/editor/gherkin-spec/annotations-overlapping.feature`, `packages/editor/gherkin-spec/annotations-overlapping-decorators.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.annotation.ts`, `packages/editor/src/behaviors/behavior.core.annotations.ts`, `packages/editor/src/operations/operation.annotation.add.ts`, `packages/editor/src/operations/operation.annotation.remove.ts`, `packages/editor/src/selectors/selector.is-active-annotation.ts`
- Tests: `packages/editor/tests/event.annotation.add.test.tsx`, `packages/editor/tests/event.annotation.remove.test.tsx`, `packages/editor/tests/event.annotation.toggle.test.tsx`, `packages/editor/tests/overlapping-annotations.test.tsx`

The decorator and annotation specs also run in `packages/editor/gherkin-tests/registered-decorator-annotation-renders.test.tsx`.

### Block styles

- Source: `packages/editor/src/behaviors/behavior.abstract.style.ts`, `packages/editor/src/selectors/selector.get-active-style.ts`
- Tests: `packages/editor/tests/event.style.toggle.test.tsx`, `packages/editor/src/selectors/selector.get-active-style.test.ts`

## Blocks and objects

### Block objects

- Spec: `packages/editor/gherkin-spec/block-objects.feature`
- Source: `packages/editor/src/behaviors/behavior.core.block-objects.ts`, `packages/editor/src/editor/render.block-object.tsx`
- Tests: `packages/editor/tests/click-lonely-block-object-container.test.tsx`, `packages/editor/tests/define-leaf-block-object-wrapper.test.tsx`, `packages/editor/tests/event.delete.block.test.tsx`

### Inline objects

- Spec: `packages/editor/gherkin-spec/inline-objects.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.insert.ts` (`insert.inline object`, `insert.child`), `packages/editor/src/operations/operation.insert.child.ts`, `packages/editor/src/behaviors/behavior.core.insert-break.ts`, `packages/editor/src/editor/render.inline-object.tsx`
- Tests: `packages/editor/tests/inline-objects.test.tsx`, `packages/editor/tests/event.insert.inline-object.test.tsx`, `packages/editor/tests/inline-object-contenteditable.test.tsx`

### Lists

- Spec: `packages/editor/gherkin-spec/lists.feature`, `packages/editor/gherkin-tests/plugin.structured-lists.feature` (lists modeled as containers)
- Source: `packages/editor/src/behaviors/behavior.core.lists.ts`, `packages/editor/src/behaviors/behavior.abstract.list-item.ts`, `packages/editor/src/selectors/selector.is-active-list-item.ts`, `packages/editor/gherkin-tests/plugin.structured-lists.test.tsx` (test plugin for lists modeled as containers)
- Tests: `packages/editor/tests/event.list-item.add.test.tsx`, `packages/editor/tests/selector.is-active-list-item.test.tsx`, `packages/editor/tests/recursive-schema.test.tsx` (lists modeled as containers)

### Splitting blocks and Enter

- Spec: `packages/editor/gherkin-spec/splitting-blocks.feature`, `packages/editor/gherkin-spec/insert.break.feature`
- Source: `packages/editor/src/behaviors/behavior.core.insert-break.ts`, `packages/editor/src/behaviors/behavior.abstract.split.ts`, `packages/editor/src/operations/operation.insert.block.ts`
- Tests: `packages/editor/tests/event.split.test.tsx`, `packages/editor/tests/unique-sibling-keys.test.tsx`

### Soft breaks

- Spec: the soft-splitting scenarios in `packages/editor/gherkin-spec/splitting-blocks.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.keyboard.ts`, `packages/editor/src/engine/react/components/editable.tsx` (`insertLineBreak` input), `packages/editor/src/behaviors/behavior.abstract.insert.ts` (`insert.soft break`)
- Tests: `packages/editor/tests/composition.test.ts`, `packages/editor/tests/undo-redo-collaboration.test.tsx`

### Merging blocks

- Spec: the merge scenarios in `packages/editor/gherkin-spec/delete.feature`
- Source: `packages/editor/src/behaviors/behavior.abstract.delete.ts`, `packages/editor/src/internal-utils/delete-internal.ts`, `packages/editor/src/internal-utils/apply-merge-node.ts`, `packages/editor/src/internal-utils/plan-merge-key-renames.ts`
- Tests: `packages/editor/tests/block-merge-duplicate-keys.test.tsx`, `packages/editor/tests/undo-merge-blocks.test.tsx`

### Moving blocks

- Source: `packages/editor/src/behaviors/behavior.abstract.move.ts` (`move.block`)
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
- Source: `packages/editor/src/behaviors/behavior.abstract.insert.ts`, `packages/editor/src/operations/operation.insert.block.ts`, `packages/editor/src/operations/operation.insert.child.ts`, `packages/editor/src/operations/operation.insert.ts`, `packages/editor/src/behaviors/fit-blocks-to-destination.ts`
- Tests: `packages/editor/tests/event.insert.test.tsx`, `packages/editor/tests/event.insert.block.test.tsx`, `packages/editor/tests/event.insert.blocks.test.tsx`, `packages/editor/tests/event.insert.child.test.tsx`, `packages/editor/tests/event.insert.span.test.tsx`, `packages/editor/tests/insert-respects-sub-schema.test.tsx`, `packages/editor/src/behaviors/fit-blocks-to-destination.test.ts`

## Clipboard, paste, and drag and drop

### Copy, cut, and paste

- Spec: `packages/editor/gherkin-spec/paste.feature`, plus the cut scenarios in `packages/editor/gherkin-spec/delete.feature`
- Source: `packages/editor/src/editor/Editable.tsx` (clipboard handlers), `packages/editor/src/behaviors/behavior.abstract.ts` (`clipboard.*` events), `packages/editor/src/behaviors/behavior.abstract.serialize.ts`, `packages/editor/src/behaviors/behavior.abstract.deserialize.ts`, `packages/editor/src/converters/` (MIME type converters)
- Tests: `packages/editor/tests/event.paste.test.tsx`, `packages/editor/tests/serialize-deserialize.test.tsx`, `packages/editor/tests/text-plain-paste.test.tsx`, `packages/editor/tests/upload-images-on-paste.test.tsx`, plus the converter unit suites in `packages/editor/src/converters/`

### Drag and drop

- Source: `packages/editor/src/editor/Editable.tsx` (drag handlers), `packages/editor/src/behaviors/behavior.core.dnd.ts`, `packages/editor/src/selectors/drag-selection.ts`, `packages/editor/src/internal-utils/event-position.ts` (event target position)
- Tests: `packages/editor/tests/event.drag.drop.test.tsx`, `packages/editor/tests/event.drag.drop.self-drop.test.tsx`, `packages/editor/tests/event.drag.test.tsx`, `packages/editor/tests/event.drag.dragstart-container-chrome.test.tsx`, `packages/editor/src/selectors/drag-selection.test.ts`

## Selection and focus

### Selection

- Spec: `packages/editor/gherkin-spec/selection.feature`
- Source: `packages/editor/src/engine/react/components/editable.tsx` (DOM selection sync), `packages/editor/src/engine/dom/plugin/dom-editor.ts` (DOM range conversion), `packages/editor/src/operations/operation.select.ts`, `packages/editor/src/behaviors/behavior.abstract.select.ts`, `packages/editor/src/editor/validate-selection-machine.ts`, `packages/editor/src/editor/selection-state-context.tsx`
- Tests: `packages/editor/tests/event.select.test.tsx`, `packages/editor/tests/selection-validation.test.tsx`, `packages/editor/tests/select-all.test.tsx`, `packages/editor/tests/selection-scroll-into-view.test.tsx`

### Focus

- Source: `packages/editor/src/editor/Editable.tsx` (focus and blur handlers), `packages/editor/src/editor/editor-machine.ts` (`focus` and `blur` events)
- Tests: `packages/editor/tests/event.focus.test.tsx`, `packages/editor/tests/focus.test.tsx`

### Selectors and traversal

- Source: `packages/editor/src/selectors/` (one `selector.*.ts` file per public selector), `packages/editor/src/traversal/`, `packages/editor/src/utils/`, `packages/editor/src/editor/editor-selector.ts` (`useEditorSelector`)
- Tests: unit suites next to the source, plus `packages/editor/tests/focus-selectors.test.tsx`, `packages/editor/tests/selector.get-fragment.test.tsx`, `packages/editor/tests/selector.is-active-list-item.test.tsx`, `packages/editor/tests/use-editor-selector-regression.test.tsx`, `packages/editor/tests/use-editor-selector.coalesce.test.tsx`, and `packages/editor/tests/block-selectors-container.test.tsx` with its `*-selectors-container` siblings

## Undo and redo

- Spec: `packages/editor/gherkin-spec/undo-redo.feature`
- Source: `packages/editor/src/editor/subscriber.history.ts` (undo step recording), `packages/editor/src/editor/undo-step.ts`, `packages/editor/src/operations/operation.history.undo.ts`, `packages/editor/src/operations/operation.history.redo.ts`, `packages/editor/src/internal-utils/transform-operation.ts` (`transformOperation`)
- Tests: `packages/editor/tests/event.history.undo.test.tsx`, `packages/editor/tests/event.history.redo.test.tsx`, `packages/editor/tests/history.preserving-keys.test.tsx`, `packages/editor/tests/no-op-history-skip.test.tsx`

## Collaboration and remote patches

- Spec: `packages/editor/gherkin-spec/annotations-collaboration.feature`, `packages/editor/gherkin-spec/selection-adjustment.feature`
- Source: `packages/editor/src/editor/remote-patches.ts` (incoming patches), `packages/editor/src/internal-utils/applyPatch.ts`, `packages/editor/src/engine-plugins/engine-plugin.remote-changes.ts`, `packages/editor/src/engine/core/apply-operation.ts` (operation applier), `packages/editor/src/editor/subscriber.patch-generation.ts` and `packages/editor/src/internal-utils/operation-to-patches.ts` (outgoing patches)
- Tests: `packages/editor/tests/collaborative-editing.test.tsx`, `packages/editor/tests/selection-after-remote-patches.test.tsx`, `packages/editor/tests/undo-redo-collaboration.test.tsx`, `packages/editor/tests/remote-patches.cosmetic-normalization.test.tsx`, `packages/editor/tests/event.patches.test.tsx`

## Value sync and the host contract

- Source: `packages/editor/src/editor.ts` (the public `Editor` type), `packages/editor/src/editor/editor-provider.tsx` (`EditorProvider`), `packages/editor/src/editor/sync-machine.ts` (value sync), `packages/editor/src/editor/relay.ts` (`EditorEmittedEvent`), `packages/editor/src/editor/mutation-batcher.ts` (`mutation` events), `packages/editor/src/plugins/plugin.event-listener.tsx`, `packages/editor/src/editor/PortableTextEditor.tsx` and `packages/editor/src/editor/create-editable-api.ts` (the legacy `PortableTextEditor` class)
- Tests: `packages/editor/tests/event.update-value.test.tsx`, `packages/editor/tests/editor-value-adoption.test.tsx`, `packages/editor/tests/event.mutation.test.tsx`, `packages/editor/tests/event.patch.test.tsx`, `packages/editor/tests/event.value-changed.test.tsx`, `packages/editor/tests/event.ready.test.tsx`, `packages/editor/tests/validation.test.tsx`

## Read-only

- Source: `packages/editor/src/editor/editor-machine.ts` (the `edit mode` states), `packages/editor/src/editor/create-editor.ts` (`update readOnly`), `packages/editor/src/engine/react/components/editable.tsx`, `packages/editor/src/editor/Editable.tsx`
- Tests: `packages/editor/tests/selection-readonly-sync.test.tsx`, `packages/editor/tests/event.mutation.test.tsx`

## Schema and normalization

- Source: `packages/schema/src/define-schema.ts` and `packages/schema/src/compile-schema.ts` (schema definition), `packages/schema/src/get-sub-schema.ts` (`getSubSchema`), `packages/editor/src/traversal/get-path-sub-schema.ts`, `packages/editor/src/selectors/selector.get-applicable-schema.ts`, `packages/editor/src/engine/core/normalize-node.ts` (normalization), `packages/editor/src/internal-utils/validateValue.ts`
- Tests: `packages/editor/tests/normalization.test.tsx`, `packages/editor/tests/self-solving.test.tsx`, `packages/editor/tests/setup.test.tsx`, `packages/editor/tests/insert-respects-sub-schema.test.tsx`, `packages/editor/tests/recursive-schema.test.tsx`, `packages/editor/tests/container-normalization.test.tsx`, `packages/editor/tests/schema-no-intermediate-row.test.tsx`, `packages/schema/src/get-sub-schema.test.ts`

### The placeholder block

- Source: `packages/editor/src/internal-utils/create-placeholder-block.ts`, `packages/editor/src/engine/core/normalize-node.ts`, `packages/editor/src/internal-utils/field-lifecycle-patches.ts` (field lifecycle patches), `createDecorate` in `packages/editor/src/editor/range-decorations-machine.ts` and `packages/editor/src/editor/render.leaf.tsx` (`renderPlaceholder`)
- Tests: `packages/editor/tests/placeholder-block.test.tsx`, `packages/editor/src/internal-utils/field-lifecycle-patches.test.ts`

## Containers and nesting

- Source: `packages/editor/src/schema/` (container resolution), `packages/editor/src/behaviors/behavior.core.containers.ts`, `packages/editor/src/behaviors/behavior.core.block-objects.ts`, `packages/editor/src/internal-utils/unwrap-container.ts`, `packages/editor/src/editor/render.container.tsx`, `defineContainer` in `packages/editor/src/renderers/renderer.types.ts`
- Tests: `packages/editor/tests/container-rendering.test.tsx`, `packages/editor/tests/container-resolution-rules.test.tsx`, `packages/editor/tests/container-normalization.test.tsx`, `packages/editor/tests/container-enter-escape.test.tsx`, `packages/editor/tests/container-edge-escape.test.tsx`, `packages/editor/tests/delete-empty-container.test.tsx`, `packages/editor/tests/backspace-before-container.test.tsx`, `packages/editor/tests/container-typing.test.tsx`, `packages/editor/tests/cross-container-range-delete.test.tsx`, `packages/editor/tests/tables.test.tsx`, `packages/editor/tests/code-block.test.tsx`

## Rendering

- Source: `packages/editor/src/renderers/renderer.types.ts` (the `defineX` node factories), `packages/editor/src/plugins/plugin.node.tsx` (`NodePlugin`), `packages/editor/src/editor/register-node-on-engine.ts`, `packages/editor/src/editor/render.element.tsx` (element dispatch), `packages/editor/src/editor/render.leaf.tsx`, `packages/editor/src/editor/find-positional-override.ts`
- Tests: `packages/editor/tests/render-block.test.tsx`, `packages/editor/tests/render-child.test.tsx`, `packages/editor/tests/dom-structure.test.tsx`, `packages/editor/tests/positional-override-block-level.test.tsx` and its `positional-override-*` siblings, `packages/editor/tests/render-count-regression.test.tsx`

### `editor.dom`

- Source: `packages/editor/src/editor/editor-dom.ts` (DOM lookups), `packages/editor/src/editor/create-editor.ts`
- Tests: `packages/editor/tests/editor-dom-selection-rect.test.tsx`, `packages/editor/tests/editor-dom-point-at-coordinates.test.tsx`

### Range decorations

- Source: `packages/editor/src/editor/range-decorations-machine.ts`, `packages/editor/src/editor/range-decorations-registration.ts`, `packages/editor/src/define-decoration.ts`
- Tests: `packages/editor/tests/range-decorations.test.tsx`, `packages/editor/tests/range-decorations-registration.test.tsx`, `packages/editor/src/editor/range-decorations-machine.test.ts`

## Keyboard shortcuts

- Source: `packages/editor/src/editor/default-keyboard-shortcuts.ts`, `packages/editor/src/behaviors/behavior.abstract.keyboard.ts` (keyboard Behaviors), `packages/editor/src/behaviors/behavior.core.decorators.ts`, `packages/editor/src/editor/perform-hotkey.ts` (the legacy `hotkeys` prop)
- Tests: `packages/editor/tests/event.keyboard.keydown.test.tsx`, `packages/editor/tests/event.decorator.toggle.shortcut.test.tsx`

## Other packages

- `packages/block-tools/`: Sanity-flavored HTML to Portable Text. Source `packages/block-tools/src/index.ts`, tests in `packages/block-tools/test/`.
- `packages/html/`: HTML to Portable Text. Source `packages/html/src/index.ts`, tests in `packages/html/src/tests/`.
- `packages/keyboard-shortcuts/`: keyboard shortcut definitions. Source `packages/keyboard-shortcuts/src/index.ts`, tests `packages/keyboard-shortcuts/src/is-keyboard-shortcut.test.ts`.
- `packages/markdown/`: Portable Text to and from Markdown. Source `packages/markdown/src/index.ts` and `packages/markdown/src/apply-markdown-edit.ts`, tests in `packages/markdown/src/`, including `packages/markdown/src/apply-markdown-edit.test.ts`.
- `packages/patches/`: applies Sanity patches to a value. Source `packages/patches/src/index.ts`, tests `packages/patches/src/apply-patch.test.ts`.
- `packages/plugin-character-pair-decorator/`: character pair decorators. Source `packages/plugin-character-pair-decorator/src/index.ts`, spec `packages/plugin-character-pair-decorator/src/backspace.feature`, tests in `packages/plugin-character-pair-decorator/src/`.
- `packages/plugin-decorations/`: decoration layers. Source `packages/plugin-decorations/src/index.ts`, tests `packages/plugin-decorations/src/decorations-registration.test.tsx`.
- `packages/plugin-dnd/`: drop position for custom drop indicators. Source `packages/plugin-dnd/src/index.ts`, tests `packages/plugin-dnd/src/plugin.dnd.test.tsx`.
- `packages/plugin-emoji-picker/`: emoji picker. Source `packages/plugin-emoji-picker/src/index.ts`, spec `packages/plugin-emoji-picker/src/emoji-picker.feature`, tests `packages/plugin-emoji-picker/src/emoji-picker.test.tsx`.
- `packages/plugin-input-rule/`: input rules. Source `packages/plugin-input-rule/src/index.ts`, specs and tests in `packages/plugin-input-rule/src/`.
- `packages/plugin-list-index/`: list item indexes. Source `packages/plugin-list-index/src/index.ts`, tests in `packages/plugin-list-index/src/`.
- `packages/plugin-markdown-shortcuts/`: Markdown shortcuts. Source `packages/plugin-markdown-shortcuts/src/index.ts`, specs `packages/plugin-markdown-shortcuts/src/behavior.markdown.feature` and `packages/plugin-markdown-shortcuts/src/rule.markdown-link.feature`, tests in `packages/plugin-markdown-shortcuts/src/`.
- `packages/plugin-one-line/`: single-text-block editor. Source `packages/plugin-one-line/src/plugin.one-line.tsx`, no tests.
- `packages/plugin-paste-link/`: pasting links. Source `packages/plugin-paste-link/src/index.ts`, spec `packages/plugin-paste-link/src/paste-link.feature`, tests `packages/plugin-paste-link/src/paste-link.test.tsx`.
- `packages/plugin-sdk-value/`: Sanity SDK value sync, presence, and comments. Source `packages/plugin-sdk-value/src/index.ts`, tests in `packages/plugin-sdk-value/src/`.
- `packages/plugin-table/`: tables. Source `packages/plugin-table/src/index.ts`, tests in `packages/plugin-table/src/`.
- `packages/plugin-typeahead-picker/`: typeahead pickers. Source `packages/plugin-typeahead-picker/src/index.ts`, specs and tests in `packages/plugin-typeahead-picker/src/`.
- `packages/plugin-typography/`: typographic input rules. Source `packages/plugin-typography/src/index.ts`, specs and tests in `packages/plugin-typography/src/`.
- `packages/racejar/`: the Gherkin driver behind every `.feature` suite. Source `packages/racejar/src/index.ts`, examples in `packages/racejar/example/`.
- `packages/sanity-bridge/`: Sanity schema to Portable Text schema. Source `packages/sanity-bridge/src/index.ts`, tests in `packages/sanity-bridge/src/`.
- `packages/schema/`: the Portable Text schema. Source `packages/schema/src/index.ts`, tests in `packages/schema/src/`.
- `packages/test/`: test utilities. Source `packages/test/src/index.ts`, tests `packages/test/src/terse-pt.test.ts`.
- `packages/toolbar/`: toolbar hooks. Source `packages/toolbar/src/index.ts`, tests in `packages/toolbar/src/`.
