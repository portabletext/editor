# Objects like images, charts or page breaks
Feature: Block Objects

  Background:
    Given one editor
    And a global keymap

  Scenario: Pressing ArrowUp on a lonely image
    Given the text "{image}"
    When the editor is focused
    And "{ArrowUp}" is pressed
    Then the text is "|{image}"

  Scenario: Pressing ArrowDown on a lonely image
    Given the text "{image}"
    When the editor is focused
    And "{ArrowDown}" is pressed
    Then the text is "{image}|"

  Scenario: Pressing ArrowDown on image at the bottom
    When the editor is focused
    And "foo|{image}" is inserted at "auto" and selected at the "end"
    And "{ArrowDown}" is pressed
    Then the text is "foo|{image}|"

  Scenario: ArrowRight before an image selects it
    Given the text "foo|{image}"
    When the editor is focused
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    Then "{image}" is selected

  Scenario: ArrowLeft after an image selects it
    Given the text "{image}|bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{ArrowLeft}" is pressed
    Then "{image}" is selected

  Scenario: Pressing Delete before an image
    Given the text "foo|{image}|bar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Delete}" is pressed
    Then the text is "foo|bar"

  Scenario: Pressing Delete in an empty paragraph before an image
    Given the text "foo|{image}|bar"
    When the editor is focused
    And the caret is put before "foo"
    And "{Delete}" is pressed 4 times
    And "{Enter}" is pressed
    Then the text is "{image}||bar"

  Scenario: Pressing Backspace after an image
    Given the text "foo|{image}|bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{Backspace}" is pressed
    Then the text is "foo|bar"

  Scenario: Pressing Backspace in an empty paragraph after an image
    When the editor is focused
    And "foo|{image}" is inserted at "auto" and selected at the "end"
    And "{Enter}" is pressed
    And "{Backspace}" is pressed
    Then the text is "foo|{image}"
    And "{image}" is selected

  Scenario Outline: Deleting a lonely image
    Given the text "{image}"
    When the editor is focused
    And <button> is pressed
    And "foo" is typed
    Then the text is "foo"

    Examples:
      | button        |
      | "{Backspace}" |
      | "{Delete}"    |

  Scenario Outline: Deleting an image with text above
    Given the text "foo|{image}|b"
    When the editor is focused
    And the caret is put after "b"
    And "{Backspace}" is pressed 2 times
    And <button> is pressed
    And "bar" is typed
    Then the text is "foobar"

    Examples:
      | button        |
      | "{Backspace}" |
      | "{Delete}"    |

  Scenario Outline: Deleting an image with text below
    Given the text "b|{image}|foo"
    When the editor is focused
    And the caret is put before "b"
    And "{Delete}" is pressed 2 times
    And <button> is pressed
    And "bar" is typed
    Then the text is "barfoo"

    Examples:
      | button        |
      | "{Backspace}" |
      | "{Delete}"    |
