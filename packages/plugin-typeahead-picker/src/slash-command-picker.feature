Feature: Slash Command Picker

  # Tests for start-of-block trigger constraint
  Scenario Outline: Triggering picker at start of block
    When the editor is focused
    And <text> is typed
    Then the keyword is <keyword>
    And the picker state is <state>

    Examples:
      | text    | keyword | state             |
      | "/"     | ""      | "showing matches" |
      | "/h"    | "h"     | "showing matches" |
      | "/head" | "head"  | "showing matches" |

  # Tests for NOT triggering mid-text
  Scenario Outline: Not triggering picker mid-text
    When the editor is focused
    And <text> is typed
    Then the picker state is "idle"

    Examples:
      | text      |
      | "abc /"   |
      | "abc /h"  |
      | "hello /" |

  Scenario: Slash at start shows all commands
    When the editor is focused
    And "/" is typed
    Then the picker state is "showing matches"
    And the matches are "Heading 1,Heading 2,Heading 3"

  Scenario: Filtering commands by keyword
    When the editor is focused
    And "/h" is typed
    Then the picker state is "showing matches"
    And the matches are "Heading 1,Heading 2,Heading 3"

  Scenario: No matches when keyword doesn't match
    When the editor is focused
    And "/xyz" is typed
    Then the picker state is "no matches"

  Scenario: Enter selects command
    When the editor is focused
    And "/h" is typed
    Then the picker state is "showing matches"
    When "{Enter}" is pressed
    Then the text is "h1:"
    And the picker state is "idle"

  Scenario: Arrow down then Enter selects correct command
    When the editor is focused
    And "/h" is typed
    Then the picker state is "showing matches"
    When "{ArrowDown}" is pressed
    Then the selected index is "1"
    When "{Enter}" is pressed
    Then the text is "h2:"
    And the picker state is "idle"

  Scenario: Dismissing with Escape
    When the editor is focused
    And "/head" is typed
    Then the picker state is "showing matches"
    When "{Escape}" is pressed
    Then the picker state is "idle"
    And the text is "/head"
