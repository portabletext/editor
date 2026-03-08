Feature: Insert Break

  Background:
    Given one editor

  Scenario Outline: Breaking text block
    Given the text "P: foo"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    And "bar" is inserted
    Then the text is <text>
    And the caret is <new position>

    Examples:
      | position     | text       | new position  |
      | before "foo" | "P:;;P: barfoo" | before "foo"  |
      | after "foo"  | "P: foo;;P: bar" | after "bar"   |
      | after "f"    | "P: f;;P: baroo" | after "bar"   |

  Scenario Outline: Breaking second text block
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    And "baz" is inserted
    Then the text is <text>
    And the caret is <new position>
    When undo is performed
    And undo is performed
    Then the text is "P: foo;;P: bar"

    Examples:
      | position     | text              | new position  |
      | before "bar" | "P: foo;;P:;;P: bazbar"   | before "bar"  |
      | after "bar"  | "P: foo;;P: bar;;P: baz"   | after "baz"   |
      | after "b"    | "P: foo;;P: b;;P: bazar"   | after "baz"   |

  Scenario: Breaking before inline object
    Given the text "P: foo{stock-ticker}bar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    And "baz" is inserted
    Then the text is "P: foo;;P: baz{stock-ticker}bar"
    And the caret is after "baz"

  Scenario: Pressing Enter when selecting the entire content
    Given the text "P: foo;;{IMAGE};;P: bar"
    When the editor is focused
    And everything is selected
    And "{Enter}" is pressed
    Then the text is "P:"
    When undo is performed
    Then the text is "P: foo;;{IMAGE};;P: bar"

  Scenario: Pressing Enter on a block object
    Given the text "P: foo;;{IMAGE}"
    When the editor is focused
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "{Enter}" is pressed
    Then the text is "P: foo;;{IMAGE};;P:"