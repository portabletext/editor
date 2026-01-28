Feature: onDismiss

  Scenario: Dismiss with Escape deletes typed text
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    When "{Escape}" is pressed
    Then the picker state is "idle"
    And the editor text is ""

  Scenario: Select does not trigger onDismiss cleanup
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    When "{Enter}" is pressed
    Then the picker state is "idle"
    And the editor text is "[John Doe]"

  Scenario: Dismissing and typing again
    When the editor is focused
    And "@j" is typed
    And "{Escape}" is pressed
    And "foo" is typed
    Then the text is "foo"

  Scenario: Dismissing and triggering again
    When the editor is focused
    And "@j" is typed
    And "{Escape}" is pressed
    And "@k" is typed
    Then the picker state is "no matches"
    When "{Escape}" is pressed
    And "foo" is typed
    Then the text is "foo"

  Scenario: Dismissing with no matches and typing again
    When the editor is focused
    And "@k" is typed
    And "{Escape}" is pressed
    And "foo" is typed
    Then the text is "foo"

  Scenario: Dismissing with Enter and typing again
    When the editor is focused
    And "@k" is typed
    And "{Enter}" is pressed
    And "foo" is typed
    Then the text is "foo"

  Scenario: Programmatic dismiss triggers onDismiss
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    When dismiss is sent to the picker
    Then the picker state is "idle"
    And the editor text is ""
