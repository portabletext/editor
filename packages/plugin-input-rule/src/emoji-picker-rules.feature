Feature: Emoji Picker Rules

  Background:
    Given the editor is focused

  Scenario: Trigger Rule
    Given the text ""
    When ":" is typed
    Then the keyword is ""

  Scenario: Partial Keyword Rule
    Given the text ""
    When ":jo" is typed
    Then the keyword is "jo"

  Scenario: Keyword Rule
    Given the text ""
    When ":joy:" is typed
    Then the keyword is "joy"

  Scenario Outline: Consecutive keywords
    Given the text ":joy:"
    When <text> is typed
    Then the keyword is <keyword>

    Examples:
      | text    | keyword |
      | ":"     | ""      |
      | ":cat"  | "cat"   |
      | ":cat:" | "cat"   |
