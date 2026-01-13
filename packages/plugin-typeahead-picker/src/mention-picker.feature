Feature: Mention Picker

  # Basic triggering
  Scenario: Triggering picker
    When the editor is focused
    And "@j" is typed
    Then the keyword is "j"

  Scenario: No trigger without @
    When the editor is focused
    And "hello" is typed
    Then the keyword is ""
    And the picker state is "idle"

  # Async loading
  Scenario: Shows matches after loading
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    And the matches are "John Doe,Jane Smith"

  # Selection with Enter and Tab
  Scenario: Enter selects match
    When the editor is focused
    And "@john" is typed
    Then the matches are "John Doe"
    When "{Enter}" is pressed
    Then the text is "John Doe"
    And the picker state is "idle"

  Scenario: Tab selects match
    When the editor is focused
    And "@john" is typed
    Then the matches are "John Doe"
    When "{Tab}" is pressed
    Then the text is "John Doe"
    And the picker state is "idle"

  # Dismissing
  Scenario: Dismissing with Escape
    When the editor is focused
    And "@john" is typed
    When "{Escape}" is pressed
    Then the text is "@john"
    And the picker state is "idle"

  Scenario: Dismissing by moving cursor left
    When the editor is focused
    And "hello @j" is typed
    Then the picker state is "showing matches"
    When "{ArrowLeft}{ArrowLeft}{ArrowLeft}" is pressed
    Then the picker state is "idle"

  # No matches
  Scenario: No matches state
    When the editor is focused
    And "@xyz" is typed
    Then the picker state is "no matches"
    And the keyword is "xyz"

  Scenario: Enter dismisses when no matches
    When the editor is focused
    And "@xyz" is typed
    Then the picker state is "no matches"
    When "{Enter}" is pressed
    Then the text is "@xyz"
    And the picker state is "idle"

  # Keyboard navigation
  Scenario: Arrow down navigation
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    And the selected index is "0"
    When "{ArrowDown}" is pressed
    Then the selected index is "1"

  Scenario: Arrow down wraps around
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    When "{ArrowDown}" is pressed
    And "{ArrowDown}" is pressed
    Then the selected index is "0"

  Scenario: Arrow up navigation
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    And the selected index is "0"
    When "{ArrowUp}" is pressed
    Then the selected index is "1"

  Scenario: Arrow navigation then Enter selects correct match
    When the editor is focused
    And "@j" is typed
    Then the picker state is "showing matches"
    When "{ArrowDown}" is pressed
    And "{Enter}" is pressed
    Then the text is "Jane Smith"

  # Narrowing search
  Scenario: Typing more characters narrows results
    When the editor is focused
    And "@j" is typed
    Then the matches are "John Doe,Jane Smith"
    When "o" is typed
    Then the matches are "John Doe"

  Scenario: Backspace widens search
    When the editor is focused
    And "@john" is typed
    Then the matches are "John Doe"
    When "{Backspace}" is pressed
    Then the matches are "John Doe"

  Scenario: Matches are not loaded when the editor is focused
    When the editor is focused
    Then getMatches was called "0" times

  Scenario: Matches are not loaded for a different trigger
    When the editor is focused
    And ":j" is typed
    Then getMatches was called "0" times

  Scenario: Matches are loaded when the trigger is typed
    When the editor is focused
    And "@" is typed
    Then the matches are ""

  Scenario: Consecutive typing calls getMatches each time
    When the editor is focused
    And "@" is typed
    Then the matches are ""
    When "j" is typed
    Then the matches are "John Doe,Jane Smith"
    When "a" is typed
    Then the matches are "Jane Smith"
    And getMatches was called "3" times
