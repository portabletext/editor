Feature: Emoji Picker

  Background:
    Given the editor is focused

  Scenario: Picking a direct hit
    When ":joy:" is typed
    Then the text is "😂"

  Scenario: Two consecutive direct hits
    When ":joy:" is typed
    And ":joy_cat:" is typed
    Then the text is "😂😹"

  Scenario: Picking the closest hit with Enter
    When ":joy" is typed
    And "{Enter}" is pressed
    Then the text is "😂"

  Scenario: Picking the closest hit with Tab
    When ":joy" is typed
    And "{Tab}" is pressed
    Then the text is "😂"

  Scenario: Navigating down the list
    When ":joy" is typed
    And "{ArrowDown}" is pressed
    And "{Enter}" is pressed
    Then the text is "😹"

  Scenario: Aborting on Escape
    When ":joy" is typed
    And "{Escape}" is pressed
    And "{Enter}" is pressed
    Then the text is ":joy|"

  Scenario: Backspacing to narrow search
    When ":joy" is typed
    And "{Backspace}" is pressed
    And "{Enter}" is pressed
    Then the text is "😂"

  Scenario Outline: Inserting longer trigger text
    Given the text <text>
    When <inserted text> is inserted
    And <new text> is typed
    Then the text is <final text>

    Examples:
      | text | inserted text | new text | final text |
      | ""   | ":"           | "joy:"   | "😂"       |
      | ""   | ":j"          | "oy:"    | "😂"       |
      | ""   | ":joy"        | ":"      | "😂"       |
      | ""   | ":joy:"       | ":"      | "😂:"      |

  Scenario Outline: Matching inside decorator
    Given the text <text>
    And "strong" around <decorated>
    When the caret is put <position>
    And <keyword> is typed
    Then the text is <final text>

    Examples:
      | text          | decorated | position        | keyword | final text        |
      | "foo bar baz" | "bar"     | before "ar baz" | ":joy:" | "foo ,b😂ar, baz" |
      | "foo bar baz" | "bar"     | before "r baz"  | ":joy:" | "foo ,ba😂r, baz" |

  Scenario Outline: Matching at the edge of decorator
    Given the text <text>
    And "strong" around <decorated>
    When the caret is put <position>
    And <keyword> is typed
    Then the text is <final text>

    Examples:
      | text          | decorated | position     | keyword | final text        |
      | "foo bar baz" | "bar"     | after "foo " | ":joy:" | "foo 😂,bar, baz" |
      # | "foo bar baz" | "bar"     | before "bar"  | ":joy:" | "foo 😂,bar, baz" |
      | "foo bar baz" | "bar"     | after "bar"  | ":joy:" | "foo ,bar😂, baz" |

  # | "foo bar baz" | "bar"     | before " baz" | ":joy:" | "foo ,bar😂, baz" |
  Scenario Outline: Matching inside annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    When the caret is put <position>
    And <keyword> is typed
    Then the text is <final text>

    Examples:
      | text          | annotated | position        | keyword | final text        |
      | "foo bar baz" | "bar"     | before "ar baz" | ":joy:" | "foo ,b😂ar, baz" |
      | "foo bar baz" | "bar"     | before "r baz"  | ":joy:" | "foo ,ba😂r, baz" |

  Scenario Outline: Matching at the edge of an annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    When the caret is put <position>
    And <keyword> is typed
    Then the text is <final text>

    Examples:
      | text          | annotated | position      | keyword | final text        |
      | "foo bar baz" | "bar"     | after "foo "  | ":joy:" | "foo 😂,bar, baz" |
      # | "foo bar baz" | "bar"     | before "bar"  | ":joy:" | "foo 😂,bar, baz" |
      | "foo bar baz" | "bar"     | after "bar"   | ":joy:" | "foo ,bar,😂 baz" |
      | "foo bar baz" | "bar"     | before " baz" | ":joy:" | "foo ,bar,😂 baz" |

  Scenario Outline: Typing before the colon
    Given the text <text>
    When <keyword> is typed
    And <button> is pressed
    And <new text> is typed
    And "{Enter}" is pressed
    Then the text is <final text>

    Examples:
      | text | keyword | button                   | new text | final text |
      | ""   | ":j"    | "{ArrowLeft}{ArrowLeft}" | "f"      | "f\|:j"    |
      | "fo" | ":j"    | "{ArrowLeft}{ArrowLeft}" | "o"      | "foo\|:j"  |

  Scenario Outline: Navigating away from the keyword
    Given the text <text>
    When the caret is put <position>
    And <keyword> is typed
    And <button> is pressed
    And "{Enter}" is pressed
    Then the text is <final text>

    Examples:
      | text          | position    | keyword | button                              | final text        |
      | "foo bar baz" | after "foo" | ":j"    | "{ArrowRight}"                      | "foo:j \|bar baz" |
      | "foo bar baz" | after "foo" | ":j"    | "{ArrowLeft}{ArrowLeft}{ArrowLeft}" | "fo\|o:j bar baz" |
