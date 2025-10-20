Feature: Stock Ticker Rule

  Background:
    Given the editor is focused
    And a global keymap

  Scenario Outline: Transforms plain text into stock ticker
    Given the text <text>
    When <inserted text> is inserted
    And "{ArrowRight}" is pressed
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text | inserted text | new text              |
      | ""   | "{AAPL}"      | ",{stock-ticker},new" |

  Scenario Outline: Smart undo with Backspace
    Given the text <text>
    When <inserted text> is inserted
    Then the text is <before undo>
    When "{Backspace}" is pressed
    Then the text is <after undo>

    Examples:
      | text | inserted text | before undo        | after undo |
      | ""   | "{APPL}"      | ",{stock-ticker}," | "{APPL}"   |
