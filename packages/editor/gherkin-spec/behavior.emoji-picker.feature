Feature: Emoji Picker

  Background:
    Given one editor
    And emoji picker behaviors
    And a global keymap

  Scenario: Picking a direct hit
    Given an empty editor
    When ":joy:" is typed
    Then the text is "😂"

  Scenario: Navigating down the list
    Given an empty editor
    When ":joy" is typed
    And "ArrowDown" is pressed
    And "Enter" is pressed
    Then the text is "😹"

  Scenario: Aborting on Escape
    Given an empty editor
    When ":joy" is typed
    And "Escape" is pressed
    And "Enter" is pressed
    Then the text is ":joy|"

  Scenario: Backspacing to narrow search
    Given an empty editor
    When ":joy" is typed
    And "Backspace" is pressed
    And "Enter" is pressed
    Then the text is "😂"

  @only
  Scenario: Backspacing at the beginning to narrow search
    Given an empty editor
    When ":joy" is typed
    And "ArrowLeft" is pressed 2 times
    And "Backspace" is pressed
    And "Enter" is pressed
    Then the text is "😂"
