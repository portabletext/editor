# Objects like images, charts or page breaks
Feature: Block Objects

  Background:
    Given two editors
    And a global keymap

  Scenario: Pressing ArrowUp on a lonely image
    Given an "image"
    When "ArrowUp" is pressed
    And editors have settled
    Then the text is ",\n,image"

  Scenario: Pressing ArrowDown on a lonely image
    Given an "image"
    When "ArrowDown" is pressed
    And editors have settled
    Then the text is "image,\n,"

  Scenario: Pressing ArrowDown on image at the bottom
    Given the text "foo"
    And an "image"
    When "ArrowDown" is pressed
    And editors have settled
    Then the text is "foo,\n,image,\n,"

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
    Then the text is "foo,\n,bar"

  @skip
  # Mimics Google Docs' behaviour
  Scenario: Pressing Delete before an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put after "foo"
    And "Delete" is pressed
    Then the text is "foobar"

  @skip
  # Mimics Notion's behaviour
  Scenario: Pressing Delete before an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put after "foo"
    And "Delete" is pressed
    Then the text is "foobar,\n,image"

  # Warning: Not consistent with Delete before an image
  # Perhaps the image should be deleted instead
  Scenario: Pressing Backspace after an image
    Given the text "foo"
    And an "image" "m1"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put before "bar"
    And "Backspace" is pressed with navigation intent
    Then block "m1" is selected

  @skip
  # Mimics Google Docs' behaviour
  Scenario: Pressing Backspace after an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put before "bar"
    Then the text is "foobar"

  @skip
  # Mimics Notion's behaviour
  Scenario: Pressing Backspace after an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put before "bar"
    And "Backspace" is pressed
    Then the text is "foobar,\n,image"

  Scenario Outline: Deleting a lonely image
    Given an "image"
    When <button> is pressed
    And "foo" is typed
    Then the text is "foo"

    Examples:
      | button |
      | "Backspace" |
      | "Delete" |

  Scenario Outline: Deleting an image with text above
    Given the text "foo"
    And an "image"
    When <button> is pressed
    And "bar" is typed
    Then the text is "foobar"

    Examples:
      | button |
      | "Backspace" |
      | "Delete" |

  Scenario Outline: Deleting an image with text below
    Given an "image"
    When "Enter" is pressed
    And "foo" is typed
    And "ArrowUp" is pressed
    And <button> is pressed
    And "bar" is typed
    Then the text is "barfoo"

    Examples:
      | button |
      | "Backspace" |
      | "Delete" |
