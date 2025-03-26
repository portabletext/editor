Feature: Paste

  Background:
    Given one editor

  Scenario Outline: Copying text block and pasting it on itself
    Given the text "foo bar buz"
    And "strong" around "bar"
    When "foo bar buz" is selected
    And copy is performed
    And <selection>
    And paste is performed
    Then the text is <text>

    Examples:
      | selection                     | text                           |
      | the caret is put after "buz"  | "foo ,bar, buzfoo ,bar, buz"   |
      | the caret is put before "foo" | "foo ,bar, buzfoo ,bar, buz"   |
      | the caret is put after "ba"   | "foo ,ba,foo ,bar, buz,r, buz" |
      | "foo bar buz" is selected     | "foo ,bar, buz"                |
