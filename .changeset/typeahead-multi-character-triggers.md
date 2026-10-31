---
'@portabletext/plugin-typeahead-picker': minor
---

feat: open the typeahead picker on multi-character triggers

Triggers of more than one character, such as `/\[\[/` or `/:::/`, now open the picker when the character that completes them is typed: `[` followed by `[` opens it with an empty keyword, and typing on updates the keyword. Inserting `[foo` in one go after an existing `[`, as Android keyboards do when committing a word, opens the picker with the keyword `foo`. Selecting a match replaces every trigger character along with the keyword, and with a `delimiter` such as `]`, typing `[[foo]` auto-completes an exact match.

```ts
import {raise} from '@portabletext/editor/behaviors'
import {defineTypeaheadPicker} from '@portabletext/plugin-typeahead-picker'

const pages = ['Getting started', 'Glossary', 'Roadmap']

function searchPages(keyword: string) {
  return pages
    .filter((title) => title.toLowerCase().startsWith(keyword.toLowerCase()))
    .map((title) => ({
      title,
      type:
        title.toLowerCase() === keyword.toLowerCase()
          ? ('exact' as const)
          : ('partial' as const),
    }))
}

const wikiLinkPicker = defineTypeaheadPicker({
  trigger: /\[\[/,
  keyword: /[^\]]*/,
  delimiter: ']',
  getMatches: ({keyword}) => searchPages(keyword),
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.title}),
    ],
  ],
})
```
