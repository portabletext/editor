Feature: Splitting Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Splitting block at the beginning
    Given a block "b1" with text "foo"
    When the caret is put before "foo"
    And "{Enter}" is pressed
    Then the text is "|foo"
    And "foo" is in block "b1"

  Scenario: Splitting block in the middle
    Given a block "b1" with text "foo"
    When the caret is put after "fo"
    And "{Enter}" is pressed
    Then the text is "fo|o"
    And "fo" is in block "b1"

  Scenario: Splitting block at the end
    Given a block "b1" with text "foo"
    When "{Enter}" is pressed
    Then the text is "foo|"
    And "foo" is in block "b1"

  Scenario: Splitting empty block creates a new block below
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
    Then the text is "foo||baz"
    And "foo" is in block "b1"
    And "" is in block "b2"

  Scenario: Soft-splitting block at the beginning
    Given a block "b1" with text "foo"
    When the caret is put before "foo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "\nfoo"
    And "\nfoo" is in block "b1"

  Scenario: Soft-splitting block in the middle
    Given a block "b1" with text "foo"
    When the caret is put after "fo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "fo\no"
    And "fo\no" is in block "b1"

  Scenario: Soft-splitting block at the end
    Given a block "b1" with text "foo"
    When "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "foo\n"
    And "foo\n" is in block "b1"

  Scenario: Splitting styled block at the beginning
    Given a block "b1" with text "foo"
    When "h1" is toggled
    And the caret is put before "foo"
    And "{Enter}" is pressed
    Then the text is "|h1:foo"

  Scenario: Splitting styled block in the middle
    Given a block "b1" with text "foo"
    When "h1" is toggled
    And the caret is put after "fo"
    And "{Enter}" is pressed
    Then the text is "h1:fo|h1:o"
    And "fo" is in block "b1"

  Scenario: Splitting styled block at the end
    Given a block "b1" with text "foo"
    When "h1" is toggled
    And "{Enter}" is pressed
    Then the text is "h1:foo|"
    And "foo" is in block "b1"

  Scenario: Soft-splitting styled block at the beginning
    Given the text "foo"
    When "h1" is toggled
    And the caret is put before "foo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "h1:\nfoo"

  Scenario: Soft-splitting styled block in the middle
    Given the text "foo"
    When "h1" is toggled
    And the caret is put after "fo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "h1:fo\no"

  Scenario: Soft-splitting styled block at the end
    Given the text "foo"
    When "h1" is toggled
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the text is "h1:foo\n"

  Scenario: Splitting decorated styled block at the beginning
    Given the text "h1:foo bar baz"
    And "strong" around "foo"
    When the caret is put before "foo"
    When "{Enter}" is pressed
    And "new" is typed
    Then the text is "|h1:newfoo, bar baz"
    And "newfoo" has marks "strong"

  Scenario Outline: Splitting decorated styled block in the middle
    Given the text "foo bar baz"
    And "strong" around <decorated>
    When "h1" is toggled
    And the caret is put <position>
    And "{Enter}" is pressed
    And "new" is typed
    Then the text is <new text>

    Examples:
      | decorated | position      | new text                  |
      | "foo"     | after "foo"   | "h1:foo\|h1:new bar baz"  |
      | "bar"     | after "foo "  | "h1:foo \|h1:newbar, baz" |
      | "bar"     | before "bar"  | "h1:foo \|h1:newbar, baz" |
      | "bar"     | after "bar"   | "h1:foo ,bar\|h1:new baz" |
      | "bar"     | before " baz" | "h1:foo ,bar\|h1:new baz" |
      | "baz"     | before "baz"  | "h1:foo bar \|h1:newbaz"  |
      | "baz"     | after "bar "  | "h1:foo bar \|h1:newbaz"  |

  Scenario: Splitting decorated styled block at the end
    Given the text "foo bar baz"
    And "strong" around "baz"
    When "h1" is toggled
    And the caret is put after "baz"
    And "{Enter}" is pressed
    And "new" is typed
    Then the text is "h1:foo bar ,baz|new"
    And "new" has no marks

  Scenario Outline: Splitting block with an expanded selection
    Given a block "b1" with text "foo"
    And a block "b2" with text "bar"
    When <selection> is selected
    And "{Enter}" is pressed
    Then the text is <new text>

    Examples:
      | selection | new text |
      | "foobar"  | ""       |
      | "ooba"    | "f\|r"   |

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
    When everything is selected
    And "{Enter}" is pressed
    Then the text is ""
