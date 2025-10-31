Feature: Insert text

  Background:
    Given one editor

  Scenario Outline: Inserting text on expanded selection
    Given the text <text>
    When <selection> is selected
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text       | selection | new text     |
      | "foo\|bar" | "oo"      | "fnew\|bar"  |
      | "foo\|bar" | "b"       | "foo\|newar" |
      | "foo\|bar" | "ooba"    | "fnewr"      |
      | "foo\|bar" | "foobar"  | "new"        |
