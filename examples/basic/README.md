# Basic Portable Text Editor example

A single-file React example showing how to set up [`@portabletext/editor`](../../packages/editor/): a schema with decorators, annotations, styles, lists, a block object (image) and an inline object (stock ticker), the matching render functions, a small toolbar built with `useEditor` and `useEditorSelector`, and a live JSON preview of the Portable Text value.

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
- Render functions: `renderDecorator`, `renderAnnotation`, `renderStyle`, `renderBlock`, `renderChild`
- A toolbar that toggles marks, styles, and lists using `useEditor` and `useEditorSelector` with selectors from `@portabletext/editor/selectors`
- Reading the editor value through `EventListenerPlugin` and rendering it as JSON

For a guided walkthrough of the same setup, see [Getting started](https://www.portabletext.org/editor/getting-started/).
