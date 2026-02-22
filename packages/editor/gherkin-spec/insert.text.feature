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
      | text       | selection | new text     |
      | "foo\|bar" | "oo"      | "fnew\|bar"  |
      | "foo\|bar" | "b"       | "foo\|newar" |
      | "foo\|bar" | "ooba"    | "fnewr"      |
      | "foo\|bar" | "foobar"  | "new"        |

  Scenario: Inserting text after a specific location
    Given the text "foobar"
    When the editor is focused
    And "baz" is inserted after "foo"
    Then the text is "foobazbar"

  Scenario: Inserting text before a specific location
    Given the text "foobar"
    When the editor is focused
    And "baz" is inserted before "foobar"
    Then the text is "bazfoobar"

  Scenario: Inserting text over an expanded range replaces the range
    Given the text "foobar"
    When the editor is focused
    And "baz" is inserted over "ooba"
    Then the text is "fbazr"
