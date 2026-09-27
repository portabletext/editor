Feature: Typing

  Scenario: Typed text lands at the caret
    Given one editor
    When the editor is focused
    And "foo" is typed
    Then the text is "foo"
    And the caret is after "foo"
