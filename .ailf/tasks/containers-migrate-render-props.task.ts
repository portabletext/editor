import { defineTask } from "@sanity/ailf"

/**
 * Grounded in https://www.portabletext.org/editor/guides/migrate-render-props/:
 * kind-by-kind migration from the legacy render props to node
 * registrations, including which props survive.
 */
export default defineTask({
  mode: "literacy",
  id: "containers-migrate-render-props",
  title: "Migrate render props to node registrations",
  description:
    "Tests whether the migration guide enables converting a legacy render-prop editor to registrations",
  area: "containers",

  context: {
    docs: [
      {
        path: "editor/guides/migrate-render-props",
        reason:
          "The what-maps-to-what table, the per-kind steps, and which render props survive the migration",
      },
    ],
  },
  docCoverage: true,

  prompt: {
    text: `This @portabletext/editor editor renders through legacy render props
on <PortableTextEditable>:

- renderBlock branches on schemaType.name: 'image' blocks render an
  <img> in a bordered <div>; the default case wraps text blocks in a
  <div> with bottom margin.
- renderChild renders 'stock-ticker' inline objects as a styled <span>,
  and returns props.children otherwise.
- renderStyle maps 'h1' and 'blockquote' to their elements.
- renderDecorator maps 'strong' to <strong> and 'em' to <em>.

Migrate this editor fully to node registrations. Show the resulting
registrations, the component, and state explicitly which of the
original render props remain on <PortableTextEditable> and why.`,
  },

  assertions: [
    {
      type: "llm-rubric",
      template: "task-completion",
      criteria: [
        {
          id: "block-object-registration",
          text: "The image render becomes `defineBlockObject({type: 'image'})`, with no `schemaType.name` branching",
        },
        {
          id: "inline-object-registration",
          text: "The stock ticker becomes `defineInlineObject({type: 'stock-ticker'})`",
        },
        {
          id: "text-block-folds-three",
          text: "`defineTextBlock({type: 'block'})` folds the style logic and the text-block default case into one render",
        },
        {
          id: "decorator-prop-survives",
          text: "`renderDecorator` stays on `<PortableTextEditable>` and the answer states that span-level props are not part of the migration; `renderBlock`, `renderChild`, and `renderStyle` are removed",
        },
      ],
    },
    {
      type: "llm-rubric",
      template: "code-correctness",
      criteria: [
        {
          id: "void-children",
          text: "Block-object renders spread `attributes`, render `children`, and mark visible content `contentEditable={false}`",
        },
        {
          id: "node-plugin-mount",
          text: "All registrations mount through a single `NodePlugin` with a stable `nodes` identity",
        },
      ],
    },
  ],
})
