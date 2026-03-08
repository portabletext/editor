# Objects like images, charts or page breaks
Feature: Block Objects

Background:
  Given one editor
  And a global keymap

Scenario: Pressing ArrowUp on a lonely image
  Given the text "{IMAGE}"
  When the editor is focused
  And "{ArrowUp}" is pressed
  Then the text is "P:;;{IMAGE}"

Scenario: Pressing ArrowDown on a lonely image
  Given the text "{IMAGE}"
  When the editor is focused
  And "{ArrowDown}" is pressed
  Then the text is "{IMAGE};;P:"

Scenario: Pressing ArrowDown on image at the bottom
  When the editor is focused
  And "foo|{image}" is inserted at "auto" and selected at the "end"
  And "{ArrowDown}" is pressed
  Then the text is "P: foo;;{IMAGE};;P:"

Scenario: ArrowRight before an image selects it
  Given the text "P: foo;;{IMAGE}"
  When the editor is focused
  And the caret is put after "foo"
  And "{ArrowRight}" is pressed
  Then "{image}" is selected

Scenario: ArrowLeft after an image selects it
  Given the text "{IMAGE};;P: bar"
  When the editor is focused
  And the caret is put before "bar"
  And "{ArrowLeft}" is pressed
  Then "{image}" is selected

Scenario: Pressing Delete before an image
  Given the text "P: foo;;{IMAGE};;P: bar"
  When the editor is focused
  And the caret is put after "foo"
  And "{Delete}" is pressed
  Then the text is "P: foo;;P: bar"

Scenario: Pressing Delete in an empty paragraph before an image
  Given the text "P: foo;;{IMAGE};;P: bar"
  When the editor is focused
  And the caret is put before "foo"
  And "{Delete}" is pressed 4 times
  And "{Enter}" is pressed
  Then the text is "{IMAGE};;P:;;P: bar"

Scenario: Pressing Backspace after an image
  Given the text "P: foo;;{IMAGE};;P: bar"
  When the editor is focused
  And the caret is put before "bar"
  And "{Backspace}" is pressed
  Then the text is "P: foo;;P: bar"

Scenario: Pressing Backspace in an empty paragraph after an image
  When the editor is focused
  And "foo|{image}" is inserted at "auto" and selected at the "end"
  And "{Enter}" is pressed
  And "{Backspace}" is pressed
  Then the text is "P: foo;;{IMAGE}"
  And "{image}" is selected

Scenario Outline: Deleting a lonely image
  Given the text "{IMAGE}"
  When the editor is focused
  And <button> is pressed
  And "foo" is typed
  Then the text is "P: foo"

  Examples:
    | button        |
    | "{Backspace}" |
    | "{Delete}"    |

Scenario Outline: Deleting an image with text above
  Given the text "P: foo;;{IMAGE};;P: b"
  When the editor is focused
  And the caret is put after "b"
  And "{Backspace}" is pressed 2 times
  And <button> is pressed
  And "bar" is typed
  Then the text is "P: foobar"

  Examples:
    | button        |
    | "{Backspace}" |
    | "{Delete}"    |

Scenario Outline: Deleting an image with text below
  Given the text "P: b;;{IMAGE};;P: foo"
  When the editor is focused
  And the caret is put before "b"
  And "{Delete}" is pressed 2 times
  And <button> is pressed
  And "bar" is typed
  Then the text is "P: barfoo"

  Examples:
    | button        |
    | "{Backspace}" |
    | "{Delete}"    |