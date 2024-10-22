Feature: Selection Adjustment

  Background:
    Given two editors
    And a global keymap

  Scenario: Selection is kept if another editor inserts a line above
    Given the text "foo" in block "b1"
    When the caret is put before "foo" by editor B
    And "Enter" is pressed by editor B
    And "bar" is typed
    Then the text is "|foobar"
    And "foobar" is in block "b1"

  Scenario: Selection is kept if another editor deletes the line above
    Given the text "foo" in block "b1"
    And the text "bar" in block "b2"
    When the caret is put after "bar"
    And the caret is put before "foo" by editor B
    And "Delete" is pressed 4 times by editor B
    And "baz" is typed
    Then the text is "barbaz"
    And "barbaz" is in block "b2"

  Scenario: Selection is kept if another editor backspace-deletes empty lines above
    Given the text "foo" in block "b1"
    And the text "bar" in block "b2"
    When the caret is put after "bar"
    And the caret is put before "foo" by editor B
    And "Enter" is pressed by editor B
    And the caret is put after "foo" by editor B
    And "Backspace" is pressed 4 times by editor B
    And "baz" is typed
    Then the text is "|barbaz"
    And "barbaz" is in block "b2"

  # Currently fails
  # When the "b2" block gets deleted the editor selection is moved to
  # before "d" and the text becomes "ab|cd"
  @skip
  Scenario: Selection is kept when another editor merges the line into the line above
    Given the text "a" in block "b1"
    And the text "b" in block "b2"
    And the text "d" in block "b3"
    When the caret is put after "b"
    And the caret is put before "b" by editor B
    And "Backspace" is pressed by editor B
    And "c" is typed
    Then the text is "abc|d"

  # Currently fails
  # When the "b3" block gets deleted the editor selection is moved to
  # after "a" and the text becomes "ac|bd"
  @skip
  Scenario: Selection is kept when another editor merges the line below into the current line
    Given the text "a" in block "b1"
    And the text "b" in block "b2"
    And the text "d" in block "b3"
    When the caret is put after "b"
    And the caret is put before "d" by editor B
    And "Backspace" is pressed by editor B
    And "c" is typed
    Then the text is "a|bcd"

  # Currently fails
  # When the spans get merged the editor selection is moved to
  # then end and the text becomes "abdc"
  @skip
  Scenario: Selection is kept when another editor changes marks on the same line
    Given the text "abd"
    And "strong" around "b"
    When the caret is put before "d"
    And "b" is selected by editor B
    When "strong" is toggled using the keyboard by editor B
    And "c" is typed
    Then the text is "abcd"
