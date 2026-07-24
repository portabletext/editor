import { defineTask } from "@sanity/ailf"

/**
 * Grounded in https://www.portabletext.org/editor/concepts/containers/
 * ("Editing follows the sub-schema"): the schema is the feature flag;
 * schema-aware plugins gate themselves through `context.schema` at the
 * caret with no per-container configuration.
 */
export default defineTask({
  mode: "literacy",
  id: "containers-subschema-gating",
  title: "Sub-schema gating of Markdown shortcuts in a code block",
  description:
    "Tests whether the docs enable schema-driven feature gating inside containers",
  area: "containers",

  context: {
    docs: [
      {
        path: "editor/concepts/containers",
        reason:
          "Sub-schema declaration and resolution rules, and the schema-as-feature-flag example with Markdown shortcuts",
      },
    ],
  },
  docCoverage: true,

  prompt: {
    text: `Using @portabletext/editor with @portabletext/plugin-markdown-shortcuts,
build an editor where typing **bold** applies the strong decorator in
regular paragraphs, and a "code-block" container holds editable lines
where **bold** must do nothing (code must stay literal).

Do not use any per-container conditional logic in the plugin
configuration. Explain in one or two sentences why the shortcut is
inert inside the code block.`,
  },

  assertions: [
    {
      type: "llm-rubric",
      template: "task-completion",
      criteria: [
        {
          id: "empty-decorators-subschema",
          text: "The code block's nested `{type: 'block'}` schema member declares `decorators: []` (declared empty forbids the property inside the container)",
        },
        {
          id: "schema-lookup-config",
          text: "`boldDecorator` is configured as a lookup against `context.schema.decorators`, not as a hardcoded string or a position check",
        },
        {
          id: "explains-mechanism",
          text: "The explanation says the callback receives the sub-schema at the caret, so the lookup returns `undefined` inside the code block and the shortcut skips itself",
        },
      ],
    },
    {
      type: "llm-rubric",
      template: "code-correctness",
      criteria: [
        {
          id: "container-registration",
          text: "The code block is registered with `defineContainer` (with a matching `arrayField`) so its lines are editable",
        },
      ],
    },
  ],
})
