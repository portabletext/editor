Feature: Reset

  Scenario: Reset replaces the value and clears undo
    Given the editor state is "B: foo"
    When "x" is typed
    And the editor is reset to "B: bar"
    Then the editor state is "B: bar"
    When undo is performed
    Then the editor state is "B: bar"

  Scenario: Reset replaces a callout value
    Given the editor state is "CALLOUT:;;  B: foo"
    When the editor is reset to "CALLOUT:;;  B: bar"
    Then the editor state is "CALLOUT:{B: bar}"
