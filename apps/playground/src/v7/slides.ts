import type {PortableTextBlock} from '@portabletext/editor'

/**
 * The v7 deck content - 11 milestones plus an intro and a reveal slide.
 *
 * Each top-level entry is a `slide` container. The container's `content`
 * field holds the slide's blocks (paragraphs, headings, lists, and
 * eventually richer containers like code blocks and tables for the slides
 * that demonstrate those features).
 *
 * Slide _keys are stable so the navigation hash can deep-link to a slide.
 */

const span = (
  text: string,
  marks: ReadonlyArray<string> = [],
  key = `s${Math.random().toString(36).slice(2, 8)}`,
) => ({
  _type: 'span',
  _key: key,
  text,
  marks,
})

const block = (
  options: {
    style?: string
    listItem?: string
    level?: number
    children: ReadonlyArray<ReturnType<typeof span>>
    markDefs?: ReadonlyArray<unknown>
  },
  key = `b${Math.random().toString(36).slice(2, 8)}`,
): PortableTextBlock => ({
  _type: 'block',
  _key: key,
  style: options.style ?? 'normal',
  listItem: options.listItem,
  level: options.level,
  markDefs: options.markDefs ?? [],
  children: options.children,
})

const slide = (
  key: string,
  content: ReadonlyArray<PortableTextBlock>,
): PortableTextBlock =>
  ({
    _type: 'slide',
    _key: key,
    content,
  }) as unknown as PortableTextBlock

