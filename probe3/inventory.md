# Device inventory

English Gboard support is read from `symbols.ts`; letter support follows `support.ts`. Rows include expanded Outline examples and Background steps. Page includes assertions. Existing `@skip` tags do not affect route counts.

| Feature                                    | Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| ------------------------------------------ | -------------------: | ------------: | -------------: | ----------: |
| annotations-across-blocks.feature          |                   13 |            13 |             13 |          12 |
| annotations-collaboration.feature          |                    1 |             1 |              0 |           0 |
| annotations-edge-cases.feature             |                    4 |             4 |              4 |           4 |
| annotations-overlapping-decorators.feature |                   13 |            32 |             32 |          25 |
| annotations-overlapping.feature            |                    9 |            14 |             14 |           6 |
| annotations.feature                        |                   16 |            33 |             32 |          19 |
| block-objects.feature                      |                   12 |            15 |              4 |           4 |
| decorators-overlapping.feature             |                    4 |             4 |              4 |           0 |
| decorators.feature                         |                   21 |            50 |             40 |          33 |
| delete.feature                             |                   14 |            26 |              5 |           5 |
| inline-objects.feature                     |                    6 |             6 |              4 |           1 |
| insert.block.feature                       |                   24 |           208 |            208 |         133 |
| insert.blocks.feature                      |                    7 |            38 |             38 |          26 |
| insert.break.feature                       |                    5 |             9 |              8 |           8 |
| insert.child.feature                       |                    5 |             6 |              6 |           0 |
| insert.text.feature                        |                    1 |             4 |              4 |           4 |
| lists.feature                              |                   25 |            37 |             34 |          10 |
| paste.feature                              |                    3 |             6 |              0 |           0 |
| removing-blocks.feature                    |                    2 |             2 |              1 |           1 |
| selection-adjustment.feature               |                    3 |             3 |              0 |           0 |
| selection.feature                          |                    4 |             4 |              0 |           0 |
| splitting-blocks.feature                   |                   18 |            25 |             19 |          19 |
| undo-redo.feature                          |                   16 |            16 |              9 |           7 |

## Every used step text

### annotations-across-blocks.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   13 |            13 |             13 |          12 |

| Step type and text                                                     | Route  | Definition / reason                                                                                                  |
| ---------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Context: one editor                                                    | Page   | one editor — Editor setup, selection or editor.send                                                                  |
| Context: a global keymap                                               | Page   | a global keymap — Editor setup, selection or editor.send                                                             |
| Context: the editor state is "B: "                                     | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the editor is focused                                          | Page   | the editor is focused — Editor setup, selection or editor.send                                                       |
| Action: "foo" is typed                                                 | Gboard | {string} is typed — compose text support (English)                                                                   |
| Action: "{Enter}" is pressed                                           | Gboard | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "bar" is typed                                                 | Gboard | {string} is typed — compose text support (English)                                                                   |
| Action: "foobar" is selected                                           | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Action: "link" "l1,l2" is toggled                                      | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send                                           |
| Outcome: the editor state is                                           | Page   | the editor state is — Page state assertion                                                                           |
| Action: "foobar" is selected backwards                                 | Page   | {string} is selected backwards — Editor setup, selection or editor.send                                              |
| Action: "foo\|{image}" is inserted at "auto" and selected at the "end" | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Context: the editor state is "B: foobar"                               | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Context: a "link" "l1" around "foobar"                                 | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send                                 |
| Action: the caret is put after "foo"                                   | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Context: the editor state is "B: foo bar baz"                          | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Context: a "link" "l1" around "foo bar baz"                            | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send                                 |
| Action: "bar" is selected                                              | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Context: "strong" around "bar"                                         | Page   | {decorator} around {string} — Editor setup, selection or editor.send                                                 |
| Context: a "link" "l1" around "foo"                                    | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send                                 |
| Action: the caret is put after "bar"                                   | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Action: "{Backspace}" is pressed                                       | Gboard | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "link" is toggled                                              | Page   | {annotation} is toggled — Editor setup, selection or editor.send                                                     |
| Context: the editor state is "B: foo"                                  | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the caret is put before "foo"                                  | Page   | the caret is put before {string} — Editor setup, selection or editor.send                                            |
| Outcome: the editor state is "B: ;;B: [@link _key=\"l1\":foo]"         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo];;B: "         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is selected                                              | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Action: "link" "l1" is toggled                                         | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send                                           |
| Action: "link" "l2" is toggled                                         | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send                                           |
| Action: the caret is put before "bar"                                  | Page   | the caret is put before {string} — Editor setup, selection or editor.send                                            |

### annotations-collaboration.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    1 |             1 |              0 |           0 |

| Step type and text                              | Route        | Definition / reason                                                                    |
| ----------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| Context: two editors                            | Not drivable | two editors — Clipboard, hardware, drag or two editors                                 |
| Context: a global keymap                        | Page         | a global keymap — Editor setup, selection or editor.send                               |
| Action: the editor is focused                   | Page         | the editor is focused — Editor setup, selection or editor.send                         |
| Action: "foo" is typed                          | Gboard       | {string} is typed — compose text support (English)                                     |
| Action: "foo" is selected                       | Page         | {string} is selected — Editor setup, selection or editor.send                          |
| Action: "comment" "c1" is toggled               | Page         | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send             |
| Action: the caret is put after "foo"            | Page         | the caret is put after {string} — Editor setup, selection or editor.send               |
| Action: "{Backspace}" is pressed                | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                              |
| Action: Editor B is focused                     | Not drivable | Editor B is focused — Clipboard, hardware, drag or two editors                         |
| Action: the caret is put after "fo" in Editor B | Not drivable | the caret is put after {string} in Editor B — Clipboard, hardware, drag or two editors |
| Action: "a" is typed in Editor B                | Not drivable | {string} is typed in Editor B — Clipboard, hardware, drag or two editors               |
| Outcome: the text is "fo,a"                     | Page         | the text is {terse-pt} — Page state assertion                                          |
| Outcome: "fo" has marks "c1"                    | Page         | {string} has marks {marks} — Page state assertion                                      |
| Outcome: "a" has no marks                       | Page         | {string} has no marks — Page state assertion                                           |

### annotations-edge-cases.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    4 |             4 |              4 |           4 |

| Step type and text                             | Route  | Definition / reason                                                                  |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Context: one editor                            | Page   | one editor — Editor setup, selection or editor.send                                  |
| Context: a global keymap                       | Page   | a global keymap — Editor setup, selection or editor.send                             |
| Context: the editor state is "B: foo bar baz"  | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: "em" around "foo bar baz"             | Page   | {decorator} around {string} — Editor setup, selection or editor.send                 |
| Context: a "comment" "c1" around "bar"         | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: the editor is focused                  | Page   | the editor is focused — Editor setup, selection or editor.send                       |
| Action: "foo bar baz" is selected              | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "{Backspace}" is pressed               | Gboard | {button} is pressed — Gboard has Enter and Backspace only                            |
| Outcome: the editor state is "B: [em:]"        | Page   | the editor state is {string} — Page state assertion                                  |
| Context: a "comment" "c1" around "foo bar baz" | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: " baz" is selected                     | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Outcome: the editor state is                   | Page   | the editor state is — Page state assertion                                           |
| Action: "bar " is selected                     | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Outcome: the editor state is "B: foo baz"      | Page   | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: "             | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: "foo" is typed                         | Gboard | {string} is typed — compose text support (English)                                   |
| Action: "{Enter}" is pressed                   | Gboard | {button} is pressed — Gboard has Enter and Backspace only                            |
| Action: "bar" is typed                         | Gboard | {string} is typed — compose text support (English)                                   |
| Action: "foo" is selected                      | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "link" "l1" is toggled                 | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |
| Action: "bar" is selected                      | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "link" "l2" is toggled                 | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |
| Action: "ooba" is selected                     | Page   | {string} is selected — Editor setup, selection or editor.send                        |

### annotations-overlapping-decorators.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   13 |            32 |             32 |          25 |

