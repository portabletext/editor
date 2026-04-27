Feature: Stock Ticker Rule

  Scenario Outline: Transforms plain text into stock ticker
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "{ArrowRight}" is pressed
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state                |
      | "B: " | "{AAPL}"      | "B: {stock-ticker}new\|" |

  Scenario Outline: Smart undo with Backspace
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    Then the editor state is <before undo>
    When "{Backspace}" is pressed
    Then the editor state is <after undo>

    Examples:
      | state | inserted text | before undo           | after undo    |
      | "B: " | "{APPL}"      | "B: \|{stock-ticker}" | "B: \{APPL\}" |
