Feature: Overlapping Annotations

  # Warning: Possible wrong behaviour
  # "foo" should be marked with c1
  # "b" should be marked with m,l1
  # "ar" should be marked with l1
  Scenario: Overlapping annotation
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is being selected
    And "comment" "c1" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "l1,c1"
    And "ar" has marks "l1"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with c1
  # "b" should be marked with m,l1
  # "ar" should be marked with l1
  Scenario: Overlapping annotation (backwards selection)
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is being selected backwards
    And "comment" "c1" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "c1"
    And "ar" has marks "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with c1
  # "o" should be marked with "c1,l1"
  # "bar" should be marked with l1
  Scenario: Overlapping annotation from behind
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is being selected
    And "link" "l1" is toggled
    Then the text is "fo,obar"
    Then "fo" has marks "c1"
    And "obar" has marks "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with c1
  # "o" should be marked with "c1,l1"
  # "bar" should be marked with l1
  Scenario: Overlapping annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is being selected backwards
    And "link" "l1" is toggled
    Then the text is "fo,obar"
    Then "fo" has marks "c1"
    And "obar" has marks "c1,l1"

  # Warning: Possible wrong behaviour
  # "foob" should be marked with c2
  # "ar" should be marked with c1
  Scenario: Overlapping same-type annotation
    Given the text "foobar"
    And a "comment" "c1" around "bar"
    When "foob" is being selected
    And "comment" "c2" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "c1,c2"
    And "ar" has marks "c1"

  Scenario: Overlapping same-type annotation (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "bar"
    When "foob" is being selected backwards
    And "comment" "c2" is toggled
    Then the text is "foob,ar"
    And "foob" has marks "c2"
    And "ar" has marks "c1"

  Scenario: Overlapping same-type annotation from behind
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is being selected
    And "comment" "c2" is toggled
    Then the text is "fo,obar"
    And "fo" has marks "c1"
    And "obar" has marks "c2"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with c1
  # "obar" should be marked with c2
  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is being selected backwards
    And "comment" "c2" is toggled
    Then the text is "fo,obar"
    And "fo" has marks "c1"
    And "obar" has marks "c1,c2"
