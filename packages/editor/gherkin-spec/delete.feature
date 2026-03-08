Feature: Delete

  Background:
    Given one editor

  Scenario Outline: Deleting expanded selection
    Given the text <text>
    When the editor is focused
    And <selection> is selected
    And "{Delete}" is pressed
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text                     | selection | new text         |
      | "P: foo;;P: bar"         | "foo"     | "P: new;;P: bar" |
      | "P: foo;;P: bar;;P: baz" | "foobar"  | "P: new;;P: baz" |

  Scenario Outline: Deleting word
    Given the text <text>
    When the editor is focused
    And the caret is put <position>
    And <shortcut> is pressed
    Then the text is <final text>

    Examples:
      | text             | position        | shortcut              | final text     |
      | "P: foo bar baz" | after "bar"     | "deleteWord.backward" | "P: foo  baz"  |
      | "P: foo bar baz" | after "bar "    | "deleteWord.backward" | "P: foo  baz"  |
      | "P: foo bar baz" | after "foo ba"  | "deleteWord.backward" | "P: foo r baz" |
      | "P: foo bar baz" | before "bar"    | "deleteWord.forward"  | "P: foo  baz"  |
      | "P: foo bar baz" | before " bar"   | "deleteWord.forward"  | "P: foo baz"   |
      | "P: foo bar baz" | before "ar baz" | "deleteWord.forward"  | "P: foo b baz" |

  Scenario Outline: Deleting code points in complex scripts
    Given the text <text>
    When the editor is focused
    And the caret is put after <content>
    And "{Backspace}" is pressed
    Then the text is <final text>

    Examples:
      # Hindi (Devanagari) - "कि" is क (ka) + ि (vowel i), two code points
      | text    | content | final text |
      | "P: कि" | "कि"    | "P: क"     |
      # Bengali - "কি" is ক (ka) + ি (vowel i)
      | "P: কি" | "কি"    | "P: ক"     |
      # Thai - "กิ" is ก (ko kai) + ิ (sara i)
      | "P: กิ" | "กิ"    | "P: ก"     |

  Scenario Outline: Deleting line backward
    Given the text <text>
    When the editor is focused
    And the caret is put <position>
    And "deleteLine.backward" is pressed
    Then the text is <final text>
    When undo is performed
    Then the text is <text>

    Examples:
      | text             | position     | final text   |
      | "P: foo bar baz" | after "bar"  | "P:  baz"    |
      | "P: foo bar baz" | after "baz"  | "P: "        |
      | "P: foo bar baz" | after "foo " | "P: bar baz" |

  Scenario: Deleting line backward at start of block merges blocks
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put before "bar"
    And "deleteLine.backward" is pressed
    Then the text is "P: foobar"
    When undo is performed
    Then the text is "P: foo;;P: bar"

  Scenario: Cutting selected text
    Given the text "P: foo bar baz"
    When the editor is focused
    And "bar" is selected
    And cut is performed
    Then the text is "P: foo  baz"
    When undo is performed
    Then the text is "P: foo bar baz"

  Scenario: Cutting across blocks
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And "foobar" is selected
    And cut is performed
    Then the text is "P: "
    When undo is performed
    Then the text is "P: foo;;P: bar"

  Scenario: Deleting word backward at block boundary merges blocks
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put before "bar"
    And "deleteWord.backward" is pressed
    Then the text is "P: foobar"
    When undo is performed
    Then the text is "P: foo;;P: bar"

  Scenario: Deleting word forward at block boundary merges blocks
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put after "foo"
    And "deleteWord.forward" is pressed
    Then the text is "P: foobar"
    When undo is performed
    Then the text is "P: foo;;P: bar"

  Scenario: Cutting with collapsed selection is a no-op
    Given the text "P: foo bar baz"
    When the editor is focused
    And the caret is put after "bar"
    And cut is performed
    Then the text is "P: foo bar baz"

  Scenario: Deleting line backward in empty block
    Given the text "P: "
    When the editor is focused
    And "deleteLine.backward" is pressed
    Then the text is "P: "

  Scenario: Deleting line backward only affects current block
    Given the text "P: foo;;P: bar baz"
    When the editor is focused
    And the caret is put after "bar"
    And "deleteLine.backward" is pressed
    Then the text is "P: foo;;P:  baz"
    When undo is performed
    Then the text is "P: foo;;P: bar baz"
