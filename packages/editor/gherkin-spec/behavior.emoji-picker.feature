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
