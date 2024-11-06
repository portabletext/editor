Feature: Markdown Behaviors

  Background:
    Given one editor
    And markdown behaviors
    And a global keymap

  Scenario Outline: Automatic headings
    Given the text <text>
    When "Space" is pressed
    Then block "0" has style <new style>
    And the text is <new text>

    Examples:
      | text      | new style | new text   |
      | "#"       | "h1"      | ""         |
      | "##"      | "h2"      | ""         |
      | "###"     | "h3"      | ""         |
      | "####"    | "h4"      | ""         |
      | "#####"   | "h5"      | ""         |
      | "######"  | "h6"      | ""         |
      | "#######" | "normal"  | "####### " |

  Scenario Outline: Automatic headings in non-empty block
    Given the text <text>
    When the caret is put <position>
    And "Space" is pressed
    Then block "0" has style <new style>
    And the text is <new text>

    Examples:
      | text         | position     | new style | new text      |
      | "foo"        | before "foo" | "normal"  | " foo"        |
      | "#foo"       | before "foo" | "h1"      | "foo"         |
      | "##foo"      | before "foo" | "h2"      | "foo"         |
      | "###foo"     | before "foo" | "h3"      | "foo"         |
      | "####foo"    | before "foo" | "h4"      | "foo"         |
      | "#####foo"   | before "foo" | "h5"      | "foo"         |
      | "######foo"  | before "foo" | "h6"      | "foo"         |
      | "#######foo" | before "foo" | "normal"  | "####### foo" |

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
