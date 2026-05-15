import {defineContainer} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {defineInputRule, InputRulePlugin} from '@portabletext/plugin-input-rule'

/**
 * Blockquote container. Wraps one or more paragraphs (and nested
 * blockquotes) in a left-bordered indented region. The actual
 * styling is a thin left rule plus indentation - no font change,
 * no italic, no quote glyph - leaving the inner text formatting
 * intact so the reader sees the quote as quoted content rather
 * than a decoration.
 *
 * Recursive nesting is allowed via the schema's
 * `blockquote.content.of: [block, blockquote]` declaration. Each
 * nested level adds another left rule + indent.
 */
const blockquoteContainer = defineContainer({
  type: 'blockquote',
  childField: 'content',
  render: ({attributes, children}) => (
    <blockquote {...attributes} className="pc-blockquote">
      {children}
    </blockquote>
  ),
})

/**
 * Markdown shortcut: typing `> ` at the start of a text block
 * converts the block into a blockquote container whose first
 * paragraph is the current block (minus the marker).
 *
 * The trigger is the space after `>`. The guard requires the focus
 * block to be a top-level text block (a block that lives directly
 * under the editor or inside a list-item / cell - not already a
 * blockquote child, which would be the user's intent to literally
 * write `> ` inside an existing quote).
 */
const blockquoteInputRule = defineInputRule({
  on: /^> /,
  guard: ({event}) => {
    const match = event.matches.at(0)
    if (!match) {
      return false
    }
    return true
  },
  actions: [
    ({event, snapshot}) => {
      const keyGen = snapshot.context.keyGenerator
      const blockKey = keyGen()
      const spanKey = keyGen()
      const blockquoteKey = keyGen()

      const blockquote = {
        _type: 'blockquote',
        _key: blockquoteKey,
        content: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
            markDefs: [],
          },
        ],
      }

      const focusBlockPath = event.focusBlock.path
      const parentPath = focusBlockPath.slice(0, -1)
      const newCaretPath = [
        ...parentPath,
        {_key: blockquoteKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]

      return [
        raise({
          type: 'insert',
          at: focusBlockPath,
          value: blockquote as never,
          position: 'before',
        }),
        raise({type: 'unset', at: focusBlockPath}),
        raise({
          type: 'select',
          at: {
            anchor: {path: newCaretPath, offset: 0},
            focus: {path: newCaretPath, offset: 0},
          } as never,
        }),
      ]
    },
  ],
})

export function BlockquotePlugin() {
  return (
    <>
      <ContainerPlugin containers={[blockquoteContainer]} />
      <InputRulePlugin rules={[blockquoteInputRule]} />
    </>
  )
}
