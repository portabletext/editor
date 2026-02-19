Feature: Insert Break

  Background:
    Given one editor

  Scenario Outline: Breaking text block
    Given the text "foo"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    And "bar" is inserted
    Then the text is <text>
    And the caret is <new position>

    Examples:
      | position     | text       | new position |
      | before "foo" | "\|barfoo" | before "foo" |
      | after "foo"  | "foo\|bar" | after "bar"  |
      | after "f"    | "f\|baroo" | after "bar"  |

  Scenario Outline: Breaking second text block
    Given the text "foo|bar"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    And "baz" is inserted
    Then the text is <text>
    And the caret is <new position>
    When undo is performed
    And undo is performed
    Then the text is "foo|bar"

    Examples:
      | position     | text            | new position |
      | before "bar" | "foo\|\|bazbar" | before "bar" |
      | after "bar"  | "foo\|bar\|baz" | after "baz"  |
      | after "b"    | "foo\|b\|bazar" | after "baz"  |

  Scenario: Breaking before inline object
    Given the text "foo,{stock-ticker},bar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    And "baz" is inserted
    Then the text is "foo|baz,{stock-ticker},bar"
    And the caret is after "baz"

  Scenario: Pressing Enter when selecting the entire content
    Given the text "foo|{image}|bar"
    When the editor is focused
    And everything is selected
    And "{Enter}" is pressed
    Then the text is ""
    When undo is performed
    Then the text is "foo|{image}|bar"

  Scenario: Pressing Enter on a block object
    Given the text "foo|{image}"
    When the editor is focused
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "{Enter}" is pressed
    Then the text is "foo|{image}|"
