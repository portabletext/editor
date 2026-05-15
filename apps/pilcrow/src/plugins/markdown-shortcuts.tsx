import {raise} from '@portabletext/editor/behaviors'
import {defineInputRule, InputRulePlugin} from '@portabletext/plugin-input-rule'
import {MarkdownShortcutsPlugin as LibraryMarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'

/**
 * Pilcrow's markdown-shortcuts wiring.
 *
 * The upstream `MarkdownShortcutsPlugin` covers headings,
 * horizontal-rule, links, and inline decorator pairs (`**bold**`,
 * `*em*`, `\`code\``, `~~strike~~`). Its built-in list rules emit
 * `block.set` with a `listItem` property, which is the flat-list
 * shape. Pilcrow uses container-based structured lists, so those
 * rules are deliberately NOT enabled here; the structured-list
 * input rules below take their place.
 *
 * Blockquotes are also containers (not a style), so we omit
 * `blockquoteStyle` and rely on the blockquote plugin's own input
 * rule for `> ` triggers.
 *
 * The structured rules emit:
 *   1. `insert` of a new `list` (with a `list-item` containing an
 *      empty text block) positioned before the focus block.
 *   2. `unset` of the original focus block (the `- ` / `1. ` text
 *      becomes the list item's first line, minus the marker).
 *   3. `select` at the new list-item's text block.
 *
 * The result: typing `- ` at the start of a paragraph turns it into
 * a bulleted list whose first item is the empty paragraph the caret
 * is sitting in.
 */
export function MarkdownShortcutsPlugin() {
  return (
    <>
      <LibraryMarkdownShortcutsPlugin
        defaultStyle={() => 'normal'}
        headingStyle={({props}) => `h${props.level}`}
        horizontalRuleObject={() => ({_type: 'horizontal-rule'})}
        linkObject={({props}) => ({_type: 'link', href: props.href})}
        boldDecorator={() => 'strong'}
        italicDecorator={() => 'em'}
        codeDecorator={() => 'code'}
        strikeThroughDecorator={() => 'strike-through'}
      />
      <InputRulePlugin
        rules={[
          createStructuredListRule({pattern: /^(-|\*) /, kind: 'bullet'}),
          createStructuredListRule({pattern: /^1\. /, kind: 'number'}),
        ]}
      />
    </>
  )
}

interface StructuredListRuleConfig {
  pattern: RegExp
  kind: string
}

function createStructuredListRule(config: StructuredListRuleConfig) {
  return defineInputRule({
    on: config.pattern,
    guard: ({event}) => {
      const match = event.matches.at(0)
      if (!match) {
        return false
      }
      return {match}
    },
    actions: [
      ({event, snapshot}) => {
        const keyGen = snapshot.context.keyGenerator
        const blockKey = keyGen()
        const spanKey = keyGen()
        const itemKey = keyGen()
        const listKey = keyGen()

        const newList = {
          _type: 'list',
          _key: listKey,
          kind: config.kind,
          items: [
            {
              _type: 'list-item',
              _key: itemKey,
              content: [
                {
                  _type: 'block',
                  _key: blockKey,
                  style: 'normal',
                  children: [
                    {_type: 'span', _key: spanKey, text: '', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
          ],
        }

        const focusBlockPath = event.focusBlock.path
        // The new list is inserted at the focus block's parent level, so
        // its path lives under the same parent (top-level OR inside a
        // callout/table cell/list-item). Compute the parent path so the
        // select event points at the right place.
        const parentPath = focusBlockPath.slice(0, -1)
        const targetTextPath = [
          ...parentPath,
          {_key: listKey},
          'items',
          {_key: itemKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ]

        return [
          raise({
            type: 'insert',
            at: focusBlockPath,
            value: newList as never,
            position: 'before',
          }),
          raise({type: 'unset', at: focusBlockPath}),
          raise({
            type: 'select',
            at: {
              anchor: {path: targetTextPath, offset: 0},
              focus: {path: targetTextPath, offset: 0},
            } as never,
          }),
        ]
      },
    ],
  })
}
