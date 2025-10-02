Feature: Disallow in code

  Background:
    Given the editor is focused
    And a global keymap

  Scenario Outline: Decorated text
    Given the text <text>
    And "code" around <decorated>
    When the caret is put <position>
    And "->" is typed
    Then the text is <new text>

    Examples:
      | text          | decorated | position        | new text          |
      | "foo"         | "foo"     | after "foo"     | "foo->"           |
      | "foo bar baz" | "bar"     | after "bar"     | "foo ,bar->, baz" |
      | "foo bar baz" | "bar"     | before "bar"    | "foo →,bar, baz"  |
      | "foo bar baz" | "bar"     | before "ar baz" | "foo ,b->ar, baz" |

  Scenario Outline: Partially decorated text
    Given the text "foo bar2x baz"
    And "code" around "bar2x"
    When the caret is put after "bar2x"
    And "2" is typed
    Then the text is "foo ,bar2x2, baz"

  Scenario Outline: Decorated and annotated text
    Given the text "foo bar baz"
    And "code" around "bar"
    And a "link" "l1" around "bar"
    When the caret is put <position>
    And "->" is typed
    Then the text is <new text>

    Examples:
      | position        | new text          |
      | after "bar"     | "foo ,bar,→ baz"  |
      | before "bar"    | "foo →,bar, baz"  |
      | before "ar baz" | "foo ,b->ar, baz" |
