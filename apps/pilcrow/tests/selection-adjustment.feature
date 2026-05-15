Feature: Selection Adjustment

  Background:
    Given two editors
    And a global keymap

  Scenario: Selection is kept if another editor inserts a line above
    Given the text "foo"
    When the caret is put after "foo"
    And Editor B is focused
    And the caret is put before "foo" in Editor B
    And "{Enter}" is pressed in Editor B
    Then the text is "|foo"
    And the caret is after "foo"

  Scenario: Selection is kept if another editor deletes the line above
    Given the text "foo|bar"
    When the caret is put after "bar"
    And Editor B is focused
    And the caret is put before "foo" in Editor B
    And "{Delete}" is pressed 4 times in Editor B
    Then the text is "bar"
    And the caret is after "bar"

  Scenario: Selection is kept if another editor backspace-deletes empty lines above
    Given the text "foo|bar"
    When the caret is put after "bar"
    And Editor B is focused
    And the caret is put before "foo" in Editor B
    And "{Enter}" is pressed in Editor B
    And the caret is put after "foo" in Editor B
    And "{Backspace}" is pressed 4 times in Editor B
    Then the text is "|bar"
    And the caret is after "bar"