| Step type and text                                                                                                    | Route  | Definition / reason                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Context: one editor                                                                                                   | Page   | one editor — Editor setup, selection or editor.send                                  |
| Context: a global keymap                                                                                              | Page   | a global keymap — Editor setup, selection or editor.send                             |
| Context: the editor state is "B: foo bar baz"                                                                         | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "bar"                                                                                   | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Context: "strong" around "bar"                                                                                        | Page   | {decorator} around {string} — Editor setup, selection or editor.send                 |
| Action: the editor is focused                                                                                         | Page   | the editor is focused — Editor setup, selection or editor.send                       |
| Action: the caret is put after "foo "                                                                                 | Page   | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: "new" is typed                                                                                                | Gboard | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: foo new[strong:[@link _key=\"l1\":bar]] baz"                                         | Page   | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put before "bar"                                                                                 | Page   | the caret is put before {string} — Editor setup, selection or editor.send            |
| Action: the caret is put after "bar"                                                                                  | Page   | the caret is put after {string} — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: foo [strong:[@link _key=\"l1\":bar]]new baz"                                         | Page   | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put before " baz"                                                                                | Page   | the caret is put before {string} — Editor setup, selection or editor.send            |
| Context: the editor state is "B: foo"                                                                                 | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "foo"                                                                                   | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Context: "strong" around "foo"                                                                                        | Page   | {decorator} around {string} — Editor setup, selection or editor.send                 |
| Action: the caret is put before "foo"                                                                                 | Page   | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: new[strong:[@link _key=\"l1\":foo]]"                                                 | Page   | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put after "foo"                                                                                  | Page   | the caret is put after {string} — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: [strong:[@link _key=\"l1\":foo]]new"                                                 | Page   | the editor state is {string} — Page state assertion                                  |
| Context: a "link" "l1" around "foo bar baz"                                                                           | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo new]strong:[@link _key=\"l1\":bar]][@link _key=\"l1\": baz]"  | Page   | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo ]strong:[@link _key=\"l1\":barnew]][@link _key=\"l1\": baz]"  | Page   | the editor state is {string} — Page state assertion                                  |
| Context: "strong" around "foo bar baz"                                                                                | Page   | {decorator} around {string} — Editor setup, selection or editor.send                 |
| Outcome: the editor state is "B: [strong:foo new]strong:[@link _key=\"l1\":bar]][strong: baz]"                        | Page   | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: [strong:foo ]strong:[@link _key=\"l1\":bar]][strong:new baz]"                        | Page   | the editor state is {string} — Page state assertion                                  |
| Action: "strong" is toggled                                                                                           | Page   | {decorator} is toggled — Editor setup, selection or editor.send                      |
| Outcome: the editor state is "B: foo [strong:new\|]strong:[@link _key=\"l1\":bar]] baz"                               | Page   | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: foo [strong:[@link \_key=\"l1\":bar]][strong:new\|] baz"                             | Page   | the editor state is {string} — Page state assertion                                  |
| Action: "bar" is selected                                                                                             | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "removed" is typed                                                                                            | Gboard | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: foo [strong:removed] baz"                                                            | Page   | the editor state is {string} — Page state assertion                                  |
| Action: "bar" is selected backwards                                                                                   | Page   | {string} is selected backwards — Editor setup, selection or editor.send              |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo ]strong:[@link _key=\"l1\":removed]][@link _key=\"l1\": baz]" | Page   | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: bar"                                                                                 | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: "{Enter}" is pressed                                                                                          | Gboard | {button} is pressed — Gboard has Enter and Backspace only                            |
| Outcome: the editor state is "B: ;;B: [strong:[@link _key=\"l1\":bar]]"                                               | Page   | the editor state is {string} — Page state assertion                                  |
| Action: "baz" is typed                                                                                                | Gboard | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is                                                                                          | Page   | the editor state is — Page state assertion                                           |
| Context: the editor state is "B: foobar"                                                                              | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: "link" "l1" is toggled                                                                                        | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |
| Action: "foo bar baz" is selected                                                                                     | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "foob" is selected                                                                                            | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "foob" is selected backwards                                                                                  | Page   | {string} is selected backwards — Editor setup, selection or editor.send              |
| Action: "obar" is selected                                                                                            | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "obar" is selected backwards                                                                                  | Page   | {string} is selected backwards — Editor setup, selection or editor.send              |

### annotations-overlapping.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    9 |            14 |             14 |           6 |

| Step type and text                                                                                                                    | Route  | Definition / reason                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Context: one editor                                                                                                                   | Page   | one editor — Editor setup, selection or editor.send                                  |
| Context: a global keymap                                                                                                              | Page   | a global keymap — Editor setup, selection or editor.send                             |
| Context: the editor state is "B: foo bar baz"                                                                                         | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "foo bar baz"                                                                                           | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Context: a "comment" "c1" around "bar"                                                                                                | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: the editor is focused                                                                                                         | Page   | the editor is focused — Editor setup, selection or editor.send                       |
| Action: the caret is put after "foo "                                                                                                 | Page   | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: "new" is typed                                                                                                                | Gboard | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo new]@link \_key=\"l1\":[@comment _key=\"c1\":bar]][@link _key=\"l1\": baz]"   | Page   | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put before "bar"                                                                                                 | Page   | the caret is put before {string} — Editor setup, selection or editor.send            |
| Action: the caret is put after "bar"                                                                                                  | Page   | the caret is put after {string} — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo ]@link \_key=\"l1\":[@comment _key=\"c1\":bar]][@link _key=\"l1\":new\| baz]" | Page   | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put before " baz"                                                                                                | Page   | the caret is put before {string} — Editor setup, selection or editor.send            |
| Context: the editor state is "B: foo"                                                                                                 | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "foo"                                                                                                   | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Context: a "comment" "c1" around "foo"                                                                                                | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: the caret is put before "foo"                                                                                                 | Page   | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: new\|[@link \_key=\"l1\":[@comment _key=\"c1\":foo]]"                                                | Page   | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put after "foo"                                                                                                  | Page   | the caret is put after {string} — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: [@link \_key=\"l1\":[@comment _key=\"c1\":foo]]new\|"                                                | Page   | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: foobar"                                                                                              | Page   | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "bar"                                                                                                   | Page   | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "foob" is selected                                                                                                            | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "comment" "c1" is toggled                                                                                                     | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |
| Outcome: the editor state is                                                                                                          | Page   | the editor state is — Page state assertion                                           |
| Action: "foob" is selected backwards                                                                                                  | Page   | {string} is selected backwards — Editor setup, selection or editor.send              |
| Action: "obar" is selected                                                                                                            | Page   | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "link" "l1" is toggled                                                                                                        | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |
| Action: "obar" is selected backwards                                                                                                  | Page   | {string} is selected backwards — Editor setup, selection or editor.send              |
| Action: "comment" "c2" is toggled                                                                                                     | Page   | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |

### annotations.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   16 |            33 |             32 |          19 |

| Step type and text                                                               | Route        | Definition / reason                                                                  |
| -------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| Context: one editor                                                              | Page         | one editor — Editor setup, selection or editor.send                                  |
| Context: a global keymap                                                         | Page         | a global keymap — Editor setup, selection or editor.send                             |
| Context: the editor state is "B: foo bar baz"                                    | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: "bar" is selected                                                        | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "link" "l1" is toggled                                                   | Page         | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send           |
| Outcome: the editor state is                                                     | Page         | the editor state is — Page state assertion                                           |
| Context: the editor state is "B: foo"                                            | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "foo"                                              | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: the editor is focused                                                    | Page         | the editor is focused — Editor setup, selection or editor.send                       |
| Action: the caret is put after "foo"                                             | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: "bar" is typed                                                           | Gboard       | {string} is typed — compose text support (English)                                   |
| Action: the caret is put before "bar"                                            | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: foo [@link _key=\"l1\":^bar\|] baz"             | Page         | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put after "bar"                                             | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: the caret is put after "ar"                                              | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Context: "strong" around "bar"                                                   | Page         | {decorator} around {string} — Editor setup, selection or editor.send                 |
| Action: the caret is put before "az"                                             | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Context: a "link" "l1" around "foo bar baz"                                      | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "baz" is selected                                                        | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "link" is toggled                                                        | Page         | {annotation} is toggled — Editor setup, selection or editor.send                     |
| Context: a "link" "l1" around "foo "                                             | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Context: a "link" "l2" around "bar baz"                                          | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: the caret is put before "baz"                                            | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: foo [strong:bar] \|baz"                         | Page         | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: foo bar baz boo baa"                            | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "foo bar baz boo baa"                              | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "boo" is selected                                                        | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Action: the caret is put before "aa"                                             | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Context: "strong" around "boo"                                                   | Page         | {decorator} around {string} — Editor setup, selection or editor.send                 |
| Action: the caret is put before "oo "                                            | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Action: the caret is put before "oo"                                             | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: foo bar baz"                                    | Page         | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put after "o b"                                             | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: the caret is put after "ba"                                              | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Context: a "comment" "c1" around "bar"                                           | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "removed" is typed                                                       | Gboard       | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: foo removed\| baz"                              | Page         | the editor state is {string} — Page state assertion                                  |
| Action: "bar" is selected backwards                                              | Page         | {string} is selected backwards — Editor setup, selection or editor.send              |
| Action: "ar" is selected                                                         | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Outcome: the editor state is "B: foo [@comment _key=\"c1\":b]removed\| baz"      | Page         | the editor state is {string} — Page state assertion                                  |
| Action: "ar" is selected backwards                                               | Page         | {string} is selected backwards — Editor setup, selection or editor.send              |
| Context: the editor state is "B: foo baz"                                        | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l1" around "foo baz"                                          | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: " bar" is typed                                                          | Gboard       | {string} is typed — compose text support (English)                                   |
| Context: a "link" "l1" around "bar"                                              | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: the caret is put after "foo "                                            | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: "new" is typed                                                           | Gboard       | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: foo new[@link _key=\"l1\":bar] baz"             | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: foo [@link _key=\"l1\":bar]new\| baz"           | Page         | the editor state is {string} — Page state assertion                                  |
| Action: the caret is put before " baz"                                           | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Action: the caret is put before "foo"                                            | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: new\|[@link _key=\"l1\":foo]"                   | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: [@link _key=\"l1\":foo]new\|"                   | Page         | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: foobar"                                         | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "link" "l2" around "bar"                                              | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "n" is typed                                                             | Gboard       | {string} is typed — compose text support (English)                                   |
| Action: a "stock-ticker" is inserted                                             | Page         | a(n) {inline-object} is inserted — Editor setup, selection or editor.send            |
| Action: "{ArrowRight}" is pressed                                                | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                            |
| Action: "foo " is typed                                                          | Gboard       | {string} is typed — compose text support (English)                                   |
| Action: "strong" is toggled                                                      | Page         | {decorator} is toggled — Editor setup, selection or editor.send                      |
| Outcome: the editor state is "B: foo [strong:new\|][@link _key=\"l1\":bar] baz"  | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: foo [@link \_key=\"l1\":bar][strong:new\|] baz" | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: [strong:new\|][@link _key=\"l1\":foo]"          | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: [@link \_key=\"l1\":foo][strong:new\|]"         | Page         | the editor state is {string} — Page state assertion                                  |

### block-objects.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   12 |            15 |              4 |           4 |

| Step type and text                                                     | Route        | Definition / reason                                                                                                  |
| ---------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Context: one editor                                                    | Page         | one editor — Editor setup, selection or editor.send                                                                  |
| Context: a global keymap                                               | Page         | a global keymap — Editor setup, selection or editor.send                                                             |
| Context: the editor state is "{IMAGE}"                                 | Page         | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the editor is focused                                          | Page         | the editor is focused — Editor setup, selection or editor.send                                                       |
| Action: "{ArrowUp}" is pressed                                         | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Outcome: the editor state is                                           | Page         | the editor state is — Page state assertion                                                                           |
| Action: "{ArrowDown}" is pressed                                       | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "foo\|{image}" is inserted at "auto" and selected at the "end" | Page         | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Context: the editor state is                                           | Page         | the editor state is — Editor setup, selection or editor.send                                                         |
| Action: the caret is put after "foo"                                   | Page         | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Action: "{ArrowRight}" is pressed                                      | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Outcome: "{image}" is selected                                         | Page         | {terse-pt} is selected — Page state assertion                                                                        |
| Action: the caret is put before "bar"                                  | Page         | the caret is put before {string} — Editor setup, selection or editor.send                                            |
| Action: "{ArrowLeft}" is pressed                                       | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "{Delete}" is pressed                                          | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: the caret is put before "foo"                                  | Page         | the caret is put before {string} — Editor setup, selection or editor.send                                            |
| Action: "{Delete}" is pressed 4 times                                  | Not drivable | {button} is pressed {int} times — Gboard has Enter and Backspace only                                                |
| Action: "{Enter}" is pressed                                           | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "{Backspace}" is pressed                                       | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "foo" is typed                                                 | Gboard       | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "B: foo\|"                                | Page         | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put after "b"                                     | Page         | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Action: "{Backspace}" is pressed 2 times                               | Gboard       | {button} is pressed {int} times — Gboard has Enter and Backspace only                                                |
| Action: "bar" is typed                                                 | Gboard       | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "B: foobar\|"                             | Page         | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put before "b"                                    | Page         | the caret is put before {string} — Editor setup, selection or editor.send                                            |
| Action: "{Delete}" is pressed 2 times                                  | Not drivable | {button} is pressed {int} times — Gboard has Enter and Backspace only                                                |
| Outcome: the editor state is "B: bar\|foo"                             | Page         | the editor state is {string} — Page state assertion                                                                  |

### decorators-overlapping.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    4 |             4 |              4 |           0 |

| Step type and text                                   | Route | Definition / reason                                                     |
| ---------------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| Context: one editor                                  | Page  | one editor — Editor setup, selection or editor.send                     |
| Context: the editor state is "B: foobar"             | Page  | the editor state is {string} — Editor setup, selection or editor.send   |
| Context: "strong" around "bar"                       | Page  | {decorator} around {string} — Editor setup, selection or editor.send    |
| Action: "foob" is selected                           | Page  | {string} is selected — Editor setup, selection or editor.send           |
| Action: "strong" is toggled                          | Page  | {decorator} is toggled — Editor setup, selection or editor.send         |
| Outcome: the editor state is "B: [strong:^foob\|ar]" | Page  | the editor state is {string} — Page state assertion                     |
| Action: "foob" is selected backwards                 | Page  | {string} is selected backwards — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: [strong:\|foob^ar]" | Page  | the editor state is {string} — Page state assertion                     |
| Context: "strong" around "foo"                       | Page  | {decorator} around {string} — Editor setup, selection or editor.send    |
| Action: "obar" is selected                           | Page  | {string} is selected — Editor setup, selection or editor.send           |
| Outcome: the editor state is "B: [strong:fo^obar\|]" | Page  | the editor state is {string} — Page state assertion                     |
| Action: "obar" is selected backwards                 | Page  | {string} is selected backwards — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: [strong:fo\|obar^]" | Page  | the editor state is {string} — Page state assertion                     |

### decorators.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   21 |            50 |             40 |          33 |

| Step type and text                                                      | Route        | Definition / reason                                                       |
| ----------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Context: one editor                                                     | Page         | one editor — Editor setup, selection or editor.send                       |
| Context: the editor state is "B: foo bar baz"                           | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the editor is focused                                           | Page         | the editor is focused — Editor setup, selection or editor.send            |
| Action: "bar" is selected                                               | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Action: "strong" is toggled                                             | Page         | {decorator} is toggled — Editor setup, selection or editor.send           |
| Action: the caret is put after "foo "                                   | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Action: "new" is typed                                                  | Gboard       | {string} is typed — compose text support (English)                        |
| Outcome: the editor state is "B: foo new[strong:bar] baz"               | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put before "bar"                                   | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Action: the caret is put after "bar"                                    | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo [strong:barnew] baz"               | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put before " baz"                                  | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Context: the editor state is "B: foo"                                   | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: "foo" is selected                                               | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Action: the caret is put before "foo"                                   | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: [strong:newfoo]"                       | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "foo"                                    | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: [strong:foonew]"                       | Page         | the editor state is {string} — Page state assertion                       |
| Context: "em" around "bar"                                              | Page         | {decorator} around {string} — Editor setup, selection or editor.send      |
| Outcome: the editor state is "B: foo [strong:new\|][em:bar] baz"        | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo [em:bar]em:[strong:new\|]] baz"    | Page         | the editor state is {string} — Page state assertion                       |
| Context: "em" around "foo"                                              | Page         | {decorator} around {string} — Editor setup, selection or editor.send      |
| Outcome: the editor state is "B: [em:[strong:new\|]][em:foo]"           | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: [em:foo]em:[strong:new\|]]"            | Page         | the editor state is {string} — Page state assertion                       |
| Action: "removed" is typed                                              | Gboard       | {string} is typed — compose text support (English)                        |
| Outcome: the editor state is "B: foo [strong:removed\|] baz"            | Page         | the editor state is {string} — Page state assertion                       |
| Action: "foo bar baz" is selected                                       | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Action: "em" is toggled                                                 | Page         | {decorator} is toggled — Editor setup, selection or editor.send           |
| Outcome: the editor state is "B: [em:foo ]em:[strong:^bar\|]][em: baz]" | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: [em:foo ^bar\| baz]"                   | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: "                                      | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the caret is put after ""                                       | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Action: "foo" is typed                                                  | Gboard       | {string} is typed — compose text support (English)                        |
| Action: "bar" is typed                                                  | Gboard       | {string} is typed — compose text support (English)                        |
| Outcome: the editor state is "B: foo[strong:bar\|]"                     | Page         | the editor state is {string} — Page state assertion                       |
| Action: "foo " is typed                                                 | Gboard       | {string} is typed — compose text support (English)                        |
| Action: " baz" is typed                                                 | Gboard       | {string} is typed — compose text support (English)                        |
| Outcome: the editor state is "B: [em:foo ]em:[strong:bar]][em: baz\|]"  | Page         | the editor state is {string} — Page state assertion                       |
| Action: "{ArrowLeft}" is pressed                                        | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |
| Action: "{ArrowRight}" is pressed                                       | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |
| Outcome: the editor state is "B: foobar\|"                              | Page         | the editor state is {string} — Page state assertion                       |
| Action: "{Backspace}" is pressed 3 times                                | Gboard       | {button} is pressed {int} times — Gboard has Enter and Backspace only     |
| Outcome: the editor state is "B: [strong:bar]"                          | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: foo;;B: bar"                           | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: "foobar" is selected "forwards"                                 | Page         | {string} is selected {direction} — Editor setup, selection or editor.send |
| Action: "{Backspace}" is pressed                                        | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                 |
| Outcome: the editor state is "B: \|"                                    | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is before ""                                         | Page         | the caret is before {string} — Page state assertion                       |
| Action: "{Delete}" is pressed                                           | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |
| Action: "foobar" is selected "backwards"                                | Page         | {string} is selected {direction} — Editor setup, selection or editor.send |
| Context: the editor state is "B: foo;;{IMAGE};;B: bar"                  | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Outcome: the editor state is "B: [strong:\|]"                           | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is                                            | Page         | the editor state is — Editor setup, selection or editor.send              |
| Action: "foobar" is selected                                            | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Action: "baz" is typed                                                  | Gboard       | {string} is typed — compose text support (English)                        |
| Outcome: the editor state is "B: baz\|"                                 | Page         | the editor state is {string} — Page state assertion                       |
| Action: "{Enter}" is pressed 2 times                                    | Gboard       | {button} is pressed {int} times — Gboard has Enter and Backspace only     |
| Outcome: the editor state is                                            | Page         | the editor state is — Page state assertion                                |
| Outcome: the editor state is "B: foo;;B: ;;B: bar\|"                    | Page         | the editor state is {string} — Page state assertion                       |
| Action: "ooba" is selected                                              | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: f^oo;;B: ;;B: ba\|r"                   | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: ;;B: foo"                              | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: everything is selected                                          | Page         | everything is selected — Editor setup, selection or editor.send           |
| Outcome: the editor state is "B: [strong:^];;B: [strong:foo\|]"         | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: ^;;B: foo\|"                           | Page         | the editor state is {string} — Page state assertion                       |
| Action: everything is selected backwards                                | Page         | everything is selected backwards — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: [strong:\|];;B: [strong:foo^]"         | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: \|;;B: foo^"                           | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: foo;;B: "                              | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Outcome: the editor state is "B: [strong:^foo];;B: [strong:\|]"         | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: ^foo;;B: \|"                           | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: [strong:\|foo];;B: [strong:^]"         | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: \|foo;;B: ^"                           | Page         | the editor state is {string} — Page state assertion                       |
| Context: "strong" around "foo"                                          | Page         | {decorator} around {string} — Editor setup, selection or editor.send      |
| Action: "{Enter}" is pressed                                            | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                 |
| Context: "strong" around "bar"                                          | Page         | {decorator} around {string} — Editor setup, selection or editor.send      |
| Outcome: the editor state is "B: foo ;;B: [strong:\|bar] baz"           | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is before "bar"                                      | Page         | the caret is before {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo [strong:bar];;B: \| baz"           | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is before " baz"                                     | Page         | the caret is before {string} — Page state assertion                       |
| Context: the editor state is "B: foobar"                                | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Outcome: the editor state is "B: [strong:foo][em:bar\|]"                | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: [strong:[em:foo^bar\|]]"               | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "{IMAGE};;B: foo;;B: "                     | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Outcome: the editor state is "{IMAGE};;B: foo;;B: "                     | Page         | the editor state is {string} — Page state assertion                       |

### delete.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   14 |            26 |              5 |           5 |

| Step type and text                                    | Route        | Definition / reason                                                       |
| ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Context: one editor                                   | Page         | one editor — Editor setup, selection or editor.send                       |
| Context: the editor state is "B: foo;;B: bar"         | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the editor is focused                         | Page         | the editor is focused — Editor setup, selection or editor.send            |
| Action: "foo" is selected                             | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Action: "{Delete}" is pressed                         | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |
| Action: "new" is typed                                | Gboard       | {string} is typed — compose text support (English)                        |
| Outcome: the editor state is "B: new\|;;B: bar"       | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: foo;;B: bar;;B: baz" | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: "foobar" is selected                          | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: new\|;;B: baz"       | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: foo bar baz"         | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the caret is put after "bar"                  | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Action: "deleteWord.backward" is pressed              | Not drivable | {shortcut} is pressed — Clipboard, hardware, drag or two editors          |
| Outcome: the editor state is "B: foo \| baz"          | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "bar "                 | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo \|baz"           | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "foo ba"               | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo \|r baz"         | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put before "bar"                 | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Action: "deleteWord.forward" is pressed               | Not drivable | {shortcut} is pressed — Clipboard, hardware, drag or two editors          |
| Action: the caret is put before " bar"                | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo\| baz"           | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put before "ar baz"              | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo b\| baz"         | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: कि"                  | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the caret is put after "कि"                   | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Action: "{Backspace}" is pressed                      | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                 |
| Outcome: the editor state is "B: क\|"                 | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: কি"                  | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the caret is put after "কি"                   | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: ক\|"                 | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: กิ"                  | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the caret is put after "กิ"                   | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: ก\|"                 | Page         | the editor state is {string} — Page state assertion                       |
| Action: "deleteLine.backward" is pressed              | Not drivable | {shortcut} is pressed — Clipboard, hardware, drag or two editors          |
| Outcome: the editor state is "B: \| baz"              | Page         | the editor state is {string} — Page state assertion                       |
| Action: undo is performed                             | Page         | undo is performed — Editor setup, selection or editor.send                |
| Outcome: the editor state is "B: foo bar\| baz"       | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "baz"                  | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: \|"                  | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo bar baz\|"       | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "foo "                 | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: \|bar baz"           | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo \|bar baz"       | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is                          | Page         | the editor state is — Editor setup, selection or editor.send              |
| Outcome: the editor state is "B: foo\|bar"            | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is                          | Page         | the editor state is — Page state assertion                                |
| Action: "bar" is selected                             | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Action: cut is performed                              | Not drivable | cut is performed — Clipboard, hardware, drag or two editors               |
| Outcome: the editor state is "B: foo ^bar\| baz"      | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "foo"                  | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Context: the editor state is "B: "                    | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Context: "strong" around "bar"                        | Page         | {decorator} around {string} — Editor setup, selection or editor.send      |
| Outcome: the editor state is "B: foo[strong:\|bar]"   | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo\|[strong:bar]"   | Page         | the editor state is {string} — Page state assertion                       |

### inline-objects.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    6 |             6 |              4 |           1 |

| Step type and text                                                          | Route        | Definition / reason                                                        |
| --------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| Context: one editor                                                         | Page         | one editor — Editor setup, selection or editor.send                        |
| Context: a global keymap                                                    | Page         | a global keymap — Editor setup, selection or editor.send                   |
| Context: the editor state is "B: "                                          | Page         | the editor state is {string} — Editor setup, selection or editor.send      |
| Action: the editor is focused                                               | Page         | the editor is focused — Editor setup, selection or editor.send             |
| Action: "foo" is typed                                                      | Gboard       | {string} is typed — compose text support (English)                         |
| Action: a "stock-ticker" is inserted                                        | Page         | a(n) {inline-object} is inserted — Editor setup, selection or editor.send  |
| Action: "{ArrowRight}" is pressed                                           | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                  |
| Action: "bar" is typed                                                      | Gboard       | {string} is typed — compose text support (English)                         |
| Outcome: the editor state is "B: foo{stock-ticker}bar\|"                    | Page         | the editor state is {string} — Page state assertion                        |
| Context: the editor state is "B: foo{stock-ticker}"                         | Page         | the editor state is {string} — Editor setup, selection or editor.send      |
| Action: the caret is put after "foo"                                        | Page         | the caret is put after {string} — Editor setup, selection or editor.send   |
| Action: "{Delete}" is pressed                                               | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                  |
| Outcome: the editor state is "B: foo\|"                                     | Page         | the editor state is {string} — Page state assertion                        |
| Action: "{Backspace}" is pressed                                            | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                  |
| Outcome: the caret is after "foo"                                           | Page         | the caret is after {string} — Page state assertion                         |
| Context: the editor state is "B: foo{stock-ticker}bar"                      | Page         | the editor state is {string} — Editor setup, selection or editor.send      |
| Action: "foobar" is selected                                                | Page         | {string} is selected — Editor setup, selection or editor.send              |
| Action: "strong" is toggled                                                 | Page         | {decorator} is toggled — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: [strong:^foo]{stock-ticker}[strong:bar\|]" | Page         | the editor state is {string} — Page state assertion                        |
| Action: "link" "l1" is toggled                                              | Page         | {annotation} {keyKeys} is toggled — Editor setup, selection or editor.send |
| Outcome: the editor state is                                                | Page         | the editor state is — Page state assertion                                 |
| Action: "link" is toggled                                                   | Page         | {annotation} is toggled — Editor setup, selection or editor.send           |
| Outcome: the editor state is "B: ^foo{stock-ticker}bar\|"                   | Page         | the editor state is {string} — Page state assertion                        |

### insert.block.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   24 |           208 |            208 |         133 |

| Step type and text                                                    | Route  | Definition / reason                                                                                                  |
| --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Context: one editor                                                   | Page   | one editor — Editor setup, selection or editor.send                                                                  |
| Action: "{image}" is inserted at "before" and selected at the "none"  | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{IMAGE};;B: "                           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: nothing is selected                                          | Page   | nothing is selected — Page state assertion                                                                           |
| Action: "{image}" is inserted at "after" and selected at the "none"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;{IMAGE}"                           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "auto" and selected at the "none"    | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{IMAGE}"                                | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: the editor is focused                                         | Page   | the editor is focused — Editor setup, selection or editor.send                                                       |
| Action: "{image}" is inserted at "before" and selected at the "start" | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "bar" is typed                                                | Gboard | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "^{IMAGE}\|;;B: "                        | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "after" and selected at the "start"  | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;^{IMAGE}\|"                        | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "auto" and selected at the "start"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "^{IMAGE}\|"                             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "before" and selected at the "end"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "{image}" is inserted at "after" and selected at the "end"    | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "{image}" is inserted at "auto" and selected at the "end"     | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Context: the editor state is "B: f"                                   | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: "{Backspace}" is pressed                                      | Gboard | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Outcome: the editor state is "{IMAGE};;B: bar\|"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar\|;;{IMAGE}"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "h1:" is inserted at "auto" and selected at the "none"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{IMAGE};;B style=\"h1\": "              | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B style=\"h1\": ;;{IMAGE}"              | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: ">-:" is inserted at "auto" and selected at the "none"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{IMAGE};;B listItem=\"bullet\": "       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B listItem=\"bullet\": ;;{IMAGE}"       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is "B: foo"                                 | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: "foo" is selected                                             | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: "{image}" is selected                                        | Page   | {terse-pt} is selected — Page state assertion                                                                        |
| Action: "f" is selected                                               | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: the editor state is "^{IMAGE}\|;;B: oo"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "oo" is selected                                              | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: the editor state is "B: f;;^{IMAGE}\|"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "^{IMAGE}\|;;B: foo"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foo;;^{IMAGE}\|"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "{IMAGE};;B: bar\|oo"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbar\|;;{IMAGE}"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "{IMAGE};;B: fbar\|"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar\|oo;;{IMAGE}"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{Enter}" is pressed                                          | Gboard | {button} is pressed — Gboard has Enter and Backspace only                                                            |
| Action: "foob" is selected                                            | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: the editor state is "^{IMAGE}\|;;B: ar"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "obar" is selected                                            | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: the editor state is "B: fo;;^{IMAGE}\|"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "^{IMAGE}\|;;B: foo;;B: bar"             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foo;;B: bar;;^{IMAGE}\|"             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is typed                                                | Gboard | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "{IMAGE};;B: baz\|ar"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fobaz\|;;{IMAGE}"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foobar" is selected                                          | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Action: "foo" is inserted at "before" and selected at the "none"      | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: "                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "after" and selected at the "none"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;B: foo"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "auto" and selected at the "none"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo"                                 | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "before" and selected at the "start"     | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: bar\|foo;;B: "                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "before" and selected at the "end"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foobar\|;;B: "                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foo;;B: bar\|"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "after" and selected at the "start"      | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;B: bar\|foo"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "after" and selected at the "end"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;B: foobar\|"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar\|;;B: foo"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "auto" and selected at the "start"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: bar\|foo"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo" is inserted at "auto" and selected at the "end"         | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foobar\|"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{break}" is inserted at "before" and selected at the "start" | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "^{BREAK}\|;;{IMAGE}"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: "{break}" is selected                                        | Page   | {terse-pt} is selected — Page state assertion                                                                        |
| Action: "{break}" is inserted at "before" and selected at the "end"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "{break}" is inserted at "before" and selected at the "none"  | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{BREAK};;^{IMAGE}\|"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{break}" is inserted at "after" and selected at the "start"  | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{IMAGE};;^{BREAK}\|"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{break}" is inserted at "auto" and selected at the "start"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "{break}" is inserted at "after" and selected at the "end"    | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "{break}" is inserted at "auto" and selected at the "end"     | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{BREAK};;{IMAGE}"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{break}" is inserted at "after" and selected at the "none"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "{IMAGE};;{BREAK}"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{break}" is inserted at "auto" and selected at the "none"    | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Context: the editor state is "{IMAGE}"                                | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Context: the editor state is                                          | Page   | the editor state is — Editor setup, selection or editor.send                                                         |
| Action: everything is selected                                        | Page   | everything is selected — Editor setup, selection or editor.send                                                      |
| Action: "foo" is typed                                                | Gboard | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "{BREAK};;B: foo\|;;{IMAGE};;{IMAGE}"    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "{BREAK};;B: foo\|"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "{IMAGE};;{IMAGE};;{BREAK};;B: foo\|"    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foo\|;;{BREAK}"                      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put before "foo"                                 | Page   | the caret is put before {string} — Editor setup, selection or editor.send                                            |
| Outcome: the editor state is "{IMAGE};;B: baz\|foo;;B: bar"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put after "f"                                    | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Outcome: the editor state is "{IMAGE};;B: fbaz\|oo;;B: bar"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put after "foo"                                  | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Outcome: the editor state is "{IMAGE};;B: foobaz\|;;B: bar"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: baz\|foo;;{IMAGE};;B: bar"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbaz\|oo;;{IMAGE};;B: bar"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foobaz\|;;{IMAGE};;B: bar"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbaz\|;;{IMAGE};;B: oo;;B: bar"      | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foo;;{IMAGE}"                        | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "{IMAGE};;B: foo"                        | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "before" and selected at the "none"      | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: bar;;B: foo\|"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the caret is after "foo"                                     | Page   | the caret is after {string} — Page state assertion                                                                   |
| Action: "bar" is inserted at "after" and selected at the "none"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo\|;;B: bar"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "auto" and selected at the "none"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo\|bar"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar;;B: \|foo"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the caret is before "foo"                                    | Page   | the caret is before {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: \|foo;;B: bar"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar;;B: f\|oo"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the caret is after "f"                                       | Page   | the caret is after {string} — Page state assertion                                                                   |
| Outcome: the editor state is "B: f\|oo;;B: bar"                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: f\|baroo"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "before" and selected at the "start"     | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baz\|bar;;B: foo"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "before" and selected at the "end"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: barbaz\|;;B: foo"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar;;B: foobaz\|"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "after" and selected at the "start"      | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: baz\|bar"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "after" and selected at the "end"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: barbaz\|"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foobaz\|;;B: bar"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "auto" and selected at the "start"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foobaz\|bar"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar" is inserted at "auto" and selected at the "end"         | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foobarbaz\|"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar;;B: baz\|foo"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: baz\|foo;;B: bar"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: baz\|barfoo"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: barbaz\|foo"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: bar;;B: fbaz\|oo"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbaz\|oo;;B: bar"                    | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbaz\|baroo"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbarbaz\|oo"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: baz\|bar"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: baz\|baroo"                          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbaz\|bar"                           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: barbaz\|"                            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: barbaz\|oo"                          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbarbaz\|"                           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "before" and selected at the "start"     | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "new" is typed                                                | Gboard | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "B: new\|baz;;B: foo;;B: bar"            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "before" and selected at the "end"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baznew\|;;B: foo;;B: bar"            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "before" and selected at the "none"      | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baz;;B: new\|ar"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: baz;;B: fonew\|"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "after" and selected at the "start"      | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: bar;;B: new\|baz"            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "after" and selected at the "end"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: bar;;B: baznew\|"            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "after" and selected at the "none"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: new\|ar;;B: baz"                     | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "auto" and selected at the "start"       | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: new\|bazar"                          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fonew\|baz"                          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "auto" and selected at the "end"         | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baznew\|ar"                          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fobaznew\|"                          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "baz" is inserted at "auto" and selected at the "none"        | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "{image}" is inserted at "auto"                               | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Action: ",{stock-ticker}," is inserted at "before"                    | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "B: {stock-ticker}\|;;{IMAGE}"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: ",{stock-ticker}," is inserted at "after"                     | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "{IMAGE};;B: {stock-ticker}\|"           | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: ",{stock-ticker}," is inserted at "auto"                      | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Action: "{image}" is inserted at "before"                             | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "^{IMAGE}\|;;B: {stock-ticker}"          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "after"                              | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "B: {stock-ticker};;^{IMAGE}\|"          | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foo\|;;B: {stock-ticker}"            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: {stock-ticker};;B: \|foo"            | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: {stock-ticker}\|foo"                 | Page   | the editor state is {string} — Page state assertion                                                                  |

### insert.blocks.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    7 |            38 |             38 |          26 |

| Step type and text                                                              | Route  | Definition / reason                                                                                                  |
| ------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Context: one editor                                                             | Page   | one editor — Editor setup, selection or editor.send                                                                  |
| Action: the editor is focused                                                   | Page   | the editor is focused — Editor setup, selection or editor.send                                                       |
| Action: "foo\|bar" is inserted at "before" and selected at the "none"           | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "baz" is typed                                                          | Gboard | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "B: foo;;B: bar;;B: baz\|"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "before" and selected at the "start"          | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baz\|foo;;B: bar;;B: "                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "before" and selected at the "end"            | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: barbaz\|;;B: "                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "after" and selected at the "none"            | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baz\|;;B: foo;;B: bar"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "after" and selected at the "start"           | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;B: baz\|foo;;B: bar"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "after" and selected at the "end"             | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: ;;B: foo;;B: barbaz\|"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "auto" and selected at the "none"             | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: bar"                                   | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "auto" and selected at the "start"            | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: baz\|foo;;B: bar"                              | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "before"                                       | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "^{IMAGE}\|;;B: "                                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "after"                                        | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "B: ;;^{IMAGE}\|"                                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "auto"                                         | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "^{IMAGE}\|"                                       | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "{image}" is inserted at "auto" and selected at the "end"               | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "foo\|{break}\|bar" is inserted at "auto"                               | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is "{IMAGE};;B: foo;;{BREAK};;B: bar\|"               | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "foo\|bar" is inserted at "auto"                                        | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Outcome: the editor state is                                                    | Page   | the editor state is — Page state assertion                                                                           |
| Context: the editor state is "B: foo"                                           | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the caret is put before "foo"                                           | Page   | the caret is put before {string} — Editor setup, selection or editor.send                                            |
| Action: "bar\|{image}\|baz" is inserted at "before" and selected at the "start" | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Action: "new" is typed                                                          | Gboard | {string} is typed — compose text support (English)                                                                   |
| Outcome: the editor state is "B: new\|bar;;{IMAGE};;B: baz;;B: foo"             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar\|{image}\|baz" is inserted at "before" and selected at the "end"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: bar;;{IMAGE};;B: baznew\|;;B: foo"             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar\|{image}\|baz" is inserted at "after" and selected at the "start"  | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: new\|bar;;{IMAGE};;B: baz"             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar\|{image}\|baz" is inserted at "after" and selected at the "end"    | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo;;B: bar;;{IMAGE};;B: baznew\|"             | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar\|{image}\|baz" is inserted at "auto" and selected at the "start"   | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: new\|bar;;{IMAGE};;B: bazfoo"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: "bar\|{image}\|baz" is inserted at "auto" and selected at the "end"     | Page   | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: bar;;{IMAGE};;B: baznew\|foo"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put after "f"                                              | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Outcome: the editor state is "B: fnew\|bar;;{IMAGE};;B: bazoo"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: fbar;;{IMAGE};;B: baznew\|oo"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: the caret is put after "foo"                                            | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Outcome: the editor state is "B: foonew\|bar;;{IMAGE};;B: baz"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: foobar;;{IMAGE};;B: baznew\|"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is                                                    | Page   | the editor state is — Editor setup, selection or editor.send                                                         |
| Action: "fizz\|buzz" is inserted at "auto"                                      | Page   | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send                                       |
| Context: the editor state is "B: "                                              | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the caret is put after ""                                               | Page   | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Action: blocks are inserted at "auto" and selected at the "start"               | Page   | blocks are inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B: \|foo [@link:bar] baz"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Action: blocks are inserted at "auto" and selected at the "end"                 | Page   | blocks are inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B: foo [@link:bar] baz\|"                         | Page   | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is "B: existing"                                      | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: "is" is selected                                                        | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: the editor state is "B: ex\|foo [@link:bar] bazting"                   | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: exfoo [@link:bar] baz\|ting"                   | Page   | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is "B: existing;;B: text"                             | Page   | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: "ingte" is selected                                                     | Page   | {string} is selected — Editor setup, selection or editor.send                                                        |
| Outcome: the editor state is "B: exist\|foo [@link:bar] bazxt"                  | Page   | the editor state is {string} — Page state assertion                                                                  |
| Outcome: the editor state is "B: existfoo [@link:bar] baz\|xt"                  | Page   | the editor state is {string} — Page state assertion                                                                  |

### insert.break.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    5 |             9 |              8 |           8 |

| Step type and text                                      | Route        | Definition / reason                                                       |
| ------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Context: one editor                                     | Page         | one editor — Editor setup, selection or editor.send                       |
| Context: the editor state is "B: foo"                   | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the editor is focused                           | Page         | the editor is focused — Editor setup, selection or editor.send            |
| Action: the caret is put before "foo"                   | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Action: "{Enter}" is pressed                            | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                 |
| Action: "bar" is inserted                               | Page         | {string} is inserted — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: ;;B: bar\|foo"         | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is before "foo"                      | Page         | the caret is before {string} — Page state assertion                       |
| Action: the caret is put after "foo"                    | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo;;B: bar\|"         | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is after "bar"                       | Page         | the caret is after {string} — Page state assertion                        |
| Action: the caret is put after "f"                      | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: f;;B: bar\|oo"         | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is                            | Page         | the editor state is — Editor setup, selection or editor.send              |
| Action: the caret is put before "bar"                   | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Action: "baz" is inserted                               | Page         | {string} is inserted — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: foo;;B: ;;B: baz\|bar" | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is before "bar"                      | Page         | the caret is before {string} — Page state assertion                       |
| Action: undo is performed                               | Page         | undo is performed — Editor setup, selection or editor.send                |
| Outcome: the editor state is "B: foo;;B: \|bar"         | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "bar"                    | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo;;B: bar;;B: baz\|" | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the caret is after "baz"                       | Page         | the caret is after {string} — Page state assertion                        |
| Action: the caret is put after "b"                      | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo;;B: b;;B: baz\|ar" | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo;;B: b\|ar"         | Page         | the editor state is {string} — Page state assertion                       |
| Context: the editor state is "B: foo{stock-ticker}bar"  | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Outcome: the editor state is                            | Page         | the editor state is — Page state assertion                                |
| Action: everything is selected                          | Page         | everything is selected — Editor setup, selection or editor.send           |
| Outcome: the editor state is "B: \|"                    | Page         | the editor state is {string} — Page state assertion                       |
| Action: "{ArrowRight}" is pressed                       | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |

### insert.child.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    5 |             6 |              6 |           0 |

| Step type and text                                                 | Route | Definition / reason                                                                                                  |
| ------------------------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------- |
| Context: one editor                                                | Page  | one editor — Editor setup, selection or editor.send                                                                  |
| Context: the editor state is "B: "                                 | Page  | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the caret is put after ""                                  | Page  | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Action: a child is inserted                                        | Page  | a child is inserted — Editor setup, selection or editor.send                                                         |
| Outcome: the editor state is "B: new\|"                            | Page  | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is "B: foo"                              | Page  | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the caret is put after "foo"                               | Page  | the caret is put after {string} — Editor setup, selection or editor.send                                             |
| Outcome: the editor state is "B: foonew\|"                         | Page  | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is "B: foo bar baz"                      | Page  | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Outcome: the editor state is "B: foo\|{stock-ticker} bar baz"      | Page  | the editor state is {string} — Page state assertion                                                                  |
| Context: the editor state is "{IMAGE}"                             | Page  | the editor state is {string} — Editor setup, selection or editor.send                                                |
| Action: the editor is focused                                      | Page  | the editor is focused — Editor setup, selection or editor.send                                                       |
| Outcome: the editor state is                                       | Page  | the editor state is — Page state assertion                                                                           |
| Action: "{image}" is inserted at "auto" and selected at the "none" | Page  | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |
| Outcome: nothing is selected                                       | Page  | nothing is selected — Page state assertion                                                                           |
| Action: "foo" is inserted at "auto" and selected at the "none"     | Page  | {terse-pt} is inserted at {placement} and selected at the {select-position} — Editor setup, selection or editor.send |

### insert.text.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    1 |             4 |              4 |           4 |

| Step type and text                                | Route  | Definition / reason                                                   |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Context: one editor                               | Page   | one editor — Editor setup, selection or editor.send                   |
| Context: the editor state is "B: foo;;B: bar"     | Page   | the editor state is {string} — Editor setup, selection or editor.send |
| Action: the editor is focused                     | Page   | the editor is focused — Editor setup, selection or editor.send        |
| Action: the selection is "B: f^oo\|;;B: bar"      | Page   | the selection is {string} — Editor setup, selection or editor.send    |
| Action: "new" is typed                            | Gboard | {string} is typed — compose text support (English)                    |
| Outcome: the editor state is "B: fnew\|;;B: bar"  | Page   | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B: foo;;B: ^b\|ar"      | Page   | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B: foo;;B: new\|ar" | Page   | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B: f^oo;;B: ba\|r"      | Page   | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B: fnew\|r"         | Page   | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B: ^foo;;B: bar\|"      | Page   | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B: new\|"           | Page   | the editor state is {string} — Page state assertion                   |

### lists.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   25 |            37 |             34 |          10 |

| Step type and text                                                                                                                                                                | Route        | Definition / reason                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| Context: one editor                                                                                                                                                               | Page         | one editor — Editor setup, selection or editor.send                            |
| Context: the editor state is "B listItem=\"number\": foo;;B listItem=\"number\": "                                                                                                | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: the editor is focused                                                                                                                                                     | Page         | the editor is focused — Editor setup, selection or editor.send                 |
| Action: the caret is put after ""                                                                                                                                                 | Page         | the caret is put after {string} — Editor setup, selection or editor.send       |
| Action: "{Enter}" is pressed                                                                                                                                                      | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                      |
| Action: "bar" is typed                                                                                                                                                            | Gboard       | {string} is typed — compose text support (English)                             |
| Outcome: the editor state is                                                                                                                                                      | Page         | the editor state is — Page state assertion                                     |
| Action: "{Tab}" is pressed                                                                                                                                                        | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                      |
| Context: the editor state is                                                                                                                                                      | Page         | the editor state is — Editor setup, selection or editor.send                   |
| Action: the caret is put before "bar"                                                                                                                                             | Page         | the caret is put before {string} — Editor setup, selection or editor.send      |
| Action: "{Shift>}{Tab}{/Shift}" is pressed                                                                                                                                        | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                      |
| Action: the caret is put before "f"                                                                                                                                               | Page         | the caret is put before {string} — Editor setup, selection or editor.send      |
| Action: "{Delete}" is pressed 2 times                                                                                                                                             | Not drivable | {button} is pressed {int} times — Gboard has Enter and Backspace only          |
| Context: the editor state is "B listItem=\"number\": "                                                                                                                            | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: "{Backspace}" is pressed                                                                                                                                                  | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                      |
| Outcome: the editor state is "B: \|"                                                                                                                                              | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "{IMAGE};;B listItem=\"number\": "                                                                                                                   | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Context: the editor state is "B listItem=\"number\": ;;B style=\"h1\": foo"                                                                                                       | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: the caret is put before "foo"                                                                                                                                             | Page         | the caret is put before {string} — Editor setup, selection or editor.send      |
| Outcome: the editor state is "B listItem=\"number\" style=\"h1\": \|foo"                                                                                                          | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "B listItem=\"number\": foo;;B listItem=\"number\": ;;B listItem=\"number\": bar"                                                                    | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: the caret is put after "bar"                                                                                                                                              | Page         | the caret is put after {string} — Editor setup, selection or editor.send       |
| Outcome: the editor state is "B listItem=\"number\": foo;;B listItem=\"number\": ;;B listItem=\"number\": ba\|"                                                                   | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "B: "                                                                                                                                                | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: ">#:foo\|>>#:bar\|>>>#:baz" is inserted at "auto"                                                                                                                         | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Action: ">#:foo\|>#:bar\|>#:baz" is inserted at "auto"                                                                                                                            | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B listItem=\"number\": foo;;B listItem=\"number\": bar;;B listItem=\"number\": baz\|"                                                               | Page         | the editor state is {string} — Page state assertion                            |
| Action: ">-:foo\|>-:bar\|>-:baz" is inserted at "auto"                                                                                                                            | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B listItem=\"bullet\": foo;;B listItem=\"bullet\": bar;;B listItem=\"bullet\": baz\|"                                                               | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "B listItem=\"number\": foo"                                                                                                                         | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: the caret is put after "foo"                                                                                                                                              | Page         | the caret is put after {string} — Editor setup, selection or editor.send       |
| Outcome: the editor state is "B listItem=\"number\": foofoo;;B listItem=\"number\": bar;;B listItem=\"number\": baz\|"                                                            | Page         | the editor state is {string} — Page state assertion                            |
| Action: ">-:foo\|>>#:bar\|>-:baz" is inserted at "auto"                                                                                                                           | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B listItem=\"number\": foofoo;;B level=2 listItem=\"number\": bar;;B listItem=\"number\": baz\|"                                                    | Page         | the editor state is {string} — Page state assertion                            |
| Action: ">-:foo\|>>-:bar\|>-:baz" is inserted at "auto"                                                                                                                           | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B listItem=\"number\": foofoo;;B level=2 listItem=\"bullet\": bar;;B listItem=\"number\": baz\|"                                                    | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "B level=2 listItem=\"number\": "                                                                                                                    | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: ">>-:foo\|>-:bar\|>>-:baz" is inserted at "auto"                                                                                                                          | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Context: the editor state is "B level=3 listItem=\"number\": "                                                                                                                    | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Context: the editor state is "B level=9 listItem=\"number\": "                                                                                                                    | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: ">>>>>>>>>>>#:foo\|>>>>>>>>>>>>#:bar\|>>>>>>>>>>>>>#:baz" is inserted at "auto"                                                                                           | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Context: the editor state is "B level=2 listItem=\"bullet\": "                                                                                                                    | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: ">#:foo\|{image}\|>>#:baz" is inserted at "auto"                                                                                                                          | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Action: "foo\|>#:bar\|>>#:baz" is inserted at "auto"                                                                                                                              | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Action: "foo\|bar\|>#:baz" is inserted at "auto"                                                                                                                                  | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Action: "foo\|>-:bar\|>>-:baz\|fizz\|>-:buzz" is inserted at "auto"                                                                                                               | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B level=2 listItem=\"bullet\": foo;;B level=2 listItem=\"bullet\": bar;;B level=3 listItem=\"bullet\": baz;;B: fizz;;B listItem=\"bullet\": buzz\|" | Page         | the editor state is {string} — Page state assertion                            |
| Action: "foo\|>#:bar\|>>#:baz\|fizz\|>#:buzz" is inserted at "auto"                                                                                                               | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B level=2 listItem=\"bullet\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz;;B: fizz;;B listItem=\"number\": buzz\|" | Page         | the editor state is {string} — Page state assertion                            |
| Outcome: the editor state is "B level=2 listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz;;B: fizz;;B listItem=\"number\": buzz\|" | Page         | the editor state is {string} — Page state assertion                            |
| Outcome: the editor state is "B level=2 listItem=\"number\": foo;;B level=2 listItem=\"bullet\": bar;;B level=3 listItem=\"bullet\": baz;;B: fizz;;B listItem=\"bullet\": buzz\|" | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "B listItem=\"bullet\": "                                                                                                                            | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: "h1:foo" is inserted at "auto"                                                                                                                                            | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Action: "h1:bar" is inserted at "auto"                                                                                                                                            | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Action: "{image}" is inserted at "auto"                                                                                                                                           | Page         | {terse-pt} is inserted at {placement} — Editor setup, selection or editor.send |
| Outcome: the editor state is "^{IMAGE}\|"                                                                                                                                         | Page         | the editor state is {string} — Page state assertion                            |
| Context: the editor state is "B listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz"                                                 | Page         | the editor state is {string} — Editor setup, selection or editor.send          |
| Action: "foobarbaz" is selected                                                                                                                                                   | Page         | {string} is selected — Editor setup, selection or editor.send                  |
| Outcome: the editor state is "B listItem=\"number\": \|"                                                                                                                          | Page         | the editor state is {string} — Page state assertion                            |
| Action: "oobarbaz" is selected                                                                                                                                                    | Page         | {string} is selected — Editor setup, selection or editor.send                  |
| Outcome: the editor state is "B listItem=\"number\": f\|"                                                                                                                         | Page         | the editor state is {string} — Page state assertion                            |
| Action: "oobarba" is selected                                                                                                                                                     | Page         | {string} is selected — Editor setup, selection or editor.send                  |
| Outcome: the editor state is "B listItem=\"number\": f\|z"                                                                                                                        | Page         | the editor state is {string} — Page state assertion                            |
| Action: "foobarba" is selected                                                                                                                                                    | Page         | {string} is selected — Editor setup, selection or editor.send                  |
| Outcome: the editor state is "B listItem=\"number\": \|z"                                                                                                                         | Page         | the editor state is {string} — Page state assertion                            |
| Action: "fooba" is selected                                                                                                                                                       | Page         | {string} is selected — Editor setup, selection or editor.send                  |
| Action: undo is performed                                                                                                                                                         | Page         | undo is performed — Editor setup, selection or editor.send                     |

### paste.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    3 |             6 |              0 |           0 |

| Step type and text                                                                    | Route        | Definition / reason                                                       |
| ------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Context: one editor                                                                   | Page         | one editor — Editor setup, selection or editor.send                       |
| Context: the editor state is "B: foo bar buz"                                         | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Context: "strong" around "bar"                                                        | Page         | {decorator} around {string} — Editor setup, selection or editor.send      |
| Action: the caret is put after "buz"                                                  | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Action: x-portable-text is pasted                                                     | Not drivable | x-portable-text is pasted — Clipboard, hardware, drag or two editors      |
| Outcome: the editor state is "B: foo [strong:bar] buzfoo [strong:bar] buz\|"          | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put before "foo"                                                 | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Outcome: the editor state is "B: foo [strong:bar] buz\|foo [strong:bar] buz"          | Page         | the editor state is {string} — Page state assertion                       |
| Action: the caret is put after "ba"                                                   | Page         | the caret is put after {string} — Editor setup, selection or editor.send  |
| Outcome: the editor state is "B: foo [strong:ba]foo [strong:bar] buz[strong:\|r] buz" | Page         | the editor state is {string} — Page state assertion                       |
| Action: "foo bar buz" is selected                                                     | Page         | {string} is selected — Editor setup, selection or editor.send             |
| Outcome: the editor state is "B: foo [strong:bar] buz\|"                              | Page         | the editor state is {string} — Page state assertion                       |
| Action: data is pasted                                                                | Not drivable | data is pasted — Clipboard, hardware, drag or two editors                 |
| Outcome: the editor state is "B: foo [strong:banew\|r] buz"                           | Page         | the editor state is {string} — Page state assertion                       |
| Outcome: the editor state is "B: foo [strong:ba]new[strong:\|r] buz"                  | Page         | the editor state is {string} — Page state assertion                       |

### removing-blocks.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    2 |             2 |              1 |           1 |

| Step type and text                       | Route        | Definition / reason                                                   |
| ---------------------------------------- | ------------ | --------------------------------------------------------------------- |
| Context: one editor                      | Page         | one editor — Editor setup, selection or editor.send                   |
| Context: a global keymap                 | Page         | a global keymap — Editor setup, selection or editor.send              |
| Context: the editor state is             | Page         | the editor state is — Editor setup, selection or editor.send          |
| Action: the editor is focused            | Page         | the editor is focused — Editor setup, selection or editor.send        |
| Action: the selection is                 | Page         | the selection is — Editor setup, selection or editor.send             |
| Action: "{Delete}" is pressed 4 times    | Not drivable | {button} is pressed {int} times — Gboard has Enter and Backspace only |
| Outcome: the editor state is             | Page         | the editor state is — Page state assertion                            |
| Action: "{Backspace}" is pressed 4 times | Gboard       | {button} is pressed {int} times — Gboard has Enter and Backspace only |

### selection-adjustment.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    3 |             3 |              0 |           0 |

| Step type and text                                   | Route        | Definition / reason                                                                     |
| ---------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Context: two editors                                 | Not drivable | two editors — Clipboard, hardware, drag or two editors                                  |
| Context: a global keymap                             | Page         | a global keymap — Editor setup, selection or editor.send                                |
| Context: the text "foo"                              | Page         | the text {terse-pt} — Editor setup, selection or editor.send                            |
| Action: the caret is put after "foo"                 | Page         | the caret is put after {string} — Editor setup, selection or editor.send                |
| Action: Editor B is focused                          | Not drivable | Editor B is focused — Clipboard, hardware, drag or two editors                          |
| Action: the caret is put before "foo" in Editor B    | Not drivable | the caret is put before {string} in Editor B — Clipboard, hardware, drag or two editors |
| Action: "{Enter}" is pressed in Editor B             | Not drivable | {button} is pressed in Editor B — Clipboard, hardware, drag or two editors              |
| Outcome: the text is "\|foo"                         | Page         | the text is {terse-pt} — Page state assertion                                           |
| Outcome: the caret is after "foo"                    | Page         | the caret is after {string} — Page state assertion                                      |
| Context: the text "foo\|bar"                         | Page         | the text {terse-pt} — Editor setup, selection or editor.send                            |
| Action: the caret is put after "bar"                 | Page         | the caret is put after {string} — Editor setup, selection or editor.send                |
| Action: "{Delete}" is pressed 4 times in Editor B    | Not drivable | {button} is pressed {int} times in Editor B — Clipboard, hardware, drag or two editors  |
| Outcome: the text is "bar"                           | Page         | the text is {terse-pt} — Page state assertion                                           |
| Outcome: the caret is after "bar"                    | Page         | the caret is after {string} — Page state assertion                                      |
| Action: the caret is put after "foo" in Editor B     | Not drivable | the caret is put after {string} in Editor B — Clipboard, hardware, drag or two editors  |
| Action: "{Backspace}" is pressed 4 times in Editor B | Not drivable | {button} is pressed {int} times in Editor B — Clipboard, hardware, drag or two editors  |
| Outcome: the text is "\|bar"                         | Page         | the text is {terse-pt} — Page state assertion                                           |

### selection.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                    4 |             4 |              0 |           0 |

| Step type and text                                | Route        | Definition / reason                                                       |
| ------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Context: one editor                               | Page         | one editor — Editor setup, selection or editor.send                       |
| Context: the editor state is "B: foo;;B: "        | Page         | the editor state is {string} — Editor setup, selection or editor.send     |
| Action: the editor is focused                     | Page         | the editor is focused — Editor setup, selection or editor.send            |
| Action: the caret is put before ""                | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Action: "{Shift>}{ArrowLeft}{/Shift}" is pressed  | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |
| Outcome: "o\|" is selected                        | Page         | {terse-pt} is selected — Page state assertion                             |
| Context: the editor state is                      | Page         | the editor state is — Editor setup, selection or editor.send              |
| Action: the caret is put before "bar"             | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Action: "{Shift>}{ArrowRight}{/Shift}" is pressed | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                 |
| Outcome: "b" is selected                          | Page         | {terse-pt} is selected — Page state assertion                             |
| Action: the caret is put before "foo"             | Page         | the caret is put before {string} — Editor setup, selection or editor.send |
| Outcome: "foo\|" is selected                      | Page         | {terse-pt} is selected — Page state assertion                             |
| Outcome: "foo" is selected                        | Page         | {terse-pt} is selected — Page state assertion                             |

### splitting-blocks.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   18 |            25 |             19 |          19 |

| Step type and text                                                                         | Route        | Definition / reason                                                   |
| ------------------------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------- |
| Context: one editor                                                                        | Page         | one editor — Editor setup, selection or editor.send                   |
| Context: a global keymap                                                                   | Page         | a global keymap — Editor setup, selection or editor.send              |
| Context: the editor state is                                                               | Page         | the editor state is — Editor setup, selection or editor.send          |
| Action: the editor is focused                                                              | Page         | the editor is focused — Editor setup, selection or editor.send        |
| Action: the selection is "B: \|foo"                                                        | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Action: "{Enter}" is pressed                                                               | Gboard       | {button} is pressed — Gboard has Enter and Backspace only             |
| Outcome: the editor state is "B: ;;B \_key=\"b1\": \|foo"                                  | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B: fo\|o"                                                        | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is                                                               | Page         | the editor state is — Page state assertion                            |
| Action: the selection is "B: foo\|"                                                        | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Context: the editor state is "B \_key=\"b1\": foo;;B \_key=\"b2\": "                       | Page         | the editor state is {string} — Editor setup, selection or editor.send |
| Action: the selection is                                                                   | Page         | the selection is — Editor setup, selection or editor.send             |
| Action: "baz" is typed                                                                     | Gboard       | {string} is typed — compose text support (English)                    |
| Outcome: the editor state is "B \_key=\"b1\": foo;;B \_key=\"b2\": ;;B: baz\|"             | Page         | the editor state is {string} — Page state assertion                   |
| Action: "{Shift>}{Enter}{/Shift}" is pressed                                               | Not drivable | {button} is pressed — Gboard has Enter and Backspace only             |
| Outcome: the editor state is "B \_key=\"b1\": \n\|foo"                                     | Page         | the editor state is {string} — Page state assertion                   |
| Outcome: the editor state is "B \_key=\"b1\": fo\n\|o"                                     | Page         | the editor state is {string} — Page state assertion                   |
| Outcome: the editor state is "B \_key=\"b1\": foo\n\|"                                     | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B style=\"h1\": \|foo"                                           | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B: ;;B style=\"h1\": \|foo"                                  | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B style=\"h1\": fo\|o"                                           | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Action: the selection is "B style=\"h1\": foo\|"                                           | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B style=\"h1\": \n\|foo"                                     | Page         | the editor state is {string} — Page state assertion                   |
| Outcome: the editor state is "B style=\"h1\": fo\n\|o"                                     | Page         | the editor state is {string} — Page state assertion                   |
| Outcome: the editor state is "B style=\"h1\": foo\n\|"                                     | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B style=\"h1\": \|[strong:foo] bar baz"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Action: "new" is typed                                                                     | Gboard       | {string} is typed — compose text support (English)                    |
| Context: the editor state is "B style=\"h1\": [strong:foo] bar baz"                        | Page         | the editor state is {string} — Editor setup, selection or editor.send |
| Action: the selection is "B style=\"h1\": [strong:foo\|] bar baz"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B style=\"h1\": [strong:foo];;B style=\"h1\": new\| bar baz" | Page         | the editor state is {string} — Page state assertion                   |
| Context: the editor state is "B style=\"h1\": foo [strong:bar] baz"                        | Page         | the editor state is {string} — Editor setup, selection or editor.send |
| Action: the selection is "B style=\"h1\": foo \|[strong:bar] baz"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B style=\"h1\": foo ;;B style=\"h1\": [strong:new\|bar] baz" | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B style=\"h1\": foo [strong:\|bar] baz"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Action: the selection is "B style=\"h1\": foo [strong:bar\|] baz"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B style=\"h1\": foo [strong:bar];;B style=\"h1\": new\| baz" | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B style=\"h1\": foo [strong:bar]\| baz"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Context: the editor state is "B style=\"h1\": foo bar [strong:baz]"                        | Page         | the editor state is {string} — Editor setup, selection or editor.send |
| Action: the selection is "B style=\"h1\": foo bar [strong:\|baz]"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Outcome: the editor state is "B style=\"h1\": foo bar ;;B style=\"h1\": [strong:new\|baz]" | Page         | the editor state is {string} — Page state assertion                   |
| Action: the selection is "B style=\"h1\": foo bar \|[strong:baz]"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Action: the selection is "B style=\"h1\": foo bar [strong:baz\|]"                          | Page         | the selection is {string} — Editor setup, selection or editor.send    |
| Action: "foobar" is selected                                                               | Page         | {string} is selected — Editor setup, selection or editor.send         |
| Outcome: the editor state is "B: \|"                                                       | Page         | the editor state is {string} — Page state assertion                   |
| Action: "ooba" is selected                                                                 | Page         | {string} is selected — Editor setup, selection or editor.send         |
| Outcome: the editor state is "B: f;;B: \|r"                                                | Page         | the editor state is {string} — Page state assertion                   |
| Context: blocks "auto"                                                                     | Page         | blocks {placement} — Editor setup, selection or editor.send           |
| Action: everything is selected                                                             | Page         | everything is selected — Editor setup, selection or editor.send       |

### undo-redo.feature

| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| -------------------: | ------------: | -------------: | ----------: |
|                   16 |            16 |              9 |           7 |

| Step type and text                          | Route        | Definition / reason                                                                  |
| ------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| Context: a global keymap                    | Page         | a global keymap — Editor setup, selection or editor.send                             |
| Context: the editor state is "B: "          | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: the editor is focused               | Page         | the editor is focused — Editor setup, selection or editor.send                       |
| Action: "foo" is typed                      | Gboard       | {string} is typed — compose text support (English)                                   |
| Action: " bar" is typed                     | Gboard       | {string} is typed — compose text support (English)                                   |
| Action: undo is performed                   | Page         | undo is performed — Editor setup, selection or editor.send                           |
| Outcome: the editor state is "B: foo\|"     | Page         | the editor state is {string} — Page state assertion                                  |
| Action: "{ArrowLeft}" is pressed            | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                            |
| Action: "bar" is typed                      | Gboard       | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: fobar\|o"  | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: fo\|o"     | Page         | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: foo"       | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: "foo" is selected                   | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "link" is toggled                   | Page         | {annotation} is toggled — Editor setup, selection or editor.send                     |
| Outcome: the editor state is "B: ^foo\|"    | Page         | the editor state is {string} — Page state assertion                                  |
| Context: a "comment" "c1" around "foo"      | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "{ArrowRight}" is pressed           | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                            |
| Action: "{Backspace}" is pressed            | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                            |
| Outcome: the editor state is                | Page         | the editor state is — Page state assertion                                           |
| Action: redo is performed                   | Page         | redo is performed — Editor setup, selection or editor.send                           |
| Action: "{Space}" is pressed                | Not drivable | {button} is pressed — Gboard has Enter and Backspace only                            |
| Context: the editor state is "B: foo bar"   | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Context: a "comment" "c1" around "bar"      | Page         | a(n) {annotation} {keyKeys} around {string} — Editor setup, selection or editor.send |
| Action: "foo bar" is selected               | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Action: "{Enter}" is pressed                | Gboard       | {button} is pressed — Gboard has Enter and Backspace only                            |
| Action: "foobar" is selected                | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Context: the editor state is "B: -"         | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: ">" is typed                        | Not drivable | {string} is typed — compose text support (English)                                   |
| Action: "new" is typed                      | Gboard       | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: →new\|"    | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: ->"        | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: -\|"       | Page         | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: (cf"       | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: "f" is selected                     | Page         | {string} is selected — Editor setup, selection or editor.send                        |
| Action: ")" is inserted                     | Page         | {string} is inserted — Editor setup, selection or editor.send                        |
| Outcome: the editor state is "B: \|©"       | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: (c)\|"     | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: (c^f\|"    | Page         | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is "B: foobar"    | Page         | the editor state is {string} — Editor setup, selection or editor.send                |
| Action: the caret is put after "foo"        | Page         | the caret is put after {string} — Editor setup, selection or editor.send             |
| Action: "x" is typed                        | Gboard       | {string} is typed — compose text support (English)                                   |
| Action: "y" is typed                        | Gboard       | {string} is typed — compose text support (English)                                   |
| Outcome: the editor state is "B: fooy\|bar" | Page         | the editor state is {string} — Page state assertion                                  |
| Context: the editor state is                | Page         | the editor state is — Editor setup, selection or editor.send                         |
| Action: the caret is put before "bar"       | Page         | the caret is put before {string} — Editor setup, selection or editor.send            |
| Outcome: the editor state is "B: foox\|bar" | Page         | the editor state is {string} — Page state assertion                                  |
| Outcome: the editor state is "B: foo\|bar"  | Page         | the editor state is {string} — Page state assertion                                  |
