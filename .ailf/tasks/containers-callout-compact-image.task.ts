import { defineTask } from "@sanity/ailf"

/**
 * Grounded in https://www.portabletext.org/editor/concepts/containers/
 * ("A complete example"): the same `image` type renders full width at
 * the root but compact inside a callout, via a positional override in
 * the container's `of` array.
 */
export default defineTask({
  mode: "literacy",
  id: "containers-callout-compact-image",
  title: "Callout container with a compact image override",
  description:
    "Tests whether the containers concept page enables building a container with a positional render override",
  area: "containers",

  context: {
    docs: [
      {
        path: "editor/concepts/containers",
        reason:
          "Defines containers, the schema + registration pair, positional `of` overrides, and the render contract",
      },
    ],
  },
  docCoverage: true,

  prompt: {
    text: `Using @portabletext/editor, build a React editor where authors can
write text and images at the document root, and insert a "callout"
block that itself contains editable rich text and images.

Requirements:

1. Images at the document root render full width.
2. The same image type rendered inside a callout renders compact
   (thumbnail-sized).
3. Text editing must work both at the root and inside the callout.

Show the schema definition and the editor component with all node
registrations.`,
  },

  assertions: [
    {
      type: "llm-rubric",
      template: "task-completion",
      criteria: [
        {
          id: "schema-nested-block",
          text: "The callout is declared in the schema as a block object with an array field whose `of` includes `{type: 'block'}` and the image type",
        },
        {
          id: "define-container",
          text: "Uses `defineContainer` with the callout's array field as `arrayField`, mounted through `NodePlugin`",
        },
        {
          id: "positional-override",
          text: "The compact image render is a `defineBlockObject` registration inside the callout container's `of` array, while a separate global `defineBlockObject` handles root images",
        },
        {
          id: "text-block-registration",
          text: "Registers a text block with `defineTextBlock({type: 'block'})` so text renders inside the callout (the new pipeline claims the container's subtree)",
        },
      ],
    },
    {
      type: "llm-rubric",
      template: "code-correctness",
      criteria: [
        {
          id: "render-contract",
          text: "Renders spread `attributes` onto the outer element and render `children`; block-object renders mark visible content `contentEditable={false}` while the outer element stays editable",
        },
        {
          id: "stable-nodes-identity",
          text: "The `nodes` array has a stable identity (module scope or memoized), not recreated inline on every render",
        },
      ],
    },
  ],
})