export const deckValue: ReadonlyArray<PortableTextBlock> = [
  slide('slide-intro', [
    block({style: 'h1', children: [span('Portable Text v7')]}),
    block({
      style: 'h3',
      children: [span('The architecture, told as milestones.')],
    }),
    block({
      children: [
        span(
          'Each slide marks a turn in how the editor came to be what it is today. ',
        ),
        span('Press the arrow keys to advance.', ['em']),
      ],
    }),
  ]),

  slide('slide-1', [
    block({style: 'h1', children: [span('1. We vendored Slate')]}),
    block({
      style: 'h3',
      children: [span('From a generic editor to one we own.')],
    }),
    block({
      children: [
        span(
          'Slate had become a liability. Generic types, upstream pace, browser quirks - every fix was an archaeology dig. So we copied it into the repo. Every component, every operation, every plugin. Then we started cutting.',
        ),
      ],
    }),
    block({
      style: 'h3',
      children: [span('What it unlocked')],
    }),
    block({
      children: [
        span('The right to delete. The right to rename. The right to say ', []),
        span('we own that code, it is PTE', ['em']),
        span(
          ' without disclaimers. Everything downstream is only possible because we stopped translating.',
        ),
      ],
    }),
  ]),

  slide('slide-2', [
    block({
      style: 'h1',
      children: [span('2. Portable Text-native')],
    }),
    block({
      style: 'h3',
      children: [span('Stop pretending. The tree already was the value.')],
    }),
    block({
      children: [
        span(
          'The vendored Slate tree was Portable Text values in disguise: text blocks, spans, marks, markDefs, block objects. We deleted the disguise. Generic ',
        ),
        span('Element', ['code']),
        span('/'),
        span('Text', ['code']),
        span(' became '),
        span('PortableTextTextBlock', ['code']),
        span('/'),
        span('PortableTextSpan', ['code']),
        span(
          '. The vocabulary aligned. Operations got renamed. Helpers got renamed.',
        ),
      ],
    }),
    block({
      children: [
        span(
          'A consumer reading the source now sees the same words they see in the schema. And the next layer - patches - became reachable, because the tree was already shaped like one.',
        ),
      ],
    }),
  ]),

  slide('slide-3', [
    block({
      style: 'h1',
      children: [span('3. Fully patch-compliant')],
    }),
    block({
      style: 'h3',
      children: [span('The big one.')],
    }),
    block({
      children: [
        span(
          'Pre-v7 the editor spoke Slate operations internally and translated them to Sanity patches on the way out. Translation went two ways and lost information both directions. Hundreds of lines, the source of an unreasonable share of bugs.',
        ),
      ],
    }),
    block({
      children: [
        span('We converged the layers. ', []),
        span('set_node', ['code']),
        span(' died, replaced by primitive '),
        span('set', ['code']),
        span('/'),
        span('unset', ['code']),
        span(' operations that mirror Sanity patches one-to-one. '),
        span('insert_node', ['code']),
        span(' became '),
        span('insert', ['code']),
        span('. The apply layer took ownership of inverse computation.'),
      ],
    }),
    block({
      style: 'h3',
      children: [span('The headline')],
    }),
    block({
      children: [
        span(
          'We accept any patch and emit any patch. The lowest level of the editor is patch-compliant by construction. ',
        ),
        span('If you remember one milestone from this release, this is it.', [
          'strong',
        ]),
      ],
    }),
  ]),

  slide('slide-4', [
    block({
      style: 'h1',
      children: [span('4. Keyed paths')],
    }),
    block({
      style: 'h3',
      children: [span('Numeric indexes out. Keys in.')],
    }),
    block({
      children: [
        span(
          'The internal selection format was [blockIndex, childIndex, ...] - numeric, positional, fragile. Every concurrent edit invalidated every other client. We rewrote selection, operations, dirty paths, and traversal to use keyed paths natively. 1545 tests. 129 files. One PR.',
        ),
      ],
    }),
    block({
      style: 'h3',
      children: [span('What it unlocked')],
    }),
    block({
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        span(
          'Concurrent editing - two clients on the same _key see the same selection.',
        ),
      ],
    }),
    block({
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [span('Container support - paths are keyed all the way down.')],
    }),
    block({
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [span('Wire format and internal format share one path type.')],
    }),
    block({
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        span('Undo through structural mutations - blocks move, keys do not.'),
      ],
    }),
    block({
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        span('Depth-agnostic by default - utils compose at any depth.'),
      ],
    }),
  ]),

  slide('slide-5', [
    block({
      style: 'h1',
      children: [span('5. Containers')],
    }),
    block({
      style: 'h3',
      children: [span('Nested editable structures, first-class.')],
    }),
    block({
      children: [
        span(
          'Pre-v7 the editor knew two levels of depth: blocks and their children. Tables, code blocks, callouts, lists - none of them representable as data. Consumers faked it. The first design was scope-grammar-based - JSONPath-style strings matching positions. It worked. We deleted it.',
        ),
      ],
    }),
    block({
      children: [
        span('v2 is type-keyed. Register a container by its ', []),
        span('_type', ['code']),
        span(". Positional overrides go inside a parent's "),
        span('of', ['code']),
        span(' array. The locked rule: '),
        span('registration is type-keyed, activation is position-gated.', [
          'strong',
        ]),
      ],
    }),
    block({
      children: [span('Every layer of the editor learned what nesting meant.')],
    }),
  ]),

  slide('slide-reveal', [
    block({
      style: 'h1',
      children: [span('By the way')],
    }),
    block({
      style: 'h3',
      children: [span('This deck is one Portable Text document.')],
    }),
    block({
      children: [
        span(
          'Every slide you have seen so far is a `slide` container at the root of a single PTE value. I am typing into it right now.',
        ),
      ],
    }),
    block({
      children: [
        span('Open the inspector. Look at the value. ', []),
        span('It is just Portable Text.', ['em']),
      ],
    }),
  ]),

  slide('slide-6', [
    block({
      style: 'h1',
      children: [span('6. Cascading normalization')],
    }),
    block({
      style: 'h3',
      children: [span('A bare type, made cursor-ready.')],
    }),
    block({
      children: [
        span(
          'Slate normalization assumed flat: blocks at root, children inside blocks, nothing deeper. Containers broke every assumption. We rewrote it to cascade.',
        ),
      ],
    }),
    block({
      children: [
        span('An empty container with a missing field gets ', []),
        span('[]', ['code']),
        span(
          ', which triggers normalization at the cells level, which inserts a default cell, which inserts a placeholder text block, which inserts an empty span. The cascade walks from a bare ',
        ),
        span("{_type: 'table'}", ['code']),
        span(' to a fully cursor-ready tree.'),
      ],
    }),
    block({
      children: [
        span(
          'Press Backspace in an empty table cell. The cell stays - it is structural. Press Backspace in the only line of a code block. The code block disappears - its content field accepts placeholders. Complexity is internal, the surface is calm.',
        ),
      ],
    }),
  ]),

  slide('slide-7', [
    block({
      style: 'h1',
      children: [span('7. Depth-agnostic traversal')],
    }),
    block({
      style: 'h3',
      children: [span('The library of composable primitives.')],
    }),
    block({
      children: [
        span(
          'A hundred-plus traversal utilities existed pre-v7, most baking in path[0] or path.slice(0, 2). Each one had to be rewritten to compose primitives that work at any depth.',
        ),
      ],
    }),
    block({
      children: [
        span('We unified the input shape: ', []),
        span('TraversalSnapshot', ['code']),
        span(' - one structure satisfied by '),
        span('EditorSnapshot', ['code']),
        span(', '),
        span('OperationSnapshot', ['code']),
        span(', and the editor itself. One snapshot type. One mental model.'),
      ],
    }),
    block({
      children: [
        span(
          'Behaviors written for root-level text drop into a callout, a table cell, a code block - without rewriting. Many v6 plugins migrated with zero source changes.',
        ),
      ],
    }),
  ]),

  slide('slide-8', [
    block({
      style: 'h1',
      children: [span('8. A cleaner DOM')],
    }),
    block({
      style: 'h3',
      children: [span('data-pt-path, everywhere it matters.')],
    }),
    block({
      children: [
        span(
          "Slate's DOM mapping had no relationship to Portable Text. data-slate-node, data-slate-leaf, data-slate-string - none of them told you which _key a node had.",
        ),
      ],
    }),
    block({
      children: [
        span(
          'The new mapping is direct. Every element inside a container carries ',
          [],
        ),
        span('data-pt-path', ['code']),
        span(
          ' - a Sanity-bracket-notation serialized keyed path. DOM-to-model resolution walks ',
        ),
        span('[data-pt-path]', ['code']),
        span(' ancestors and parses. '),
        span('data-pt-container', ['code']),
        span(', '),
        span('data-pt-leaf', ['code']),
        span(', '),
        span('data-pt-spacer', ['code']),
        span(' describe what each element is in Portable Text terms.'),
      ],
    }),
    block({
      children: [
        span(
          'Open devtools on a v7 editor and you see Portable Text paths in the DOM. The mapping is no longer a translation; it is a serialization.',
        ),
      ],
    }),
  ]),

  slide('slide-9', [
    block({
      style: 'h1',
      children: [span('9. Primitive behavior events')],
    }),
    block({
      style: 'h3',
      children: [span('Behaviors compose the primitives the engine speaks.')],
    }),
    block({
      children: [
        span(
          'In v6 most behaviors raised "smart" synthetic events - insert.block, delete.block, block.set - whose handlers contained the depth-2 assumptions. A behavior could not reach below the synthetic layer.',
        ),
      ],
    }),
    block({
      children: [
        span(
          'We promoted the apply-layer primitives as @alpha behavior events. ',
          [],
        ),
        span('insert', ['code']),
        span(', '),
        span('unset', ['code']),
        span(', '),
        span('set', ['code']),
        span(', '),
        span('insert.text', ['code']),
        span(', '),
        span('remove.text', ['code']),
        span(', '),
        span('select', ['code']),
        span(
          '. Six events. One per apply-layer operation. One per Sanity patch type.',
        ),
      ],
    }),
    block({
      children: [
        span(
          'structured-lists became the canary: 11 flat-list behaviors decompose into 4 primitives plus 9 thin behaviors. No engine changes required. The engine ships the vocabulary; consumers compose.',
        ),
      ],
    }),
  ]),

  slide('slide-10', [
    block({
      style: 'h1',
      children: [span('10. Schema enforcement, symmetrical')],
    }),
    block({
      style: 'h3',
      children: [span('Strict at every depth.')],
    }),
    block({
      children: [
        span(
          'Pre-v7 the editor enforced schema constraints inside containers but accepted anything at root. The asymmetry was a mistake - consumers wrote behaviors expecting strict enforcement, got intermittent silent drops when constraints applied below root and not at it.',
        ),
      ],
    }),
    block({
      children: [
        span(
          'v7 enforces strictly at every depth. Insert validates against the sub-schema at the target path. decorator.add filters per-block. annotation.add validates the annotation type. The operation layer absorbs the question; behavior guards no longer gate user intent.',
        ),
      ],
    }),
    block({
      children: [
        span(
          'A behavior that fires insert knows the editor will validate. A callout that only allows strong and em sees its constraints respected. The schema is the contract, top to bottom.',
        ),
      ],
    }),
  ]),

  slide('slide-11', [
    block({
      style: 'h1',
      children: [span('11. The traversal snapshot')],
    }),
    block({
      style: 'h3',
      children: [span('One input shape, everywhere.')],
    }),
    block({
      children: [
        span('The type-level companion to milestone 7. ', []),
        span('EditorSnapshot', ['code']),
        span(', '),
        span('OperationSnapshot', ['code']),
        span(', '),
        span('TraversalSnapshot', ['code']),
        span(' - all share the same shape. The editor satisfies it via a '),
        span('context', ['code']),
        span(' getter.'),
      ],
    }),
    block({
      children: [
        span(
          'Behaviors and selectors that read state do it the same way as the engine. 60 files migrated; the ergonomic dividend pays out forever.',
        ),
      ],
    }),
  ]),

  slide('slide-arc', [
    block({
      style: 'h1',
      children: [span('The arc')],
    }),
    block({
      style: 'h3',
      children: [span('Every advanced feature traces back to four ideas.')],
    }),
    block({
      children: [span('We accept any patch.')],
    }),
    block({
      children: [span('We emit any patch.')],
    }),
    block({
      children: [span('Paths are keyed.')],
    }),
    block({
      children: [span('Depth is just a parameter.')],
    }),
    block({
      children: [
        span(
          'A generic positional editor became a Portable Text-native, keyed, patch-compliant, depth-agnostic, container-aware document model. The headline of v7 is the architectural foundation. Markdown compliance, structured lists, tables, code blocks - those are the dividend.',
        ),
      ],
    }),
  ]),
]
