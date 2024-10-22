Feature: Annotations Across Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Adding annotation across blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1,l2" is toggled
    Then "foo" has marks "l1"
    And "bar" has marks "l2"

  Scenario: Adding annotation across blocks (backwards selection)
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "link" "l1,l2" is toggled
    Then "foo" has marks "l1"
    And "bar" has marks "l2"

  Scenario: Adding annotation across an image
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1,l2" is toggled
    Then "foo" has marks "l1"
    And "bar" has marks "l2"
    And "foo|image|bar" is selected

  Scenario: Adding annotation across an image (backwards selection)
    Given the text "foo"
    And an "image"
    When "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "link" "l1,l2" is toggled
    Then "foo" has marks "l1"
    And "bar" has marks "l2"
    And "foo|image|bar" is selected

  Scenario: Splitting an annotation across blocks
    Given the text "foobar"
    And a "link" "l1" around "foobar"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo|bar"
    And "foo" has marks "l1"
    And "bar" has an annotation different than "l1"

  Scenario: Splitting an annotation across blocks using a selection
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "Enter" is pressed
    Then the text is "foo | baz"
    And "foo " has marks "l1"
    And " baz" has an annotation different than "l1"

  Scenario: Splitting a split annotation across blocks
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo| ,bar, baz"
    And "foo" has marks "l1"
    And " " has an annotation different than "l1"
    And "bar" has an annotation different than "l1"
    And " baz" has an annotation different than "l1"
    And " " and " baz" have the same marks

  Scenario: Splitting text before annotation doesn't touch the annotation
    Given the text "foo bar baz"
    And a "link" "l1" around "baz"
    When the caret is put before "bar"
    And "Enter" is pressed
    Then the text is "foo |bar ,baz"
    And "baz" has marks "l1"

  Scenario: Splitting text after annotation doesn't touch the annotation
    Given the text "foo bar baz"
    And a "link" "l1" around "foo"
    When the caret is put after "bar"
    And "Enter" is pressed
    Then the text is "foo, bar| baz"
    And "foo" has marks "l1"

  # Warning: Possible wrong behaviour
  # "foo" and "bar" should rejoin as one link
  # Fixing this is possibly a breaking change
  Scenario: Splitting and merging an annotation across blocks
    Given the text "foobar"
    And a "link" "l1" around "foobar"
    When the caret is put after "foo"
    And "Enter" is pressed
    And "Backspace" is pressed
    Then the text is "foo,bar"
    And "foo" has marks "l1"
    And "bar" has an annotation different than "l1"

  # Warning: Possible wrong behaviour
  # The " baz" link should have a unique key
  # Fixing this is possibly a breaking change
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
    Then the text is "|foo"
    And "" has no marks
    And "foo" has marks "l1"

  Scenario: Splitting block after annotation
    Given the text "foo"
    And a "link" "l1" around "foo"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo|"
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
