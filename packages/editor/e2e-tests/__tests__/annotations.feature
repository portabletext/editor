Feature: Annotations
  Scenario: Deleting half of annotated text
    Given the text "foo bar baz"
    And a "comment" "c1" around "foo bar baz"
    When " baz" is selected
    And "Backspace" is pressed
    Then the text is "foo bar"
    And "foo bar" is marked with "c1"

  Scenario: Deleting annotation in the middle of text
    Given the text "foo bar baz"
    And a "comment" "c1" around "bar"
    When "bar " is selected
    And "Backspace" is pressed
    Then the text is "foo baz"
    And "foo baz" has no marks

  Scenario: Editor B inserts text after Editor A's half-deleted annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "foo"
    And "Backspace" is pressed
    And the caret is put after "fo" by editor B
    And "a" is typed by editor B
    Then the text is "fo,a"
    And "fo" is marked with "c1"
    And "a" has no marks

  Scenario: Writing on top of annotation
    Given the text "foo bar baz"
    And a "comment" "c1" around "bar"
    When "removed" is typed
    Then the text is "foo removed baz"
    And "foo removed baz" has no marks

  Scenario: Deleting emphasised paragraph with comment in the middle
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    And a "comment" "c1" around "bar"
    When "foo bar baz" is selected
    And "Backspace" is pressed
    Then the editor is empty

  Scenario: Splitting block before annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is ",\n,foo"
    And "" has no marks
    And "foo" is marked with "c1"

  Scenario: Splitting block after annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,"
    And "foo" is marked with "c1"
    And "" has no marks

  # Warning: Possible wrong behaviour
  # "bar" should be marked with a new comment
  Scenario: Splitting an annotation
    Given the text "foobar"
    And a "comment" "c1" around "foobar"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,bar"
    And "foo" is marked with "c1"
    And "bar" is marked with "c1"

  Scenario: Merging blocks with annotations
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar"
    And the caret is put before "bar"
    And "Backspace" is pressed
    Then the text is "foo,bar"
    And "foo" is marked with "c1"
    And "bar" is marked with "c2"

  # Warning: Possible wrong behaviour
  # "f" and "r" should end up on the same line
  Scenario: Deleting across annotated blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar"
    And "ooba" is selected
    And "Backspace" is pressed
    Then the text is "f,\n,r"
    And "f" is marked with "c1"
    And "r" is marked with "c2"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with a comment
  Scenario: Adding annotation across blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "comment" "c1" is toggled
    Then "foo" has no marks
    And "bar" is marked with "c1"

  # Warning: Possible wrong behaviour
  # "bar" should be marked with a comment
  Scenario: Adding annotation across blocks (backwards selection)
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "comment" "c1" is toggled
    Then "foo" is marked with "c1"
    And "bar" has no marks

  # Warning: Possible wrong behaviour
  # "foo" should be marked with c1
  # "b" should be marked with m,l1
  # "ar" should be marked with l1
  Scenario: Overlapping annotation
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected
    And "comment" "c1" is toggled
    Then the text is "foob,ar"
    And "foob" is marked with "l1,c1"
    And "ar" is marked with "l1"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with c1
  # "b" should be marked with m,l1
  # "ar" should be marked with l1
  Scenario: Overlapping annotation (backwards selection)
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected backwards
    And "comment" "c1" is toggled
    Then the text is "foob,ar"
    And "foob" is marked with "c1"
    And "ar" is marked with "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with c1
  # "o" should be marked with "c1,l1"
  # "bar" should be marked with l1
  Scenario: Overlapping annotation from behind
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the text is "fo,obar"
    Then "fo" is marked with "c1"
    And "obar" is marked with "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with c1
  # "o" should be marked with "c1,l1"
  # "bar" should be marked with l1
  Scenario: Overlapping annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the text is "fo,obar"
    Then "fo" is marked with "c1"
    And "obar" is marked with "c1,l1"

  # Warning: Possible wrong behaviour
  # "foob" should be marked with c2
  # "ar" should be marked with c1
  Scenario: Overlapping same-type annotation
    Given the text "foobar"
    And a "comment" "c1" around "bar"
    When "foob" is selected
    And "comment" "c2" is toggled
    Then the text is "foob,ar"
    And "foob" is marked with "c1,c2"
    And "ar" is marked with "c1"

  Scenario: Overlapping same-type annotation (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "bar"
    When "foob" is selected backwards
    And "comment" "c2" is toggled
    Then the text is "foob,ar"
    And "foob" is marked with "c2"
    And "ar" is marked with "c1"

  Scenario: Overlapping same-type annotation from behind
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected
    And "comment" "c2" is toggled
    Then the text is "fo,obar"
    And "fo" is marked with "c1"
    And "obar" is marked with "c2"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with c1
  # "obar" should be marked with c2
  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected backwards
    And "comment" "c2" is toggled
    Then the text is "fo,obar"
    And "fo" is marked with "c1"
    And "obar" is marked with "c1,c2"
