Feature: Emoji Picker Rules

  Scenario: Trigger Rule
    Given the text ""
    And the editor is focused
    When ":" is typed
    Then the keyword is ""

  Scenario: Partial Keyword Rule
    Given the text ""
    And the editor is focused
    When ":jo" is typed
    Then the keyword is "jo"

  Scenario: Keyword Rule
    Given the text ""
    And the editor is focused
    When ":joy:" is typed
    Then the keyword is "joy"

  Scenario Outline: Consecutive keywords
    Given the text ":joy:"
    And the editor is focused
    When <text> is typed
    Then the keyword is <keyword>

    Examples:
      | text    | keyword |
      | ":"     | ""      |
      | ":cat"  | "cat"   |
      | ":cat:" | "cat"   |
