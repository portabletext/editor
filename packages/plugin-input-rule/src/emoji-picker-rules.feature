Feature: Emoji Picker Rules

  Scenario: Trigger Rule
    Given the text ""
    When the editor is focused
    And ":" is typed
    Then the keyword is ""

  Scenario: Partial Keyword Rule
    Given the text ""
    When the editor is focused
    And ":jo" is typed
    Then the keyword is "jo"

  Scenario: Keyword Rule
    Given the text ""
    When the editor is focused
    And ":joy:" is typed
    Then the keyword is "joy"

  Scenario Outline: Consecutive keywords
    Given the text ":joy:"
    When the editor is focused
    And <text> is typed
    Then the keyword is <keyword>

    Examples:
      | text    | keyword |
      | ":"     | ""      |
      | ":cat"  | "cat"   |
      | ":cat:" | "cat"   |
