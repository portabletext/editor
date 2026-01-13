Feature: Typeahead Picker

  # Tests for partial trigger (showing picker and keyword extraction)
  Scenario Outline: Triggering picker with partial trigger
    When the editor is focused
    And <text> is typed
    Then the keyword is <keyword>
    And the picker state is <state>

    Examples:
      | text   | keyword | state             |
      | ":"    | ""      | "showing matches" |
      | ":j"   | "j"     | "showing matches" |
      | ":joy" | "joy"   | "showing matches" |
      | "abc"  | ""      | "idle"            |

  # Tests for no matches
  Scenario: No matches state
    When the editor is focused
    And ":xyz" is typed
    Then the keyword is "xyz"
    And the picker state is "no matches"

  Scenario: Dismissing with Escape
    When the editor is focused
    And ":joy" is typed
    Then the picker state is "showing matches"
    When "{Escape}" is pressed
    Then the picker state is "idle"
    And the text is ":joy"

  Scenario: Dismissing by moving selection outside keyword
    When the editor is focused
    And "abc :joy" is typed
    Then the picker state is "showing matches"
    When "{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}" is pressed
    Then the picker state is "idle"

  Scenario: Enter dismisses when no matches
    When the editor is focused
    And ":xyz" is typed
    And "{Enter}" is pressed
    Then the text is ":xyz"
    And the picker state is "idle"

  # Tests for keyboard navigation
  Scenario: Arrow down navigation
    When the editor is focused
    And ":jo" is typed
    Then the picker state is "showing matches"
    And the selected index is "0"
    When "{ArrowDown}" is pressed
    Then the selected index is "1"
    When "{ArrowDown}" is pressed
    Then the selected index is "2"
    When "{ArrowDown}" is pressed
    Then the selected index is "0"

  Scenario: Arrow up navigation
    When the editor is focused
    And ":jo" is typed
    Then the picker state is "showing matches"
    And the selected index is "0"
    When "{ArrowUp}" is pressed
    Then the selected index is "2"
    When "{ArrowUp}" is pressed
    Then the selected index is "1"

  # Tests for action execution
  Scenario: Enter selects match
    When the editor is focused
    And ":joy" is typed
    Then the picker state is "showing matches"
    When "{Enter}" is pressed
    Then the text is "😂"
    And the picker state is "idle"

  Scenario: Tab selects match
    When the editor is focused
    And ":joy" is typed
    Then the picker state is "showing matches"
    When "{Tab}" is pressed
    Then the text is "😂"
    And the picker state is "idle"

  Scenario: Arrow down then Enter selects correct match
    When the editor is focused
    And ":jo" is typed
    Then the picker state is "showing matches"
    When "{ArrowDown}" is pressed
    Then the selected index is "1"
    When "{Enter}" is pressed
    Then the text is "😹"
    And the picker state is "idle"

  # Tests for complete trigger auto-insert
  Scenario: Complete trigger auto-inserts exact match
    When the editor is focused
    And ":joy:" is typed
    Then the text is "😂"
    And the picker state is "idle"

  Scenario: Complete trigger with no exact match stays active
    When the editor is focused
    And ":jo:" is typed
    Then the text is ":jo:"
    And the keyword is "jo"
    And the picker state is "showing matches"
