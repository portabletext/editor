Feature: Insert Blocks

  Background:
    Given one editor

  Scenario Outline: Inserting blocks on an empty editor
    When the editor is focused
    And "foo|bar" is inserted at <placement> and selected at the <selection>
    And "baz" is typed
    Then the text is <text>

    Examples:
      | placement | selection | text            |
      | "before"  | "none"    | "foo\|bar\|baz" |
      | "before"  | "start"   | "bazfoo\|bar\|" |
      | "before"  | "end"     | "foo\|barbaz\|" |
      | "after"   | "none"    | "baz\|foo\|bar" |
      | "after"   | "start"   | "\|bazfoo\|bar" |
      | "after"   | "end"     | "\|foo\|barbaz" |
      | "auto"    | "none"    | "bazfoo\|bar"   |
      | "auto"    | "start"   | "bazfoo\|bar"   |

  Scenario Outline: Inserting block objects an empty editor
    When "{image}" is inserted at <placement>
    Then the text is <text>

    Examples:
      | placement | text        |
      | "before"  | "{image}\|" |
      | "after"   | "\|{image}" |
      | "auto"    | "{image}"   |

  Scenario Outline: Inserting blocks on a block object
    When "{image}" is inserted at "auto" and selected at the "end"
    And "foo|{break}|bar" is inserted at "auto"
    Then the text is <text>

    Examples:
      | text                         |
      | "{image}\|foo\|{break}\|bar" |

  Scenario: Inserting text blocks on a block object
    When "{image}" is inserted at "auto" and selected at the "end"
    And "foo|bar" is inserted at "auto"
    Then the text is <text>

    Examples:
      | text                |
      | "{image}\|foo\|bar" |

  Scenario Outline: Inserting blocks on a text block
    Given the text "foo"
    When the editor is focused
    And the caret is put <position>
    And "bar|{image}|baz" is inserted at <placement> and selected at the <select-position>
    And "new" is typed
    Then the text is <text>

    Examples:
      | position     | placement | select-position | text                        |
      | before "foo" | "before"  | "start"         | "newbar\|{image}\|baz\|foo" |
      | before "foo" | "before"  | "end"           | "bar\|{image}\|baznew\|foo" |
      | before "foo" | "after"   | "start"         | "foo\|newbar\|{image}\|baz" |
      | before "foo" | "after"   | "end"           | "foo\|bar\|{image}\|baznew" |
      | before "foo" | "auto"    | "start"         | "newbar\|{image}\|bazfoo"   |
      | before "foo" | "auto"    | "end"           | "bar\|{image}\|baznewfoo"   |
      | after "f"    | "before"  | "start"         | "newbar\|{image}\|baz\|foo" |
      | after "f"    | "before"  | "end"           | "bar\|{image}\|baznew\|foo" |
      | after "f"    | "after"   | "start"         | "foo\|newbar\|{image}\|baz" |
      | after "f"    | "after"   | "end"           | "foo\|bar\|{image}\|baznew" |
      | after "f"    | "auto"    | "start"         | "fnewbar\|{image}\|bazoo"   |
      | after "f"    | "auto"    | "end"           | "fbar\|{image}\|baznewoo"   |
      | after "foo"  | "before"  | "start"         | "newbar\|{image}\|baz\|foo" |
      | after "foo"  | "before"  | "end"           | "bar\|{image}\|baznew\|foo" |
      | after "foo"  | "after"   | "start"         | "foo\|newbar\|{image}\|baz" |
      | after "foo"  | "after"   | "end"           | "foo\|bar\|{image}\|baznew" |
      | after "foo"  | "auto"    | "start"         | "foonewbar\|{image}\|baz"   |
      | after "foo"  | "auto"    | "end"           | "foobar\|{image}\|baznew"   |

  Scenario: Pasting text blocks between two text blocks
    Given the text "foo|bar"
    When the caret is put after "foo"
    And "fizz|buzz" is inserted at "auto"
    Then the text is "foofizz|buzz|bar"

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
      | text             | selection                 | select-position | new text               |
      | ""               | the caret is put after "" | "start"         | "foo ,bar, baz"        |
      | ""               | the caret is put after "" | "end"           | "foo ,bar, baz"        |
      | "existing"       | "is" is selected          | "start"         | "exfoo ,bar, bazting"  |
      | "existing"       | "is" is selected          | "end"           | "exfoo ,bar, bazting"  |
      | "existing\|text" | "ingte" is selected       | "start"         | "existfoo ,bar, bazxt" |
      | "existing\|text" | "ingte" is selected       | "end"           | "existfoo ,bar, bazxt" |
