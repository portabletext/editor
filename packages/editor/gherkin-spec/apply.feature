Feature: Apply
  Another writer's change arrives through `editor.send({type: 'apply'})`.
  The editor applies it as one remote step and keeps its undo history.

  Scenario: The caret stays put when a collaborator changes text elsewhere
    Given the editor state is "B: foo;;B: bar"
    When the editor is focused
    And the caret is put after "bar"
    And a collaborator changes "foo" to "fool"
    Then the editor state is "B: fool;;B: bar|"

  Scenario Outline: Undo after a collaborator's change in another span of the same block keeps their text
    Given the editor state is <before>
    When the editor is focused
    And the caret is put after "foo "
    And "x" is typed
    And a collaborator changes "bar" to "bat"
    And undo is performed
    Then the editor state is <after>

    Examples:
      | depth          | position | before                                                                             | after                                                        |
      | root           | first    | "B: foo [strong:bar];;B: one;;B: two"                                              | "B: foo \|[strong:bat];;B: one;;B: two"                      |
      | root           | middle   | "B: one;;B: foo [strong:bar];;B: two"                                              | "B: one;;B: foo \|[strong:bat];;B: two"                      |
      | root           | last     | "B: one;;B: two;;B: foo [strong:bar]"                                              | "B: one;;B: two;;B: foo \|[strong:bat]"                      |
      | callout        | first    | "CALLOUT:;;  B: foo [strong:bar];;  B: one;;  B: two"                              | "CALLOUT:{B: foo \|[strong:bat];;B: one;;B: two}"            |
      | callout        | middle   | "CALLOUT:;;  B: one;;  B: foo [strong:bar];;  B: two"                              | "CALLOUT:{B: one;;B: foo \|[strong:bat];;B: two}"            |
      | callout        | last     | "CALLOUT:;;  B: one;;  B: two;;  B: foo [strong:bar]"                              | "CALLOUT:{B: one;;B: two;;B: foo \|[strong:bat]}"            |
      | nested callout | first    | "CALLOUT:;;  CALLOUT:;;    B: foo [strong:bar];;    B: one;;    B: two"            | "CALLOUT:{CALLOUT:{B: foo \|[strong:bat];;B: one;;B: two}}"  |
      | nested callout | middle   | "CALLOUT:;;  CALLOUT:;;    B: one;;    B: foo [strong:bar];;    B: two"            | "CALLOUT:{CALLOUT:{B: one;;B: foo \|[strong:bat];;B: two}}"  |
      | nested callout | last     | "CALLOUT:;;  CALLOUT:;;    B: one;;    B: two;;    B: foo [strong:bar]"            | "CALLOUT:{CALLOUT:{B: one;;B: two;;B: foo \|[strong:bat]}}"  |
      | table cell     | first    | "TABLE:;;  ROW:;;    CELL:;;      B: foo [strong:bar];;      B: one;;      B: two" | "TABLE:{ROW:{CELL:{B: foo \|[strong:bat];;B: one;;B: two}}}" |
      | table cell     | middle   | "TABLE:;;  ROW:;;    CELL:;;      B: one;;      B: foo [strong:bar];;      B: two" | "TABLE:{ROW:{CELL:{B: one;;B: foo \|[strong:bat];;B: two}}}" |
      | table cell     | last     | "TABLE:;;  ROW:;;    CELL:;;      B: one;;      B: two;;      B: foo [strong:bar]" | "TABLE:{ROW:{CELL:{B: one;;B: two;;B: foo \|[strong:bat]}}}" |

  Scenario Outline: Undo after a collaborator's patch that carries origin local keeps their text
    Given the editor state is <before>
    When the editor is focused
    And the caret is put after "foo "
    And "x" is typed
    And a collaborator's patch marked local changes "bar" to "bat"
    And undo is performed
    Then the editor state is <after>

    Examples:
      | depth          | position | before                                                                             | after                                                        |
      | root           | first    | "B: foo [strong:bar];;B: one;;B: two"                                              | "B: foo \|[strong:bat];;B: one;;B: two"                      |
      | callout        | first    | "CALLOUT:;;  B: foo [strong:bar];;  B: one;;  B: two"                              | "CALLOUT:{B: foo \|[strong:bat];;B: one;;B: two}"            |
      | nested callout | first    | "CALLOUT:;;  CALLOUT:;;    B: foo [strong:bar];;    B: one;;    B: two"            | "CALLOUT:{CALLOUT:{B: foo \|[strong:bat];;B: one;;B: two}}"  |
      | table cell     | first    | "TABLE:;;  ROW:;;    CELL:;;      B: foo [strong:bar];;      B: one;;      B: two" | "TABLE:{ROW:{CELL:{B: foo \|[strong:bat];;B: one;;B: two}}}" |
