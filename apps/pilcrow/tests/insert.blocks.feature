Feature: Insert Blocks

  Background:
    Given one editor

  Scenario Outline: Inserting blocks on an empty editor
    When the editor is focused
    And "foo|bar" is inserted at <placement> and selected at the <selection>
    And "baz" is typed
    Then the editor state is <text>

    Examples:
      | placement | selection | text                       |
      | "before"  | "none"    | "B: foo;;B: bar;;B: baz\|" |
      | "before"  | "start"   | "B: baz\|foo;;B: bar;;B: " |
      | "before"  | "end"     | "B: foo;;B: barbaz\|;;B: " |
      | "after"   | "none"    | "B: baz\|;;B: foo;;B: bar" |
      | "after"   | "start"   | "B: ;;B: baz\|foo;;B: bar" |
      | "after"   | "end"     | "B: ;;B: foo;;B: barbaz\|" |
      | "auto"    | "none"    | "B: foo;;B: bar"           |
      | "auto"    | "start"   | "B: baz\|foo;;B: bar"      |

  Scenario Outline: Inserting block objects an empty editor
    When "{image}" is inserted at <placement>
    Then the editor state is <text>

    Examples:
      | placement | text              |
      | "before"  | "^{IMAGE}\|;;B: " |
      | "after"   | "B: ;;^{IMAGE}\|" |
      | "auto"    | "^{IMAGE}\|"      |

  Scenario Outline: Inserting blocks on a block object
    When "{image}" is inserted at "auto" and selected at the "end"
    And "foo|{break}|bar" is inserted at "auto"
    Then the editor state is <text>

    Examples:
      | text                                 |
      | "{IMAGE};;B: foo;;{BREAK};;B: bar\|" |

  Scenario: Inserting text blocks on a block object
    When "{image}" is inserted at "auto" and selected at the "end"
    And "foo|bar" is inserted at "auto"
    Then the editor state is
      """
      {IMAGE}
      B: foo
      B: bar|
      """

  Scenario Outline: Inserting blocks on a text block
    Given the editor state is "B: foo"
    When the editor is focused
    And the caret is put <position>
    And "bar|{image}|baz" is inserted at <placement> and selected at the <select-position>
    And "new" is typed
    Then the editor state is <text>

    Examples:
      | position     | placement | select-position | text                                   |
      | before "foo" | "before"  | "start"         | "B: new\|bar;;{IMAGE};;B: baz;;B: foo" |
      | before "foo" | "before"  | "end"           | "B: bar;;{IMAGE};;B: baznew\|;;B: foo" |
      | before "foo" | "after"   | "start"         | "B: foo;;B: new\|bar;;{IMAGE};;B: baz" |
      | before "foo" | "after"   | "end"           | "B: foo;;B: bar;;{IMAGE};;B: baznew\|" |
      | before "foo" | "auto"    | "start"         | "B: new\|bar;;{IMAGE};;B: bazfoo"      |
      | before "foo" | "auto"    | "end"           | "B: bar;;{IMAGE};;B: baznew\|foo"      |
      | after "f"    | "before"  | "start"         | "B: new\|bar;;{IMAGE};;B: baz;;B: foo" |
      | after "f"    | "before"  | "end"           | "B: bar;;{IMAGE};;B: baznew\|;;B: foo" |
      | after "f"    | "after"   | "start"         | "B: foo;;B: new\|bar;;{IMAGE};;B: baz" |
      | after "f"    | "after"   | "end"           | "B: foo;;B: bar;;{IMAGE};;B: baznew\|" |
      | after "f"    | "auto"    | "start"         | "B: fnew\|bar;;{IMAGE};;B: bazoo"      |
      | after "f"    | "auto"    | "end"           | "B: fbar;;{IMAGE};;B: baznew\|oo"      |
      | after "foo"  | "before"  | "start"         | "B: new\|bar;;{IMAGE};;B: baz;;B: foo" |
      | after "foo"  | "before"  | "end"           | "B: bar;;{IMAGE};;B: baznew\|;;B: foo" |
      | after "foo"  | "after"   | "start"         | "B: foo;;B: new\|bar;;{IMAGE};;B: baz" |
      | after "foo"  | "after"   | "end"           | "B: foo;;B: bar;;{IMAGE};;B: baznew\|" |
      | after "foo"  | "auto"    | "start"         | "B: foonew\|bar;;{IMAGE};;B: baz"      |
      | after "foo"  | "auto"    | "end"           | "B: foobar;;{IMAGE};;B: baznew\|"      |

  Scenario: Pasting text blocks between two text blocks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the caret is put after "foo"
    And "fizz|buzz" is inserted at "auto"
    Then the editor state is
      """
      B: foofizz
      B: buzz|
      B: bar
      """

  Scenario Outline: Inserting text block with annotation
    Given the editor state is <text>
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
    Then the editor state is <new text>

    Examples:
      | text                   | selection                 | select-position | new text                          |
      | "B: "                  | the caret is put after "" | "start"         | "B: \|foo [@link:bar] baz"        |
      | "B: "                  | the caret is put after "" | "end"           | "B: foo [@link:bar] baz\|"        |
      | "B: existing"          | "is" is selected          | "start"         | "B: ex\|foo [@link:bar] bazting"  |
      | "B: existing"          | "is" is selected          | "end"           | "B: exfoo [@link:bar] baz\|ting"  |
      | "B: existing;;B: text" | "ingte" is selected       | "start"         | "B: exist\|foo [@link:bar] bazxt" |
      | "B: existing;;B: text" | "ingte" is selected       | "end"           | "B: existfoo [@link:bar] baz\|xt" |
