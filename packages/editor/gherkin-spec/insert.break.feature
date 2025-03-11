Feature: Insert Break

  Background:
    Given one editor

  Scenario Outline: Breaking text block
    Given the text "foo"
    When the caret is put <position>
    And "Enter" is pressed
    And "bar" is typed
    Then the text is <text>
    And the caret is <new position>

    Examples:
      | position     | text       | new position |
      | before "foo" | "\|barfoo" | before "foo" |
      | after "foo"  | "foo\|bar" | after "bar"  |
      | after "f"    | "f\|baroo" | after "bar"  |
