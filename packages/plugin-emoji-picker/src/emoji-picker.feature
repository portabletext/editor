Feature: Emoji Picker

  Background:
    Given the editor is focused

  Scenario Outline: Picking a direct hit
    When <initial text> is inserted
    When <inserted text> is inserted
    Then the text is <final text>

    Examples:
      | initial text | inserted text | final text |
      | ""           | ":joy:"       | "😂"       |
      | ":jo"        | "y:"          | "😂"       |
      | ":joy"       | ":"           | "😂"       |

  Scenario Outline: Is only triggered when an initial colon is typed
    Given the text <text>
    When the caret is put <position>
    And <inserted text> is inserted
    Then the text is <final text>
    And the keyword is <keyword>

    Examples:
      | text   | position     | inserted text | final text | keyword |
      | ""     | after ""     | ":j"          | ":j"       | "j"     |
      | ":"    | after ":"    | "j"           | ":j"       | ""      |
      | ":j"   | after ":j"   | "o"           | ":jo"      | ""      |
      | ":jo"  | after ":jo"  | ":"           | ":jo:"     | ""      |
      | ":joy" | after ":joy" | ":"           | ":joy:"    | ""      |

  Scenario: Undo after direct hit
    When ":joy:" is typed
    Then the text is "😂"
    When undo is performed
    Then the text is ":joy:"

  Scenario: Picking direct hit after undo
    When ":joy:" is typed
    And undo is performed
    And "{Backspace}" is pressed
    And ":" is typed
    Then the text is ":joy:"
    And the keyword is ""
    And the matches are ""

  Scenario: Picking wrong direct hit
    When ":jo:" is typed
    Then the text is ":jo:"
    And the keyword is "jo"
    And the matches are "😂,😹,🕹️"

  Scenario: Colon after wrong direct hit
    When ":jo:" is typed
    And ":" is typed
    Then the text is ":jo::"
    And the keyword is "jo:"
    And the matches are ""

  Scenario: Picking wrong direct hit after undoing direct hit
    When ":joy:" is typed
    And undo is performed
    And "{Backspace}{Backspace}" is pressed
    And ":" is typed
    Then the text is ":jo:"
    And the keyword is ""
    And the matches are ""

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
    And <inserted text> is inserted
    Then the keyword is <keyword>

    Examples:
      | text          | annotated | position     | inserted text | keyword |
      | "foo bar baz" | "bar"     | after "foo " | ":j"          | "j"     |
      # | "foo bar baz" | "bar"     | before "bar"  | ":j" | "j" |
      | "foo bar baz" | "bar"     | after "bar"  | ":j"          | "j"     |

  # | "foo bar baz" | "bar"     | before " baz" | ":j" | "j" |
  Scenario Outline: Typing before the colon
    Given the text <text>
    When <inserted text> is typed
    And <button> is pressed
    And <new text> is typed
    And "{Enter}" is pressed
    Then the text is <final text>

    Examples:
      | text | inserted text | button                   | new text | final text |
      | ""   | ":j"          | "{ArrowLeft}{ArrowLeft}" | "f"      | "f\|:j"    |
      | "fo" | ":j"          | "{ArrowLeft}{ArrowLeft}" | "o"      | "foo\|:j"  |

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

  Scenario: Dismissing by pressing Space
    Given the text ""
    When ":joy" is typed
    Then the keyword is "joy"
    When " " is typed
    Then the keyword is ""

  Scenario Outline: Allow special characters
    Given the text <text>
    When <inserted text> is inserted
    Then the keyword is <keyword>
    And the matches are <matches>

    Examples:
      | text | inserted text | keyword | matches        |
      | ""   | ":joy!"       | "joy!"  | "🕹️"          |
      | ""   | ":*"          | "*"     | "😘"           |
      | ""   | ":!"          | "!"     | "🕹️,❗️,⁉️,‼️" |
      | ""   | ":!!"         | "!!"    | "‼️"           |
      | ""   | "::)"         | ":)"    | "😊"           |
      | ""   | "::"          | ":"     | "😊"           |

  Scenario: Narrowing keyword by deletion
    Given the text "foo"
    When the caret is put after "fo"
    And <inserted text> is inserted
    And "{ArrowLeft}" is pressed
    And "{Backspace}" is pressed
    Then the text is <final text>
    And the keyword is <keyword>

    Examples:
      | inserted text | final text | keyword |
      | ":joy"        | "fo:jyo"   | "jy"    |
      | ":j👻y"       | "fo:jyo"   | "jy"    |
