Feature: Insert text

  Background:
    Given one editor

  Scenario Outline: Inserting text on expanded selection
    Given the text <text>
    When the editor is focused
    And <selection> is selected
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text             | selection | new text          |
      | "P: foo;;P: bar" | "oo"      | "P: fnew;;P: bar" |
      | "P: foo;;P: bar" | "b"       | "P: foo;;P: newar"|
      | "P: foo;;P: bar" | "ooba"    | "P: fnewr"        |
      | "P: foo;;P: bar" | "foobar"  | "P: new"          |
