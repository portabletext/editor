Feature: Overlapping Annotations

  Background:
    Given one editor
    And a global keymap

  Scenario: Overlapping annotation
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected
    And "comment" "c1" is toggled
    Then the text is "foo,b,ar"
    And "foo" has marks "c1"
    And "b" has marks "l1,c1"
    And "ar" has marks "l1"

  Scenario: Overlapping annotation (backwards selection)
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected backwards
    And "comment" "c1" is toggled
    Then the text is "foo,b,ar"
    And "foo" has marks "c1"
    And "b" has marks "l1,c1"
    And "ar" has marks "l1"

  Scenario: Overlapping annotation from behind
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the text is "fo,o,bar"
    Then "fo" has marks "c1"
    And "o" has marks "c1,l1"
    And "bar" has marks "l1"

  Scenario: Overlapping annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the text is "fo,o,bar"
    Then "fo" has marks "c1"
    And "o" has marks "c1,l1"
    And "bar" has marks "l1"

  Scenario: Overlapping same-type annotation
    Given the text "foobar"
    And a "comment" "c1" around "bar"
    When "foob" is selected
    And "comment" "c2" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "c2"
    And "ar" has marks "c1"

  Scenario: Overlapping same-type annotation (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "bar"
    When "foob" is selected backwards
    And "comment" "c2" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "c2"
    And "ar" has marks "c1"

  Scenario: Overlapping same-type annotation from behind
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected
    And "comment" "c2" is toggled
    Then the text is "fo,obar"
    And "fo" has marks "c1"
    And "obar" has marks "c2"

  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected backwards
    And "comment" "c2" is toggled
    Then the text is "fo,obar"
    And "fo" has marks "c1"
    And "obar" has marks "c2"
