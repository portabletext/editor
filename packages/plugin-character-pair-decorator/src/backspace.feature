Feature: Backspace after auto-decoration

  Background:
    Given a global keymap

  Scenario: Backspace after typing past an auto-decorated pair deletes one character
    Given the text ""
    When "`code`" is typed
    Then the text is "code"
    When " hello" is typed
    Then the text is "code, hello"
    When "{Backspace}" is pressed
    Then the text is "code, hell"
