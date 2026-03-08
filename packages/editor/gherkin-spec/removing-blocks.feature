Feature: Removing Blocks
  Background:
    Given one editor
    And a global keymap

  Scenario: Pressing Delete in empty block with text below
    Given the text "P: foo" in block "b1"
    And the text "P: bar" in block "b2"
    And the text "P: baz" in block "b3"
    When the editor is focused
    And the caret is put before "bar"
    And "{Delete}" is pressed 4 times
    Then the text is "P: foo;;P: baz"
    And "foo" is in block "b1"
    And "baz" is in block "b3"

  Scenario: Pressing Backspace in empty block with text below
    Given the text "P: foo" in block "b1"
    And the text "P: bar" in block "b2"
    And the text "P: baz" in block "b3"
    When the editor is focused
    And the caret is put after "bar"
    And "{Backspace}" is pressed 4 times
    Then the text is "P: foo;;P: baz"
    And "foo" is in block "b1"
    And "baz" is in block "b3"