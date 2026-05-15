Feature: Insert text

  Background:
    Given one editor

  Scenario Outline: Inserting text on expanded selection
    Given the editor state is <text>
    When the editor is focused
    And the selection is <selection>
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | selection           | new text             |
      | "B: foo;;B: bar" | "B: f^oo\|;;B: bar" | "B: fnew\|;;B: bar"  |
      | "B: foo;;B: bar" | "B: foo;;B: ^b\|ar" | "B: foo;;B: new\|ar" |
      | "B: foo;;B: bar" | "B: f^oo;;B: ba\|r" | "B: fnew\|r"         |
      | "B: foo;;B: bar" | "B: ^foo;;B: bar\|" | "B: new\|"           |
