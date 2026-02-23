Feature: Emoji Picker

  Scenario Outline: Picking a direct hit
    When the editor is focused
    And <initial text> is inserted
    And <inserted text> is inserted
    Then the text is <final text>

    Examples:
      | initial text | inserted text | final text |
      | ""           | ":joy:"       | "😂"       |
      | ":jo"        | "y:"          | "😂"       |
      | ":joy"       | ":"           | "😂"       |

  Scenario: Picking direct hit with multiple exact matches
    When the editor is focused
    And ":dog" is typed
    Then the matches are "🐕,🐩"
    When ":" is typed
    Then the text is "🐕"

  Scenario: Triggering after a trigger character
    When the editor is focused
    And ":" is typed
    And "{ArrowLeft}" is pressed
    And "foo" is typed
    And "{ArrowRight}" is pressed
    And ":dog" is typed
    Then the keyword is "dog"
    And the matches are "🐕,🐩"

  Scenario: Complete match after trigger character
    When the editor is focused
    And ":" is typed
    And "{ArrowLeft}" is pressed
    And "foo" is typed
    And "{ArrowRight}" is pressed
    And ":dog:" is inserted
    Then the text is "foo:🐕"
    And the keyword is ""

  Scenario: Toggling trigger, deleting it and toggling it again
    When the editor is focused
    And ":d" is typed
    And "{Backspace}{Backspace}" is pressed
    And ":d" is typed
    Then the text is ":d"
    And the keyword is "d"
    And the matches are "🐕,🐩"

  Scenario Outline: Is only triggered when an initial colon is typed
    Given the text <text>
    When the editor is focused
    And the caret is put <position>
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
    When the editor is focused
    And ":joy:" is typed
    Then the text is "😂"
    When undo is performed
    Then the text is ":joy:"

  Scenario: Picking direct hit after undo
    When the editor is focused
    And ":joy:" is typed
    And undo is performed
    And "{Backspace}" is pressed
    And ":" is typed
    Then the text is ":joy:"
    And the keyword is ""
    And the matches are ""

  Scenario: Picking wrong direct hit
    When the editor is focused
    And ":jo:" is typed
    Then the text is ":jo:"
    And the keyword is "jo"
    And the matches are "😂,😹,🕹️"

  Scenario: Colon after wrong direct hit
    When the editor is focused
    And ":jo:" is typed
    And ":" is typed
    Then the text is ":jo::"
    And the keyword is "jo:"
    And the matches are ""

  Scenario: Picking wrong direct hit after undoing direct hit
    When the editor is focused
    And ":joy:" is typed
    And undo is performed
    And "{Backspace}{Backspace}" is pressed
    And ":" is typed
    Then the text is ":jo:"
    And the keyword is ""
    And the matches are ""

  Scenario: Two consecutive direct hits
    When the editor is focused
    And ":joy:" is typed
    And ":joy_cat:" is inserted
    Then the text is "😂😹"

  Scenario: Picking the closest hit with Enter
    When the editor is focused
    And ":joy" is typed
    And "{Enter}" is pressed
    Then the text is "😂"

  Scenario: Picking the closest hit with Tab
    When the editor is focused
    And ":joy" is typed
    And "{Tab}" is pressed
    Then the text is "😂"

  Scenario: Navigating down the list
    When the editor is focused
    And ":joy" is typed
    And "{ArrowDown}" is pressed
    And "{Enter}" is pressed
    Then the text is "😹"

  Scenario: Aborting on Escape
    When the editor is focused
    And ":joy" is typed
    And "{Escape}" is pressed
    And "{Enter}" is pressed
    Then the text is ":joy|"

  Scenario: Aborting and forwarding Enter if there is no keyword
    When the editor is focused
    And ":" is typed
    And "{Enter}" is pressed
    Then the text is ":|"

  Scenario: Aborting Enter if there are no matches
    When the editor is focused
    And ":asdf" is typed
    And "{Enter}" is pressed
    Then the text is ":asdf"
    And the keyword is ""

  Scenario: Backspacing to narrow search
    When the editor is focused
    And ":joy" is typed
    And "{Backspace}" is pressed
    And "{Enter}" is pressed
    Then the text is "😂"

  Scenario Outline: Inserting longer trigger text
    Given the text <text>
    When the editor is focused
    And <inserted text> is inserted
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
    When the editor is focused
    And the caret is put <position>
    And <keyword> is typed
    Then the text is <final text>

    Examples:
      | text          | decorated | position        | keyword | final text        |
      | "foo bar baz" | "bar"     | before "ar baz" | ":joy:" | "foo ,b😂ar, baz" |
      | "foo bar baz" | "bar"     | before "r baz"  | ":joy:" | "foo ,ba😂r, baz" |

  Scenario Outline: Triggering at the edge of decorator
    Given the text "foo bar baz"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put <position>
    And ":j" is typed
    Then the keyword is "j"

    Examples:
      | position      |
      | after "foo "  |
      | before "bar"  |
      | after "bar"   |
      | before " baz" |

  Scenario Outline: Matching at the edge of decorator
    Given the text "foo bar baz"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put <position>
    And ":joy:" is typed
    Then the text is <final text>

    Examples:
      | position      | final text        |
      | after "foo "  | "foo 😂,bar, baz" |
      | before "bar"  | "foo 😂,bar, baz" |
      | after "bar"   | "foo ,bar😂, baz" |
      | before " baz" | "foo ,bar😂, baz" |

  Scenario Outline: Matching inside annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    When the editor is focused
    And the caret is put <position>
    And <keyword> is typed
    Then the text is <final text>

    Examples:
      | text          | annotated | position        | keyword | final text        |
      | "foo bar baz" | "bar"     | before "ar baz" | ":joy:" | "foo ,b😂ar, baz" |
      | "foo bar baz" | "bar"     | before "r baz"  | ":joy:" | "foo ,ba😂r, baz" |

  Scenario Outline: Triggering at the edge of an annotation
    Given the text "foo bar baz"
    And a "link" "l1" around "bar"
    When the editor is focused
    And the caret is put <position>
    And ":j" is typed
    Then the keyword is "j"

    Examples:
      | position      |
      | after "foo "  |
      | before "bar"  |
      | after "bar"   |
      | before " baz" |

  Scenario Outline: Matching at the edge of an annotation
    Given the text "foo bar baz"
    And a "link" "l1" around "bar"
    When the editor is focused
    And the caret is put <position>
    And ":joy:" is typed
    Then the text is <final text>

    Examples:
      | position      | final text        |
      | after "foo "  | "foo 😂,bar, baz" |
      | before "bar"  | "foo 😂,bar, baz" |
      | after "bar"   | "foo ,bar,😂 baz" |
      | before " baz" | "foo ,bar,😂 baz" |

  Scenario Outline: Typing before the colon dismisses the emoji picker
    Given the text <text>
    When <inserted text> is typed
    And <button> is pressed
    And <new text> is typed
    Then the keyword is ""

    Examples:
      | text | inserted text | button                   | new text |
      | ""   | ":j"          | "{ArrowLeft}{ArrowLeft}" | "f"      |
      | "fo" | ":j"          | "{ArrowLeft}{ArrowLeft}" | "o"      |
      | ""   | ":j"          | "{ArrowLeft}{ArrowLeft}" | ":"      |

  Scenario Outline: Navigating away from the keyword
    Given the text <text>
    When the editor is focused
    And the caret is put <position>
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
    When the editor is focused
    And the caret is put after "fo"
    And <inserted text> is inserted
    And "{ArrowLeft}" is pressed
    And "{Backspace}" is pressed
    Then the text is <final text>
    And the keyword is <keyword>

    Examples:
      | inserted text | final text | keyword |
      | ":joy"        | "fo:jyo"   | "jy"    |
      | ":j👻y"       | "fo:jyo"   | "jy"    |

  Scenario: Inserting character to form exact match triggers auto-complete
    Given the text ""
    When the editor is focused
    And ":og:" is typed
    Then the text is ":og:"
    And the keyword is "og"
    When "{ArrowLeft}{ArrowLeft}{ArrowLeft}" is pressed
    And "d" is typed
    Then the text is "🐕"
    And the keyword is ""
    And the matches are ""

  Scenario: Triggering picker when complete pattern exists elsewhere in text
    Given the text "foo"
    When the editor is focused
    And the caret is put after "foo"
    And ":xyz:" is typed
    Then the text is "foo:xyz:"
    When " bar " is typed
    And ":j" is typed
    Then the text is "foo:xyz: bar :j"
    And the keyword is "j"
    And the matches are "😂,😹,🕹️"
