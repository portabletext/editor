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
