Feature: Annotations Across Blocks

  Background:
    Given two editors
    And a global keymap

  # Warning: Possible wrong behaviour
  # "foo" should also be marked with a link
  Scenario: Adding annotation across blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1" is toggled
    Then "foo" has no marks
    And "bar" has marks "l1"

  # Warning: Possible wrong behaviour
  # "bar" should also be marked with a link
  Scenario: Adding annotation across blocks (backwards selection)
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "link" "l1" is toggled
    Then "foo" has marks "l1"
    And "bar" has no marks

  # Warning: Possible wrong behaviour
  # "foo" should also be marked with a link
  Scenario: Adding annotation across an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1" is toggled
    Then "foo" has no marks
    And "bar" has marks "l1"
    And "foo,\n,image,\n,bar" is selected

  # Warning: Possible wrong behaviour
  # "bar" should also be marked with a link
  Scenario: Adding annotation across an image (backwards selection)
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "link" "l1" is toggled
    Then "foo" has marks "l1"
    And "bar" has no marks
    And "foo,\n,image,\n,bar" is selected

  # Warning: Possible wrong behaviour
  # The "bar" link should have a unique key
  Scenario: Splitting an annotation across blocks
    Given the text "foobar"
    And a "link" "l1" around "foobar"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,bar"
    And "foo" has marks "l1"
    And "bar" has marks "l1"

  # Warning: Possible wrong behaviour
  # The " baz" link should have a unique key
  Scenario: Toggling part of an annotation off
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "link" is toggled
    Then the text is "foo ,bar, baz"
    And "foo " has marks "l1"
    And "bar" has no marks
    And " baz" has marks "l1"

  Scenario: Splitting block before annotation
    Given the text "foo"
    And a "link" "l1" around "foo"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is ",\n,foo"
    And "" has no marks
    And "foo" has marks "l1"

  Scenario: Splitting block after annotation
    Given the text "foo"
    And a "link" "l1" around "foo"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,"
    And "foo" has marks "l1"
    And "" has no marks

  Scenario: Merging blocks with annotations
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And "foo" is marked with a "link" "l1"
    And "bar" is marked with a "link" "l2"
    And the caret is put before "bar"
    And "Backspace" is pressed
    Then the text is "foo,bar"
    And "foo" has marks "l1"
    And "bar" has marks "l2"

