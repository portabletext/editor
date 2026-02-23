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
      | text            | selection | new text   |
      | "foo\|bar"      | "foo"     | "new\|bar" |
      | "foo\|bar\|baz" | "foobar"  | "new\|baz" |

  Scenario Outline: Deleting word
    Given the text <text>
    When the editor is focused
    And the caret is put <position>
    And <shortcut> is pressed
    Then the text is <final text>

    Examples:
      | text          | position        | shortcut              | final text  |
      | "foo bar baz" | after "bar"     | "deleteWord.backward" | "foo  baz"  |
      | "foo bar baz" | after "bar "    | "deleteWord.backward" | "foo baz"   |
      | "foo bar baz" | after "foo ba"  | "deleteWord.backward" | "foo r baz" |
      | "foo bar baz" | before "bar"    | "deleteWord.forward"  | "foo  baz"  |
      | "foo bar baz" | before " bar"   | "deleteWord.forward"  | "foo baz"   |
      | "foo bar baz" | before "ar baz" | "deleteWord.forward"  | "foo b baz" |

  Scenario Outline: Deleting code points in complex scripts
    Given the text <text>
    When the editor is focused
    And the caret is put after <text>
    And "{Backspace}" is pressed
    Then the text is <final text>

    Examples:
      # Hindi (Devanagari) - "कि" is क (ka) + ि (vowel i), two code points
      | text | final text |
      | "कि" | "क"        |
      # Bengali - "কি" is ক (ka) + ি (vowel i)
      | "কি" | "ক"        |
      # Thai - "กิ" is ก (ko kai) + ิ (sara i)
      | "กิ" | "ก"        |
