Feature: Annotations Overlapping Decorators

  Background:
    Given two editors
    And a global keymap

  Scenario: Annotation and decorator on the same text
    Given the text "foo bar baz"
    When "bar" is selected
    And "strong" is toggled using the keyboard
    And "link" "l1" is toggled
    Then the text is "foo ,bar, baz"
    And "bar" has marks "strong,l1"

  Scenario: Adding decorator inside annotation
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "strong" is toggled using the keyboard
    Then the text is "foo ,bar, baz"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " baz" has marks "l1"

  # Warning: Inconsistent behaviour
  # "bar" should be marked with "strong,l1"
  Scenario: Adding an annotation across a decorator
    Given the text "foo bar baz"
    And "strong" around "bar"
    When "foo bar baz" is selected
    And "link" "l1" is toggled
    Then the text is "foo bar baz"
    And "foo bar baz" has marks "l1"

  # Mimics Google Docs' behaviour
  # Mimics Notion's behaviour
  @skip
  Scenario: Adding an annotation across a decorator
    Given the text "foo bar baz"
    And "strong" around "bar"
    When "foo bar baz" is selected
    And "link" "l1" is toggled
    Then the text is "foo ,bar, baz"
    And "foo " has marks "l1"
    And "bar" has marks "strong,l1"
    And " baz" has marks "l1"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with l1
  # "b" should be marked with strong,l1
  # "ar" should be marked with strong
  Scenario: Annotation overlapping decorator
    Given the text "foobar"
    And "strong" around "bar"
    When "foob" is selected
    And "link" "l1" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "strong,l1"
    And "ar" has marks "strong"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with l1
  # "b" should be marked with strong,l1
  # "ar" should be marked with strong
  Scenario: Annotation overlapping decorator (backwards selection)
    Given the text "foobar"
    And "strong" around "bar"
    When "foob" is selected backwards
    And "link" "l1" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "l1"
    And "ar" has marks "strong"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with strong
  # "o" should be marked with "strong,l1"
  # "bar" should be marked with l1
  Scenario: Annotation overlapping decorator from behind
    Given the text "foobar"
    And "strong" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the text is "fo,obar"
    Then "fo" has marks "strong"
    And "obar" has marks "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with strong
  # "o" should be marked with "strong,l1"
  # "bar" should be marked with l1
  Scenario: Annotation overlapping decorator from behind (backwards selection)
    Given the text "foobar"
    And "strong" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the text is "fo,obar"
    Then "fo" has marks "strong"
    And "obar" has marks "strong,l1"
