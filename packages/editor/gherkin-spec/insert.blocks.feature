Feature: Insert Blocks

Background:
  Given one editor

Scenario Outline: Inserting blocks on an empty editor
  When the editor is focused
  And "foo|bar" is inserted at <placement> and selected at the <selection>
  And "baz" is typed
  Then the text is <text>

  Examples:
    | placement | selection | text              |
    | "before"  | "none"    | "P: foo;;P: bar;;P: baz"   |
    | "before"  | "start"   | "P: bazfoo;;P: bar;;P:"   |
    | "before"  | "end"     | "P: foo;;P: barbaz;;P:"   |
    | "after"   | "none"    | "P: baz;;P: foo;;P: bar"   |
    | "after"   | "start"   | "P:;;P: bazfoo;;P: bar"   |
    | "after"   | "end"     | "P:;;P: foo;;P: barbaz"   |
    | "auto"    | "none"    | "P: foo;;P: bar"        |
    | "auto"    | "start"   | "P: bazfoo;;P: bar"     |

Scenario Outline: Inserting block objects an empty editor
  When "{image}" is inserted at <placement>
  Then the text is <text>

  Examples:
    | placement | text       |
    | "before"  | "{IMAGE};;P:" |
    | "after"   | "P:;;{IMAGE}" |
    | "auto"    | "{IMAGE}"  |

Scenario Outline: Inserting blocks on a block object
  When "{image}" is inserted at "auto" and selected at the "end"
  And "foo|{break}|bar" is inserted at "auto"
  Then the text is <text>

  Examples:
    | text                        |
    | "{IMAGE};;P: foo;;{BREAK};;P: bar" |

Scenario: Inserting text blocks on a block object
  When "{image}" is inserted at "auto" and selected at the "end"
  And "foo|bar" is inserted at "auto"
  Then the text is <text>

  Examples:
    | text                 |
    | "{IMAGE};;P: foo;;P: bar"  |

Scenario Outline: Inserting blocks on a text block
  Given the text "P: foo"
  When the editor is focused
  And the caret is put <position>
  And "bar|{image}|baz" is inserted at <placement> and selected at the <select-position>
  And "new" is typed
  Then the text is <text>

  Examples:
    | position     | placement | select-position | text                              |
    | before "foo" | "before"  | "start"         | "P: newbar;;{IMAGE};;P: baz;;P: foo"       |
    | before "foo" | "before"  | "end"           | "P: bar;;{IMAGE};;P: baznew;;P: foo"       |
    | before "foo" | "after"   | "start"         | "P: foo;;P: newbar;;{IMAGE};;P: baz"       |
    | before "foo" | "after"   | "end"           | "P: foo;;P: bar;;{IMAGE};;P: baznew"       |
    | before "foo" | "auto"    | "start"         | "P: newbar;;{IMAGE};;P: bazfoo"         |
    | before "foo" | "auto"    | "end"           | "P: bar;;{IMAGE};;P: baznewfoo"         |
    | after "f"    | "before"  | "start"         | "P: newbar;;{IMAGE};;P: baz;;P: foo"       |
    | after "f"    | "before"  | "end"           | "P: bar;;{IMAGE};;P: baznew;;P: foo"       |
    | after "f"    | "after"   | "start"         | "P: foo;;P: newbar;;{IMAGE};;P: baz"       |
    | after "f"    | "after"   | "end"           | "P: foo;;P: bar;;{IMAGE};;P: baznew"       |
    | after "f"    | "auto"    | "start"         | "P: fnewbar;;{IMAGE};;P: bazoo"         |
    | after "f"    | "auto"    | "end"           | "P: fbar;;{IMAGE};;P: baznewoo"         |
    | after "foo"  | "before"  | "start"         | "P: newbar;;{IMAGE};;P: baz;;P: foo"       |
    | after "foo"  | "before"  | "end"           | "P: bar;;{IMAGE};;P: baznew;;P: foo"       |
    | after "foo"  | "after"   | "start"         | "P: foo;;P: newbar;;{IMAGE};;P: baz"       |
    | after "foo"  | "after"   | "end"           | "P: foo;;P: bar;;{IMAGE};;P: baznew"       |
    | after "foo"  | "auto"    | "start"         | "P: foonewbar;;{IMAGE};;P: baz"         |
    | after "foo"  | "auto"    | "end"           | "P: foobar;;{IMAGE};;P: baznew"         |

Scenario: Pasting text blocks between two text blocks
  Given the text "P: foo;;P: bar"
  When the caret is put after "foo"
  And "fizz|buzz" is inserted at "auto"
  Then the text is "P: foofizz;;P: buzz;;P: bar"

Scenario Outline: Inserting text block with annotation
  Given the text <text>
  When <selection>
  And blocks are inserted at "auto" and selected at the <select-position>
  ```
  [
    {
      "_type": "block",
      "children": [
        {
          "_type": "span",
          "text": "foo "
        },
        {
          "_type": "span",
          "text": "bar",
          "marks": ["m0"]
        },
        {
          "_type": "span",
          "text": " baz"
        }
      ],
      "markDefs": [
        {
          "_key": "m0",
          "_type": "link",
          "href": "https://example.com"
        }
      ]
    }
  ]
  ```
  Then the text is <new text>

  Examples:
    | text              | selection                      | select-position | new text                    |
    | "P:"                | the caret is put after ""      | "start"         | "P: foo ,bar, baz"             |
    | "P:"                | the caret is put after ""      | "end"           | "P: foo ,bar, baz"             |
    | "P: existing"        | "is" is selected               | "start"         | "P: exfoo ,bar, bazting"       |
    | "P: existing"        | "is" is selected               | "end"           | "P: exfoo ,bar, bazting"       |
    | "P: existing;;P: text"  | "ingte" is selected            | "start"         | "P: existfoo ,bar, bazxt"      |
    | "P: existing;;P: text"  | "ingte" is selected            | "end"           | "P: existfoo ,bar, bazxt"      |