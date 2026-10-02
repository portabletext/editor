Feature: Scenario isolation

  Scenario: The first scenario types
    Given one editor
    When the editor is focused
    And "foo" is typed
    Then the text is "foo"

  Scenario: The second scenario only asserts
    Then the text is "foo"
