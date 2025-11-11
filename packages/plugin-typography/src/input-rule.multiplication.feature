Feature: Multiplication Input Rule

  Scenario Outline: Inserting multiplication sign
    Given the text <text>
    When <inserted text> is inserted
    Then the text is <new text>

    Examples:
      | text | inserted text | new text |
      | ""   | "1*2"         | "1×2"    |
      | ""   | "1*2*3"       | "1×2×3"  |

  Scenario Outline: Inserting multiplication sign and writing afterwards
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text | inserted text | new text   |
      | ""   | "1*2"         | "1×2new"   |
      | ""   | "1*2*3"       | "1×2×3new" |
