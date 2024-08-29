Feature: Splitting Blocks
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
