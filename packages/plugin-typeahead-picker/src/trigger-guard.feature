Feature: Trigger Guard

  Scenario Outline: Guarded emoji picker
    Given the guard returns <guard response>
    When the editor is focused
    And <text> is typed
    Then the keyword is <keyword>
    And the picker state is <state>

    Examples:
      | guard response | text | keyword | state             |
      | true           | ":"  | ""      | "showing matches" |
      | true           | ":j" | "j"     | "showing matches" |
      | true           | "j"  | ""      | "idle"            |
      | false          | ":"  | ""      | "idle"            |
      | false          | ":j" | ""      | "idle"            |
