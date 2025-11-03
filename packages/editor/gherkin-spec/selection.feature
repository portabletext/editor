Feature: Selection

  Background:
    Given one editor

  Scenario Outline: Expanding selection down
    Given the text <text>
    When the caret is put <position>
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    Then <selection> is selected

    Examples:
      | text                   | position     | selection       |
      | "foo\|bar\|baz"        | before "foo" | "foo\|bar\|"    |
      | "foo\|>#:bar\|baz"     | before "foo" | "foo\|>#:bar\|" |
      | "foo\|>#:bar\|{image}" | before "foo" | "foo\|>#:bar"   |

  Scenario: Expanding selection down into block object
    Given the text "foo|{image}|bar"
    When the caret is put before "foo"
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    Then "foo|{image}" is selected

  Scenario Outline: Expanding selection down through block objects
    Given the text <text>
    When the caret is put before "foo"
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    And "{Shift>}{ArrowDown}{/Shift}" is pressed
    Then <selection> is selected

    Examples:
      | text                         | selection               |
      | "foo\|{image}\|bar"          | "foo\|{image}\|bar"     |
      | "foo\|{image}\|bar\|baz"     | "foo\|{image}\|bar\|"   |
      | "foo\|{image}\|bar\|{image}" | "foo\|{image}\|bar"     |
      | "foo\|{image}\|{image}\|bar" | "foo\|{image}\|{image}" |

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
