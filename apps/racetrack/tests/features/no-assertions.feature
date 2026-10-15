Feature: No assertions

  Scenario: Typing without asserting
    Given one editor
    When the editor is focused
    And "foo" is typed
