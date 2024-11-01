Feature: Markdown Behaviors

  Background:
    Given one editor
    And markdown behaviors
    And a global keymap

  Scenario Outline: Automatic headings
    Given the text <text>
    When "Space" is pressed
    Then block "0" has style <new style>
    And the text is ""

    Examples:
      | text     | new style |
      | "#"      | "h1"      |
      | "##"     | "h2"      |
      | "###"    | "h3"      |
      | "####"   | "h4"      |
      | "#####"  | "h5"      |
      | "######" | "h6"      |

  Scenario Outline: Auto-deleting headings
    Given the text "foo"
    When <style> is toggled
    And "Backspace" is pressed 4 times
    # We have to type something to produce a value
    And "bar" is typed
    Then block "0" has style "normal"

    Examples:
      | style |
      | "h1"  |
      | "h2"  |
      | "h3"  |
      | "h4"  |
      | "h5"  |
      | "h6"  |
