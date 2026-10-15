Feature: Step timeout

  Scenario: A step runs past the timeout
    Given one editor
    When the editor is focused
    And "foo" is typed
    And "Backspace" is pressed 50 times
    Then the text is ""

  Scenario: The next scenario types
    Given one editor
    When the editor is focused
    And "bar" is typed
    Then the text is "bar"
