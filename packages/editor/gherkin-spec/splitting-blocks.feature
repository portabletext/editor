Feature: Splitting Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Splitting block at the beginning
    Given the text "foo" in block "b1"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is "|foo"
    And "foo" is in block "b1"

  Scenario: Splitting block in the middle
    Given the text "foo" in block "b1"
    When the caret is put after "fo"
    And "Enter" is pressed
    Then the text is "fo|o"
    And "fo" is in block "b1"

  Scenario: Splitting block at the end
    Given the text "foo" in block "b1"
    When "Enter" is pressed
    Then the text is "foo|"
    And "foo" is in block "b1"

  Scenario: Soft-splitting block at the beginning
    Given the text "foo" in block "b1"
    When the caret is put before "foo"
    And "Shift+Enter" is pressed
    Then the text is "\nfoo"
    And "\nfoo" is in block "b1"

  Scenario: Soft-splitting block in the middle
    Given the text "foo" in block "b1"
    When the caret is put after "fo"
    And "Shift+Enter" is pressed
    Then the text is "fo\no"
    And "fo\no" is in block "b1"

  Scenario: Soft-splitting block at the end
    Given the text "foo" in block "b1"
    When "Shift+Enter" is pressed
    Then the text is "foo\n"
    And "foo\n" is in block "b1"

  Scenario: Splitting styled block at the beginning
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put before "foo"
    And "Enter" is pressed
    Then block "0" has style "normal"
    And block "1" has style "h1"
    And "foo" is in block "b1"

  Scenario: Splitting styled block in the middle
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put after "fo"
    And "Enter" is pressed
    Then block "0" has style "h1"
    And block "1" has style "h1"
    And "fo" is in block "b1"

  Scenario: Splitting styled block at the end
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And "Enter" is pressed
    Then block "0" has style "h1"
    And block "1" has style "normal"
    And "foo" is in block "b1"

  Scenario: Soft-splitting styled block at the beginning
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put before "foo"
    And "Shift+Enter" is pressed
    Then block "0" has style "h1"
    And "\nfoo" is in block "b1"

  Scenario: Soft-splitting styled block in the middle
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And the caret is put after "fo"
    And "Shift+Enter" is pressed
    Then block "0" has style "h1"
    And "fo\no" is in block "b1"

  Scenario: Soft-splitting styled block at the end
    Given the text "foo" in block "b1"
    When "h1" is toggled
    And "Shift+Enter" is pressed
    Then block "0" has style "h1"
    And "foo\n" is in block "b1"
