Feature: Disallow in code

  Background:
    Given the editor is focused
    And a global keymap

  Scenario Outline: Decorated text
    Given the text "foo bar baz"
    And "code" around "bar"
    When the caret is put <position>
    And "->" is typed
    Then the text is <new text>

    Examples:
      | position        | new text          |
      | after "bar"     | "foo ,bar->, baz" |
      | before "bar"    | "foo →,bar, baz"  |
      | before "ar baz" | "foo ,b->ar, baz" |

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
