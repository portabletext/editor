Feature: Two editors

  Scenario: Text typed in Editor B reaches Editor A
    Given two editors
    When the editor is focused
    And "foo" is typed
    And Editor B is focused
    And the caret is put after "foo" in Editor B
    And "bar" is typed in Editor B
    Then capture the state
    And the text is "foobar"
