Feature: Selection

  Background:
    Given one editor

  Scenario: Expanding collapsed selection backwards from empty line
    Given the text "foo|"
    When the editor is focused
    And the caret is put before ""
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "o|" is selected

  Scenario: Expanding selection backwards, then forwards
    Given the text "foo|bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "o|" is selected
    When "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    Then "b" is selected

  Scenario: Reducing hanging selection
    Given the text "foo|bar"
    When the editor is focused
    And the caret is put before "foo"
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    Then "foo|" is selected
    When "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "foo" is selected

  Scenario: Reducing selection hanging onto empty line
    Given the text "foo|"
    When the editor is focused
    And the caret is put before "foo"
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    Then "foo|" is selected
    When "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "foo" is selected
