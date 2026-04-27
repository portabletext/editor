Feature: Markdown Behaviors

  Background:
    Given a global keymap

  Scenario: Automatic blockquote
    Given the editor state is "B: >"
    When the editor is focused
    And "{Space}" is pressed
    Then the editor state is "B style=\"blockquote\": "

  Scenario: Automatic blockquote not toggled by space in the beginning
    Given the editor state is "B: >"
    When the editor is focused
    And the caret is put before ">"
    When "{Space}" is pressed
    Then the editor state is "B:  |>"

  Scenario: Automatic blockquote in non-empty block
    Given the editor state is "B: >foo"
    When the editor is focused
    And the caret is put before "f"
    And "{Space}" is pressed
    Then the editor state is "B style=\"blockquote\": foo"

  Scenario Outline: Automatic headings
    Given the editor state is <state>
    When the editor is focused
    And "{Space}" is pressed
    Then the editor state is <new state>

    Examples:
      | state        | new state          |
      | "B: #"       | "B style=\"h1\": " |
      | "B: ##"      | "B style=\"h2\": " |
      | "B: ###"     | "B style=\"h3\": " |
      | "B: ####"    | "B style=\"h4\": " |
      | "B: #####"   | "B style=\"h5\": " |
      | "B: ######"  | "B style=\"h6\": " |
      | "B: #######" | "B: ####### \|"    |

  Scenario Outline: Automatic headings not toggled by space in the beginning
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    When "{Space}" is pressed
    Then the editor state is <new state>

    Examples:
      | state    | position     | new state   |
      | "B: #"   | before "#"   | "B:  \|#"   |
      | "B: ##"  | before "##"  | "B:  \|##"  |
      | "B: ###" | before "###" | "B:  \|###" |

  Scenario Outline: Automatic headings toggled by space mid-heading
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    When "{ArrowRight}" is pressed
    When "{Space}" is pressed
    Then the editor state is <new state>

    Examples:
      | state    | position     | new state            |
      | "B: ##"  | before "##"  | "B style=\"h1\": #"  |
      | "B: ###" | before "###" | "B style=\"h1\": ##" |

  Scenario Outline: Automatic headings in non-empty block
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    And "{Space}" is pressed
    Then the editor state is <new state>

    Examples:
      | state           | position     | new state             |
      | "B: foo"        | before "foo" | "B:  \|foo"           |
      | "B: #foo"       | before "foo" | "B style=\"h1\": foo" |
      | "B: ##foo"      | before "foo" | "B style=\"h2\": foo" |
      | "B: ###foo"     | before "foo" | "B style=\"h3\": foo" |
      | "B: ####foo"    | before "foo" | "B style=\"h4\": foo" |
      | "B: #####foo"   | before "foo" | "B style=\"h5\": foo" |
      | "B: ######foo"  | before "foo" | "B style=\"h6\": foo" |
      | "B: #######foo" | before "foo" | "B: ####### \|foo"    |

  Scenario Outline: Clear style on Backspace
    Given the editor state is "B: foo"
    When the editor is focused
    And <style> is toggled
    And "{Backspace}" is pressed 4 times
    Then the editor state is "B: |"

    Examples:
      | style |
      | "h1"  |
      | "h2"  |
      | "h3"  |
      | "h4"  |
      | "h5"  |
      | "h6"  |

  Scenario: Unordered list clear-on-enter works on second cycle
    Given the editor state is "B: -"
    When the editor is focused
    And "{Space}" is pressed
    Then the editor state is "B listItem=\"bullet\": "
    When "{Enter}" is pressed
    Then the editor state is "B: |"
    When "-" is typed
    And "{Space}" is pressed
    Then the editor state is "B listItem=\"bullet\": "
    When "{Enter}" is pressed
    Then the editor state is "B: |"

  Scenario Outline: Clear style on Backspace in empty block
    Given the editor state is "B: foo"
    When the editor is focused
    And <style> is toggled
    And "{Backspace}" is pressed 4 times
    And "bar" is typed
    Then the editor state is "B: bar|"

    Examples:
      | style |
      | "h1"  |
      | "h2"  |
      | "h3"  |
      | "h4"  |
      | "h5"  |
      | "h6"  |
