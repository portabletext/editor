Feature: Removing Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Pressing Delete in empty block with text below
    Given the editor state is "B _key=\"b1\": foo;;B _key=\"b2\": bar;;B _key=\"b3\": baz"
    When the editor is focused
    And the selection is "B: foo;;B: |bar;;B: baz"
    And "{Delete}" is pressed 4 times
    Then the editor state is "B _key=\"b1\": foo;;B _key=\"b3\": |baz"

  Scenario: Pressing Backspace in empty block with text below
    Given the editor state is "B _key=\"b1\": foo;;B _key=\"b2\": bar;;B _key=\"b3\": baz"
    When the editor is focused
    And the selection is "B: foo;;B: bar|;;B: baz"
    And "{Backspace}" is pressed 4 times
    Then the editor state is "B _key=\"b1\": foo|;;B _key=\"b3\": baz"
