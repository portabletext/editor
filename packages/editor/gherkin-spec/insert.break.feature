Feature: Insert Break

  Background:
    Given one editor

  Scenario Outline: Breaking text block
    Given the text "foo"
    When the caret is put <position>
    And "{Enter}" is pressed
    And "bar" is typed
    Then the text is <text>
    And the caret is <new position>

    Examples:
      | position     | text       | new position |
      | before "foo" | "\|barfoo" | before "foo" |
      | after "foo"  | "foo\|bar" | after "bar"  |
      | after "f"    | "f\|baroo" | after "bar"  |

  Scenario: Pressing Enter when selecting the entire content
    Given the text "foo|[image]|bar"
    When everything is selected
    And "{Enter}" is pressed
    Then the text is ""

  Scenario: Pressing Enter on an inline object
    Given the text "foo,[stock-ticker],"
    When the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "{Enter}" is pressed
    Then the text is "foo,[stock-ticker],|"

  Scenario: Pressing Enter on a block object
    Given the text "foo|[image]"
    When the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "{Enter}" is pressed
    Then the text is "foo|[image]|"
