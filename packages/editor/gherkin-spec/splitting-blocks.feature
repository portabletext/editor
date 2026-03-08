Feature: Splitting Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Splitting block at the beginning
    Given a block "b1" with text "foo"
    When the editor is focused
    And the caret is put before "foo"
    And "{Enter}" is pressed
    Then the text is "P: ;;P: foo"
    And "foo" is in block "b1"

  Scenario: Splitting block in the middle
    Given a block "b1" with text "foo"
    When the editor is focused
    And the caret is put after "fo"
    And "{Enter}" is pressed
    Then the text is "P: fo;;P: o"
    And "fo" is in block "b1"

  Scenario: Splitting block at the end
    Given a block "b1" with text "foo"
    When the editor is focused
    And "{Enter}" is pressed
    Then the text is "P: foo;;P: "
    And "foo" is in block "b1"

  Scenario: Splitting empty block creates a new block below
    When the editor is focused
    Given blocks "auto"
      ```
      [
        {
          "_key": "b1",
          "_type": "block",
          "children": [
            {
              "_type": "span",
              "text": "foo"
            }
          ]
        },
        {
          "_key": "b2",
          "_type": "block",
          "children": [
            {
              "_type": "span",
              "text": ""
            }
          ]
        }
      ]
      ```
    When "{Enter}" is pressed
    And "baz" is typed
    Then the text is "P: foo;;P: ;;P: baz"
    And "foo" is in block "b1"
    And "" is in block "b2"

  Scenario: Soft-splitting block at the beginning
    Given a block "b1" with text "foo"
    When the editor is focused
    And the caret is put before "foo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "P: \nfoo"
    And "\nfoo" is in block "b1"

  Scenario: Soft-splitting block in the middle
    Given a block "b1" with text "foo"
    When the editor is focused
    And the caret is put after "fo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "P: fo\no"
    And "fo\no" is in block "b1"

  Scenario: Soft-splitting block at the end
    Given a block "b1" with text "foo"
    When the editor is focused
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "P: foo\n"
    And "foo\n" is in block "b1"

  Scenario: Splitting styled block at the beginning
    Given a block "b1" with text "foo"
    When the editor is focused
    And "h1" is toggled
    And the caret is put before "foo"
    And "{Enter}" is pressed
    Then the text is "P: ;;H1: foo"

  Scenario: Splitting styled block in the middle
    Given a block "b1" with text "foo"
    When the editor is focused
    And "h1" is toggled
    And the caret is put after "fo"
    And "{Enter}" is pressed
    Then the text is "H1: fo;;H1: o"
    And "fo" is in block "b1"

  Scenario: Splitting styled block at the end
    Given a block "b1" with text "foo"
    When the editor is focused
    And "h1" is toggled
    And "{Enter}" is pressed
    Then the text is "H1: foo;;P: "
    And "foo" is in block "b1"

  Scenario: Soft-splitting styled block at the beginning
    Given the text "P: foo"
    When the editor is focused
    And "h1" is toggled
    And the caret is put before "foo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "H1: \nfoo"

  Scenario: Soft-splitting styled block in the middle
    Given the text "P: foo"
    When the editor is focused
    And "h1" is toggled
    And the caret is put after "fo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "H1: fo\no"

  Scenario: Soft-splitting styled block at the end
    Given the text "P: foo"
    When the editor is focused
    And "h1" is toggled
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "H1: foo\n"

  Scenario: Splitting decorated styled block at the beginning
    Given the text "H1: foo bar baz"
    And "strong" around "foo"
    When the editor is focused
    And the caret is put before "foo"
    And "{Enter}" is pressed
    And "new" is typed
    Then the text is "P: [strong:];;H1: [strong:newfoo] bar baz"
    And "newfoo" has marks "strong"

  Scenario Outline: Splitting decorated styled block in the middle
    Given the text "P: foo bar baz"
    And "strong" around <decorated>
    When the editor is focused
    And "h1" is toggled
    And the caret is put <position>
    And "{Enter}" is pressed
    And "new" is typed
    Then the text is <new text>

    Examples:
      | decorated | position      | new text                            |
      | "foo"     | after "foo"   | "H1: [strong:foo];;H1: new bar baz" |
      | "bar"     | after "foo "  | "H1: foo ;;H1: [strong:newbar] baz" |
      | "bar"     | before "bar"  | "H1: foo ;;H1: [strong:newbar] baz" |
      | "bar"     | after "bar"   | "H1: foo [strong:bar];;H1: new baz" |
      | "bar"     | before " baz" | "H1: foo [strong:bar];;H1: new baz" |
      | "baz"     | before "baz"  | "H1: foo bar ;;H1: [strong:newbaz]" |
      | "baz"     | after "bar "  | "H1: foo bar ;;H1: [strong:newbaz]" |

  Scenario: Splitting decorated styled block at the end
    Given the text "P: foo bar baz"
    And "strong" around "baz"
    When the editor is focused
    And "h1" is toggled
    And the caret is put after "baz"
    And "{Enter}" is pressed
    And "new" is typed
    Then the text is "H1: foo bar [strong:baz];;P: new"
    And "new" has no marks

  Scenario Outline: Splitting block with an expanded selection
    Given a block "b1" with text "foo"
    And a block "b2" with text "bar"
    When the editor is focused
    And <selection> is selected
    And "{Enter}" is pressed
    Then the text is <new text>

    Examples:
      | selection | new text     |
      | "foobar"  | "P: "        |
      | "ooba"    | "P: f;;P: r" |

  Scenario: Pressing Enter when selecting multiple block objects
    Given blocks "auto"
      ```
      [
        {
          "_key": "i0",
          "_type": "image"
        },
        {
          "_key": "i1",
          "_type": "image"
        }
      ]
      ```
    When the editor is focused
    And everything is selected
    And "{Enter}" is pressed
    Then the text is "P: "
