Feature: Insert Blocks

  Background:
    Given one editor

  Scenario Outline: Inserting block objects an empty editor
    When "[image]" is inserted at <placement>
    Then the text is <text>

    Examples:
      | placement | text        |
      | "before"  | "[image]\|" |
      | "after"   | "\|[image]" |
      | "auto"    | "[image]"   |

  Scenario Outline: Inserting blocks on a block object
    When "[image]" is inserted at "auto" and selected at the "end"
    And "foo|[break]|bar" is inserted at "auto"
    Then the text is <text>

    Examples:
      | text                         |
      | "[image]\|foo\|[break]\|bar" |

  Scenario: Inserting text blocks on a block object
    When "[image]" is inserted at "auto" and selected at the "end"
    And "foo|bar" is inserted at "auto"
    Then the text is <text>

    Examples:
      | text                |
      | "[image]\|foo\|bar" |

  Scenario Outline: Inserting blocks on a text block
    Given the text "foo"
    When the caret is put <position>
    And "bar|[image]|baz" is inserted at <placement>
    Then the text is <text>

    Examples:
      | position     | placement | text                     |
      | before "foo" | "before"  | "bar\|[image]\|baz\|foo" |
      | before "foo" | "after"   | "foo\|bar\|[image]\|baz" |
      | before "foo" | "auto"    | "bar\|[image]\|bazfoo"   |
      | after "f"    | "before"  | "bar\|[image]\|baz\|foo" |
      | after "f"    | "after"   | "foo\|bar\|[image]\|baz" |
      | after "f"    | "auto"    | "fbar\|[image]\|bazoo"   |
      | after "foo"  | "before"  | "bar\|[image]\|baz\|foo" |
      | after "foo"  | "after"   | "foo\|bar\|[image]\|baz" |
      | after "foo"  | "auto"    | "foobar\|[image]\|baz"   |

  Scenario: Pasting text blocks between two text blocks
    Given the text "foo"
    When "{Enter}" is pressed
    And "bar" is typed
    And the caret is put after "foo"
    And "fizz|buzz" is inserted at "auto"
    Then the text is "foofizz|buzz|bar"

  Scenario: Inserting indented numbered list in empty text block
    Given the text ""
    When ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the text is ">#:foo|>>#:bar|>>>#:baz"
