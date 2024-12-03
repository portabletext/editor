Feature: Splitting Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Splitting block at the beginning
    Given the text "foo" in block "b1"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is "|foo"
    And "foo" is in block "b1"

  Scenario: Splitting block in the middle
    Given the text "foo" in block "b1"
    When the caret is put after "fo"
    And "Enter" is pressed
    Then the text is "fo|o"
    And "fo" is in block "b1"

  Scenario: Splitting block at the end
    Given the text "foo" in block "b1"
    When "Enter" is pressed
    Then the text is "foo|"
    And "foo" is in block "b1"

  Scenario: Splitting empty block creates a new block below
    Given the text "foo" in block "b1"
    And the text "bar" in block "b2"
    When "Backspace" is pressed 3 times
    And "Enter" is pressed
    And "baz" is typed
    Then the text is "foo||baz"
    And "foo" is in block "b1"
    And "" is in block "b2"

  Scenario: Soft-splitting block at the beginning
    Given the text "foo" in block "b1"
    When the caret is put before "foo"
    And "Shift+Enter" is pressed
    Then the text is "\nfoo"
    And "\nfoo" is in block "b1"

  Scenario: Soft-splitting block in the middle
    Given the text "foo" in block "b1"
    When the caret is put after "fo"
    And "Shift+Enter" is pressed
    Then the text is "fo\no"
    And "fo\no" is in block "b1"

  Scenario: Soft-splitting block at the end
    Given the text "foo" in block "b1"
    When "Shift+Enter" is pressed
    Then the text is "foo\n"
    And "foo\n" is in block "b1"

  Scenario: Splitting styled block at the beginning
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put before "foo"
    And "Enter" is pressed
    Then block "0" has style "normal"
    And block "1" has style "h1"
    And "foo" is in block "b1"

  Scenario: Splitting styled block in the middle
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put after "fo"
    And "Enter" is pressed
    Then block "0" has style "h1"
    And block "1" has style "h1"
    And "fo" is in block "b1"

  Scenario: Splitting styled block at the end
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And "Enter" is pressed
    Then block "0" has style "h1"
    And block "1" has style "normal"
    And "foo" is in block "b1"

  Scenario: Soft-splitting styled block at the beginning
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put before "foo"
    And "Shift+Enter" is pressed
    Then block "0" has style "h1"
    And "\nfoo" is in block "b1"

  Scenario: Soft-splitting styled block in the middle
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put after "fo"
    And "Shift+Enter" is pressed
    Then block "0" has style "h1"
    And "fo\no" is in block "b1"

  Scenario: Soft-splitting styled block at the end
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And "Shift+Enter" is pressed
    Then block "0" has style "h1"
    And "foo\n" is in block "b1"

  Scenario: Splitting decorated styled block at the beginning
    Given the text "foo bar baz"
    And "strong" around "foo"
    When "h1" is toggled
    And the caret is put before "foo"
    And "Enter" is pressed
    And "ArrowUp" is pressed
    And "new" is typed
    Then the text is "new|foo, bar baz"
    And block "0" has style "normal"
    And block "1" has style "h1"
    And "new" has marks "strong"

  Scenario Outline: Splitting decorated styled block in the middle
    Given the text "foo bar baz" in block "b1"
    And "strong" around <decorated>
    When "h1" is toggled
    And the caret is put <position>
    And "Enter" is pressed
    And "new" is typed
    Then the text is <new text>
    And block "0" has style "h1"
    And block "1" has style "h1"

    Examples:
      | decorated | position      | new text            |
      | "foo"     | after "foo"   | "foo\|new bar baz"  |
      | "bar"     | after "foo "  | "foo \|newbar, baz" |
      | "bar"     | before "bar"  | "foo \|newbar, baz" |
      | "bar"     | after "bar"   | "foo ,bar\|new baz" |
      | "bar"     | before " baz" | "foo ,bar\|new baz" |
      | "baz"     | before "baz"  | "foo bar \|newbaz"  |
      | "baz"     | after "bar "  | "foo bar \|newbaz"  |

  Scenario: Splitting decorated styled block at the end
    Given the text "foo bar baz"
    And "strong" around "baz"
    When "h1" is toggled
    And the caret is put after "baz"
    And "Enter" is pressed
    And "new" is typed
    Then the text is "foo bar ,baz|new"
    And block "0" has style "h1"
    And block "1" has style "normal"
    And "new" has no marks

  Scenario Outline: Splitting block with an expanded selection
    Given the text "foo" in block "b1"
    And the text "bar" in block "b2"
    When <selection> is selected
    And "Enter" is pressed
    Then the text is <new text>

    Examples:
      | selection | new text |
      | "foobar"  | "\|"     |
      | "ooba"    | "f\|r"   |

  Scenario: Pressing Enter when selecting multiple block objects
    Given an "image" "m1"
    And an "image" "m2"
    When everything is selected
    And "Enter" is pressed
    Then the editor is empty
