# Simple marks like bold and italic
Feature: Decorators

  Scenario: Inserting text after a decorator
    Given the text "foo"
	  And "strong" around "foo"
    Then "foo" has marks "strong"
	  When the caret is put after "foo"
	  And "bar" is typed
    Then the text is "foobar"
	  Then "foobar" has marks "strong"

  Scenario: Toggling bold inside italic
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    When "bar" is marked with "strong"
    Then the text is "foo ,bar, baz"
    And "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"
    When "bar" is selected
    And "strong" is toggled using the keyboard
    Then the text is "foo bar baz"
    And "foo bar baz" has marks "em"

  Scenario: Toggling bold inside italic as you write
    Given an empty editor
    When "em" is toggled using the keyboard
    And "foo " is typed
    And "strong" is toggled using the keyboard
    And "bar" is typed
    And "strong" is toggled using the keyboard
    And " baz" is typed
    Then the text is "foo ,bar, baz"
    And "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"

  Scenario: Deleting marked text and writing again, unmarked
    Given the text "foo"
    And "strong" around "foo"
    Then "foo" has marks "strong"
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
    And "strong" is toggled using the keyboard
    Then the text is "f,oo,\n,,\n,ba,r"
    And "oo" has marks "strong"
    And "ba" has marks "strong"
    When "strong" is toggled using the keyboard
    Then the text is "foo,\n,,\n,bar"

  # Mimics Notion's behaviour
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

  # Mimics Google Docs' behaviour
  @skip
  Scenario: Splitting block before decorator
    Given the text "foo"
    And "strong" around "foo"
    When the caret is put before "foo"
    And "Enter" is pressed
    And "ArrowUp" is pressed
    And "bar" is typed
    Then the text is "bar,\n,foo"
    And "bar" has marks "strong"
    And "foo" has marks "strong"
