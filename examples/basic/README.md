# Basic Portable Text Editor example

A single-file React example showing how to set up [`@portabletext/editor`](../../packages/editor/): a schema with decorators, annotations, styles, lists, a block object (image) and an inline object (stock ticker), node registrations and render functions for each, a small toolbar built with `useEditor` and `useEditorSelector`, and a live JSON preview of the Portable Text value.

The whole example lives in [`src/App.tsx`](./src/App.tsx).

## Run it

From the repository root:

```sh
pnpm install
pnpm --filter example-basic dev
```

Then open the local URL Vite prints (defaults to `http://localhost:5173`).

## What it demonstrates

- Defining a schema with `defineSchema` (decorators, annotations, styles, lists, block and inline objects)
- Node registrations (`defineTextBlock`, `defineBlockObject`, `defineInlineObject`, `defineDecorator`, `defineAnnotation`) mounted with `NodePlugin`
- List numbering with [`@portabletext/plugin-list-index`](../../packages/plugin-list-index/)
- A toolbar that toggles marks, styles, and lists using `useEditor` and `useEditorSelector` with selectors from `@portabletext/editor/selectors`
- Reading the editor value through `EventListenerPlugin` and rendering it as JSON

If you're migrating an editor from the deprecated render props (`renderBlock`, `renderChild`, `renderStyle`, `renderListItem`) to node registrations, see the [migration guide](https://www.portabletext.org/editor/guides/migrate-render-props/).

For a guided walkthrough of the same setup, see [Getting started](https://www.portabletext.org/editor/getting-started/).
