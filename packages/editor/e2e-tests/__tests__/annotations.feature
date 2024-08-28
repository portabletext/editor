Feature: Annotations
  Scenario: Deleting half of annotated text
    Given the text "foo bar baz"
    And a "comment" "m1" around "foo bar baz"
    When " baz" is selected
    And "Backspace" is pressed
    Then the text is "foo bar"
    And "foo bar" is marked with "m1"

  Scenario: Deleting annotation in the middle of text
    Given the text "foo bar baz"
    And a "comment" "m1" around "bar"
    When "bar " is selected
    And "Backspace" is pressed
    Then the text is "foo baz"
    And "foo baz" has no marks

  Scenario: Editor B inserts text after Editor A's half-deleted annotation
    Given the text "foo"
    And a "comment" "m1" around "foo"
    When the caret is put after "foo"
    And "Backspace" is pressed
    And the caret is put after "fo" by editor B
    And "a" is typed by editor B
    Then the text is "fo,a"
    And "fo" is marked with "m1"
    And "a" has no marks

  Scenario: Writing on top of annotation
    Given the text "foo bar baz"
    And a "comment" "m1" around "bar"
    When "removed" is typed
    Then the text is "foo removed baz"
    And "foo removed baz" has no marks

  Scenario: Deleting emphasised paragraph with comment in the middle
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    And a "comment" "m1" around "bar"
    When "foo bar baz" is selected
    And "Backspace" is pressed
    Then the editor is empty

  Scenario: Toggling bold inside italic
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    When "bar" is marked with "strong"
    Then the text is "foo ,bar, baz"
    And "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"
    And "bar" is selected
    And "strong" is toggled
    Then the text is "foo bar baz"
    And "foo bar baz" has marks "em"

  Scenario: Toggling bold inside italic as you write
    Given "em" is toggled
    When "foo " is typed
    And "strong" is toggled
    And "bar" is typed
    And "strong" is toggled
    And " baz" is typed
    Then the text is "foo ,bar, baz"
    And "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"

  Scenario: Deleting marked txt and writing again, unmarked
    Given the text "foo"
    And "strong" around "foo"
    When the caret is put after "foo"
    And "Backspace" is pressed 3 times
    And "bar" is typed
    Then the text is "bar"
    And "bar" has no marks

  Scenario: Adding bold across an empty block and typing in the same
    Given the text "foo"
    When "Enter" is pressed 2 times
    And "bar" is typed
    And "foobar" is marked with "strong"
    And the caret is put after "foo"
    And "ArrowDown" is pressed
    And "bar" is typed
    Then "bar" has marks "strong"

  Scenario: Toggling bold across an empty block
    Given the text "foo"
    When "Enter" is pressed 2 times
    And "bar" is typed
    Then the text is "foo,\n,,\n,bar"
    When "ooba" is selected
    And "strong" is toggled
    Then the text is "f,oo,\n,,\n,ba,r"
    And "oo" has marks "strong"
    And "ba" has marks "strong"
    When "strong" is toggled
    Then the text is "foo,\n,,\n,bar"

  Scenario: Splitting block at the beginning
    Given the text "foo" in block "b1"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is ",\n,foo"
    And "foo" is in block "b1"

  Scenario: Splitting block in the middle
    Given the text "foo" in block "b1"
    When the caret is put after "fo"
    And "Enter" is pressed
    Then the text is "fo,\n,o"
    And "fo" is in block "b1"

  Scenario: Splitting block at the end
    Given the text "foo" in block "b1"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,"
    And "foo" is in block "b1"

  # Warning: Possible wrong behaviour
  # "bar" should be marked with "strong"
  Scenario: Splitting block before decorator
    Given the text "foo"
    And "strong" around "foo"
    When the caret is put before "foo"
    And "Enter" is pressed
    And "ArrowUp" is pressed
    And "bar" is typed
    Then the text is "bar,\n,foo"
    And "bar" has no marks
    And "foo" has marks "strong"

  Scenario: Splitting block before annotation
    Given the text "foo"
    And a "comment" "m1" around "foo"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is ",\n,foo"
    And "" has no marks
    And "foo" is marked with "m1"

  Scenario: Splitting block after annotation
    Given the text "foo"
    And a "comment" "m1" around "foo"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,"
    And "foo" is marked with "m1"
    And "" has no marks

  # Warning: Possible wrong behaviour
  # "bar" should be marked with a new comment
  Scenario: Splitting an annotation
    Given the text "foobar"
    And a "comment" "m1" around "foobar"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,bar"
    And "foo" is marked with "m1"
    And "bar" is marked with "m1"

  Scenario: Merging blocks with annotations
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And a "comment" "m1" around "foo"
    And a "comment" "m2" around "bar"
    And the caret is put before "bar"
    And "Backspace" is pressed
    Then the text is "foo,bar"
    And "foo" is marked with "m1"
    And "bar" is marked with "m2"

  # Warning: Possible wrong behaviour
  # "f" and "r" should end up on the same line
  Scenario: Deleting across annotated blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And a "comment" "m1" around "foo"
    And a "comment" "m2" around "bar"
    And "ooba" is selected
    And "Backspace" is pressed
    Then the text is "f,\n,r"
    And "f" is marked with "m1"
    And "r" is marked with "m2"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with a comment
  Scenario: Adding annotation across blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "comment" "m1" is added
    Then "foo" has no marks
    And "bar" is marked with "m1"

  # Warning: Possible wrong behaviour
  # "bar" should be marked with a comment
  Scenario: Adding annotation across blocks (backwards selection)
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "comment" "m1" is added
    Then "foo" is marked with "m1"
    And "bar" has no marks

  # Warning: Possible wrong behaviour
  # "foo" should be marked with m1
  # "b" should be marked with m,l1
  # "ar" should be marked with l1
  Scenario: Overlapping annotation
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected
    And "comment" "m1" is added
    Then the text is "foob,ar"
    And "foob" is marked with "l1,m1"
    And "ar" is marked with "l1"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with m1
  # "b" should be marked with m,l1
  # "ar" should be marked with l1
  Scenario: Overlapping annotation (backwards selection)
    Given the text "foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected backwards
    And "comment" "m1" is added
    Then the text is "foob,ar"
    And "foob" is marked with "m1"
    And "ar" is marked with "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with m1
  # "o" should be marked with "m1,l1"
  # "bar" should be marked with l1
  Scenario: Overlapping annotation from behind
    Given the text "foobar"
    And a "comment" "m1" around "foo"
    When "obar" is selected
    And "link" "l1" is added
    Then the text is "fo,obar"
    Then "fo" is marked with "m1"
    And "obar" is marked with "l1"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with m1
  # "o" should be marked with "m1,l1"
  # "bar" should be marked with l1
  Scenario: Overlapping annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "m1" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is added
    Then the text is "fo,obar"
    Then "fo" is marked with "m1"
    And "obar" is marked with "m1,l1"

  # Warning: Possible wrong behaviour
  # "foob" should be marked with m2
  # "ar" should be marked with m1
  Scenario: Overlapping same-type annotation
    Given the text "foobar"
    And a "comment" "m1" around "bar"
    When "foob" is selected
    And "comment" "m2" is added
    Then the text is "foob,ar"
    And "foob" is marked with "m1,m2"
    And "ar" is marked with "m1"

  Scenario: Overlapping same-type annotation (backwards selection)
    Given the text "foobar"
    And a "comment" "m1" around "bar"
    When "foob" is selected backwards
    And "comment" "m2" is added
    Then the text is "foob,ar"
    And "foob" is marked with "m2"
    And "ar" is marked with "m1"

  Scenario: Overlapping same-type annotation from behind
    Given the text "foobar"
    And a "comment" "m1" around "foo"
    When "obar" is selected
    And "comment" "m2" is added
    Then the text is "fo,obar"
    And "fo" is marked with "m1"
    And "obar" is marked with "m2"

  # Warning: Possible wrong behaviour
  # "fo" should be marked with m1
  # "obar" should be marked with m2
  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the text "foobar"
    And a "comment" "m1" around "foo"
    When "obar" is selected backwards
    And "comment" "m2" is added
    Then the text is "fo,obar"
    And "fo" is marked with "m1"
    And "obar" is marked with "m1,m2"
