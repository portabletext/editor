Feature: Overlapping Decorators

  Background:
    Given one editor

  Scenario: Overlapping same-type decorator
    Given the editor state is "B: foobar"
    And "strong" around "bar"
    When "foob" is selected
    And "strong" is toggled
    Then the editor state is "B: [strong:^foob|ar]"

  Scenario: Overlapping same-type decorator (backwards selection)
    Given the editor state is "B: foobar"
    And "strong" around "bar"
    When "foob" is selected backwards
    And "strong" is toggled
    Then the editor state is "B: [strong:|foob^ar]"

  Scenario: Overlapping same-type annotation from behind
    Given the editor state is "B: foobar"
    And "strong" around "foo"
    When "obar" is selected
    And "strong" is toggled
    Then the editor state is "B: [strong:fo^obar|]"

  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the editor state is "B: foobar"
    And "strong" around "foo"
    When "obar" is selected backwards
    And "strong" is toggled
    Then the editor state is "B: [strong:fo|obar^]"
