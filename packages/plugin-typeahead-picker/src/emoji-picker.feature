Feature: Emoji Picker

  Scenario Outline: Picking a direct hit
    When the editor is focused
    And <initial text> is inserted
    And <inserted text> is inserted
    Then the editor state is <final state>

    Examples:
      | initial text | inserted text | final state |
      | ""           | ":joy:"       | "B: 😂\|"   |
      | ":jo"        | "y:"          | "B: 😂\|"   |
      | ":joy"       | ":"           | "B: 😂\|"   |

  Scenario: Picking direct hit with multiple exact matches
    When the editor is focused
    And ":dog" is typed
    Then the matches are "🐕,🐩"
    When ":" is typed
    Then the editor state is "B: 🐕|"

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
    Then the editor state is "B: foo:🐕|"
    And the keyword is ""

  Scenario: Toggling trigger, deleting it and toggling it again
    When the editor is focused
    And ":d" is typed
    And "{Backspace}{Backspace}" is pressed
    And ":d" is typed
    Then the editor state is "B: :d|"
    And the keyword is "d"
    And the matches are "🐕,🐩"

  Scenario Outline: Is only triggered when an initial colon is typed
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    And <inserted text> is inserted
    Then the editor state is <final state>
    And the keyword is <keyword>

    Examples:
      | state      | position     | inserted text | final state  | keyword |
      | "B: "      | after ""     | ":j"          | "B: :j\|"    | "j"     |
      | "B: :"     | after ":"    | "j"           | "B: :j\|"    | ""      |
      | "B: :j\|"  | after ":j"   | "o"           | "B: :jo\|"   | ""      |
      | "B: :jo\|" | after ":jo"  | ":"           | "B: :jo:\|"  | ""      |
      | "B: :joy"  | after ":joy" | ":"           | "B: :joy:\|" | ""      |

  Scenario: Undo after direct hit
    When the editor is focused
    And ":joy:" is typed
    Then the editor state is "B: 😂|"
    When undo is performed
    Then the editor state is "B: :joy:|"

  Scenario: Picking direct hit after undo
    When the editor is focused
    And ":joy:" is typed
    And undo is performed
    And "{Backspace}" is pressed
    And ":" is typed
    Then the editor state is "B: :joy:|"
    And the keyword is ""
    And the matches are ""

  Scenario: Picking wrong direct hit
    When the editor is focused
    And ":jo:" is typed
    Then the editor state is "B: :jo:|"
    And the keyword is "jo"
    And the matches are "😂,😹,🕹️"

  Scenario: Colon after wrong direct hit
    When the editor is focused
    And ":jo:" is typed
    And ":" is typed
    Then the editor state is "B: :jo::|"
    And the keyword is "jo:"
    And the matches are ""

  Scenario: Picking wrong direct hit after undoing direct hit
    When the editor is focused
    And ":joy:" is typed
    And undo is performed
    And "{Backspace}{Backspace}" is pressed
    And ":" is typed
    Then the editor state is "B: :jo:|"
    And the keyword is ""
    And the matches are ""

  Scenario: Two consecutive direct hits
    When the editor is focused
    And ":joy:" is typed
    And ":joy_cat:" is inserted
    Then the editor state is "B: 😂😹|"

  Scenario: Picking the closest hit with Enter
    When the editor is focused
    And ":joy" is typed
    And "{Enter}" is pressed
    Then the editor state is "B: 😂|"

  Scenario: Picking the closest hit with Tab
    When the editor is focused
    And ":joy" is typed
    And "{Tab}" is pressed
    Then the editor state is "B: 😂|"

  Scenario: Navigating down the list
    When the editor is focused
    And ":joy" is typed
    And "{ArrowDown}" is pressed
    And "{Enter}" is pressed
    Then the editor state is "B: 😹|"

  Scenario: Aborting on Escape
    When the editor is focused
    And ":joy" is typed
    And "{Escape}" is pressed
    And "{Enter}" is pressed
    Then the editor state is "B: :joy;;B: |"

  Scenario: Aborting and forwarding Enter if there is no keyword
    When the editor is focused
    And ":" is typed
    And "{Enter}" is pressed
    Then the editor state is "B: :;;B: |"

  Scenario: Aborting Enter if there are no matches
    When the editor is focused
    And ":asdf" is typed
    And "{Enter}" is pressed
    Then the editor state is "B: :asdf|"
    And the keyword is ""

  Scenario: Backspacing to narrow search
    When the editor is focused
    And ":joy" is typed
    And "{Backspace}" is pressed
    And "{Enter}" is pressed
    Then the editor state is "B: 😂|"

  Scenario Outline: Inserting longer trigger text
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And <new text> is typed
    Then the editor state is <final state>

    Examples:
      | state | inserted text | new text | final state |
      | "B: " | ":"           | "joy:"   | "B: 😂\|"   |
      | "B: " | ":j"          | "oy:"    | "B: 😂\|"   |
      | "B: " | ":joy"        | ":"      | "B: 😂\|"   |
      | "B: " | ":joy:"       | ":"      | "B: 😂:\|"  |

  Scenario Outline: Matching inside decorator
    Given the editor state is <state>
    And "strong" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And <keyword> is typed
    Then the editor state is <final state>

    Examples:
      | state            | decorated | position        | keyword | final state                   |
      | "B: foo bar baz" | "bar"     | before "ar baz" | ":joy:" | "B: foo [strong:b😂\|ar] baz" |
      | "B: foo bar baz" | "bar"     | before "r baz"  | ":joy:" | "B: foo [strong:ba😂\|r] baz" |

  Scenario Outline: Triggering at the edge of decorator
    Given the editor state is "B: foo bar baz"
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
    Given the editor state is "B: foo bar baz"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put <position>
    And ":joy:" is typed
    Then the editor state is <final state>

    Examples:
      | position      | final state                   |
      | after "foo "  | "B: foo 😂\|[strong:bar] baz" |
      | before "bar"  | "B: foo 😂[strong:\|bar] baz" |
      | after "bar"   | "B: foo [strong:bar😂\|] baz" |
      | before " baz" | "B: foo [strong:bar😂]\| baz" |

  Scenario Outline: Matching inside annotation
    Given the editor state is <state>
    And a "link" "l1" around <annotated>
    When the editor is focused
    And the caret is put <position>
    And <keyword> is typed
    Then the editor state is <final state>

    Examples:
      | state            | annotated | position        | keyword | final state                            |
      | "B: foo bar baz" | "bar"     | before "ar baz" | ":joy:" | "B: foo [@link _key=\"l1\":b😂ar] baz" |
      | "B: foo bar baz" | "bar"     | before "r baz"  | ":joy:" | "B: foo [@link _key=\"l1\":ba😂r] baz" |

  Scenario Outline: Triggering at the edge of an annotation
    Given the editor state is "B: foo bar baz"
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
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "bar"
    When the editor is focused
    And the caret is put <position>
    And ":joy:" is typed
    Then the editor state is <final state>

    Examples:
      | position      | final state                              |
      | after "foo "  | "B: foo 😂\|[@link _key=\"l1\":bar] baz" |
      | before "bar"  | "B: foo 😂[@link _key=\"l1\":\|bar] baz" |
      | after "bar"   | "B: foo [@link _key=\"l1\":bar]😂\| baz" |
      | before " baz" | "B: foo [@link _key=\"l1\":bar]😂\| baz" |

  Scenario Outline: Typing before the colon dismisses the emoji picker
    Given the editor state is <state>
    When <inserted text> is typed
    And <button> is pressed
    And <new text> is typed
    Then the keyword is ""

    Examples:
      | state   | inserted text | button                   | new text |
      | "B: "   | ":j"          | "{ArrowLeft}{ArrowLeft}" | "f"      |
      | "B: fo" | ":j"          | "{ArrowLeft}{ArrowLeft}" | "o"      |
      | "B: "   | ":j"          | "{ArrowLeft}{ArrowLeft}" | ":"      |

  Scenario Outline: Navigating away from the keyword
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    And <keyword> is typed
    And <button> is pressed
    And "{Enter}" is pressed
    Then the editor state is <final state>

    Examples:
      | state            | position    | keyword | button                              | final state               |
      | "B: foo bar baz" | after "foo" | ":j"    | "{ArrowRight}"                      | "B: foo:j ;;B: \|bar baz" |
      | "B: foo bar baz" | after "foo" | ":j"    | "{ArrowLeft}{ArrowLeft}{ArrowLeft}" | "B: fo;;B: \|o:j bar baz" |

  Scenario: Dismissing by pressing Space
    Given the editor state is "B: "
    When ":joy" is typed
    Then the keyword is "joy"
    When " " is typed
    Then the keyword is ""

  Scenario Outline: Allow special characters
    Given the editor state is <state>
    When <inserted text> is inserted
    Then the keyword is <keyword>
    And the matches are <matches>

    Examples:
      | state | inserted text | keyword | matches        |
      | "B: " | ":joy!"       | "joy!"  | "🕹️"          |
      | "B: " | ":*"          | "*"     | "😘"           |
      | "B: " | ":!"          | "!"     | "🕹️,❗️,⁉️,‼️" |
      | "B: " | ":!!"         | "!!"    | "‼️"           |
      | "B: " | "::)"         | ":)"    | "😊"           |
      | "B: " | "::"          | ":"     | "😊"           |

  Scenario: Narrowing keyword by deletion
    Given the editor state is "B: foo"
    When the editor is focused
    And the caret is put after "fo"
    And <inserted text> is inserted
    And "{ArrowLeft}" is pressed
    And "{Backspace}" is pressed
    Then the editor state is <final state>
    And the keyword is <keyword>

    Examples:
      | inserted text | final state   | keyword |
      | ":joy"        | "B: fo:j\|yo" | "jy"    |
      | ":j👻y"       | "B: fo:j\|yo" | "jy"    |

  Scenario: Inserting character to form exact match triggers auto-complete
    Given the editor state is "B: "
    When the editor is focused
    And ":og:" is typed
    Then the editor state is "B: :og:|"
    And the keyword is "og"
    When "{ArrowLeft}{ArrowLeft}{ArrowLeft}" is pressed
    And "d" is typed
    Then the editor state is "B: 🐕|"
    And the keyword is ""
    And the matches are ""

  Scenario: Triggering picker when complete pattern exists elsewhere in text
    Given the editor state is "B: foo"
    When the editor is focused
    And the caret is put after "foo"
    And ":xyz:" is typed
    Then the editor state is "B: foo:xyz:|"
    When " bar " is typed
    And ":j" is typed
    Then the editor state is "B: foo:xyz: bar :j"
    And the keyword is "j"
    And the matches are "😂,😹,🕹️"
