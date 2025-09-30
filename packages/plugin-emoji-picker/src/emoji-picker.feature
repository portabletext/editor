Feature: Emoji Picker

  Background:
    Given the editor is focused

  Scenario: Picking a direct hit
    When ":joy:" is typed
    Then the text is "😂"

  Scenario: Navigating down the list
    When ":joy" is typed
    And "{ArrowDown}" is pressed
    And "{Enter}" is pressed
    Then the text is "😹"

  Scenario: Aborting on Escape
    When ":joy" is typed
    And "{Escape}" is pressed
    And "{Enter}" is pressed
    Then the text is ":joy|"

  Scenario: Backspacing to narrow search
    When ":joy" is typed
    And "{Backspace}" is pressed
    And "{Enter}" is pressed
    Then the text is "😂"

  Scenario: Typing before the colon
    When ":j" is typed
    And "{ArrowLeft}{ArrowLeft}" is pressed
    And "f" is typed
    And "{Enter}" is pressed
    Then the text is "f|:j"
