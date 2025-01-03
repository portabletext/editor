Feature: Overlapping Decorators

  Background:
    Given one editor

  Scenario: Overlapping same-type decorator
    Given the text "foobar"
    And "strong" around "bar"
    When "foob" is selected
    And "strong" is toggled using the keyboard
    Then the text is "foobar"
    And "foobar" has marks "strong"

  Scenario: Overlapping same-type decorator (backwards selection)
    Given the text "foobar"
    And "strong" around "bar"
    When "foob" is selected backwards
    And "strong" is toggled using the keyboard
    Then the text is "foobar"
    And "foobar" has marks "strong"

  Scenario: Overlapping same-type annotation from behind
    Given the text "foobar"
    And "strong" around "foo"
    When "obar" is selected
    And "strong" is toggled using the keyboard
    Then the text is "foobar"
    And "foobar" has marks "strong"

  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the text "foobar"
    And "strong" around "foo"
    When "obar" is selected backwards
    And "strong" is toggled using the keyboard
    Then the text is "foobar"
    And "foobar" has marks "strong"
