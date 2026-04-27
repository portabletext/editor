Feature: Multiplication Input Rule

  Scenario Outline: Inserting multiplication sign
    Given the editor state is <state>
    When <inserted text> is inserted
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state    |
      | "B: " | "1*2"         | "B: 1×2\|"   |
      | "B: " | "1*2*3"       | "B: 1×2×3\|" |

  Scenario Outline: Inserting multiplication sign and writing afterwards
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state       |
      | "B: " | "1*2"         | "B: 1×2new\|"   |
      | "B: " | "1*2*3"       | "B: 1×2×3new\|" |
