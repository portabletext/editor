Feature: Typing warnings

  Scenario: Typing without a selection
    Given one editor
    When "foo" is typed
    And the editor is focused
    And "bar is typed" is typed
    Then the text is "bar is typed"
