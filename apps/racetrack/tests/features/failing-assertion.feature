Feature: Failing assertion

  Scenario: The text is not what the scenario expects
    Given one editor
    When the editor is focused
    And "foo" is typed
    Then the text is "bar"
