# Objects like images, charts or page breaks
Feature: Block Objects

  Background:
    Given one editor
    And a global keymap

  Scenario: Pressing ArrowUp on a lonely image
    Given an "image"
    When "ArrowUp" is pressed
    And editors have settled
    Then the text is "|[image]"

  Scenario: Pressing ArrowDown on a lonely image
    Given an "image"
    When "ArrowDown" is pressed
    And editors have settled
    Then the text is "[image]|"

  Scenario: Pressing ArrowDown on image at the bottom
    Given the text "foo"
    And an "image"
    When "ArrowDown" is pressed
    And editors have settled
    Then the text is "foo|[image]|"

  Scenario: ArrowRight before an image selects it
    Given the text "foo"
    And an "image" "m1"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put after "foo"
    And "ArrowRight" is pressed
    Then block "m1" is selected

  Scenario: ArrowLeft after an image selects it
    Given the text "foo"
    And an "image" "m1"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put before "bar"
    And "ArrowLeft" is pressed
    Then block "m1" is selected

  Scenario: Pressing Delete before an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put after "foo"
    And "Delete" is pressed
    Then the text is "foo|bar"

  Scenario: Pressing Delete in an empty paragraph before an image
    Given the text "foo"
    And an "image" "m1"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put before "foo"
    And "Delete" is pressed 4 times
    Then the text is "[image]|bar"
    And block "m1" is selected

  Scenario: Pressing Backspace after an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put before "bar"
    And "Backspace" is pressed
    Then the text is "foo|bar"

  Scenario: Pressing Backspace in an empty paragraph after an image
    Given the text "foo"
    And an "image" "m1"
    When "Enter" is pressed
    And "Backspace" is pressed
    Then the text is "foo|[image]"
    And block "m1" is selected

  Scenario Outline: Deleting a lonely image
    Given an "image"
    When <button> is pressed
    And "foo" is typed
    Then the text is "foo"

    Examples:
      | button      |
      | "Backspace" |
      | "Delete"    |

  Scenario Outline: Deleting an image with text above
    Given the text "foo"
    And an "image"
    When <button> is pressed
    And "bar" is typed
    Then the text is "foobar"

    Examples:
      | button      |
      | "Backspace" |
      | "Delete"    |

  Scenario Outline: Deleting an image with text below
    Given an "image"
    When "Enter" is pressed
    And "foo" is typed
    And "ArrowUp" is pressed
    And <button> is pressed
    And "bar" is typed
    Then the text is "barfoo"

    Examples:
      | button      |
      | "Backspace" |
      | "Delete"    |
