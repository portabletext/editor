Feature: Delete

  Background:
    Given one editor

  Scenario Outline: Deleting word
    Given the text <text>
    When the caret is put <position>
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
