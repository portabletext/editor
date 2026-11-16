Feature: Non-object entries
  Non-object entries are removed from node arrays without changing valid
  neighbors.
  The host applies every emitted patch to its copy of the collaborator’s value.

  Scenario Outline: insert removes <entry> at <depth>
    Given the editor state is <before>
    When a collaborator inserts <entry> after the <anchor>
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth                | entry | before                                                                     | after                                                                   | anchor                   |
      | root                 | null  | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: bar;;B: baz"                                                | block "foo"              |
      | root                 | "bar" | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: bar;;B: baz"                                                | block "foo"              |
      | text children        | null  | "B: foo[strong:bar][em:baz]"                                               | "B: foo[strong:bar][em:baz]"                                            | span "foo"               |
      | text children        | "bar" | "B: foo[strong:bar][em:baz]"                                               | "B: foo[strong:bar][em:baz]"                                            | span "foo"               |
      | markDefs             | null  | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]"    | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]" | link "foo"               |
      | markDefs             | "bar" | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]"    | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]" | link "foo"               |
      | callout              | null  | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: bar;;B: baz}"                                      | block "foo"              |
      | callout              | "bar" | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: bar;;B: baz}"                                      | block "foo"              |
      | callout in callout   | null  | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: bar;;B: baz}}"                            | block "foo"              |
      | callout in callout   | "bar" | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: bar;;B: baz}}"                            | block "foo"              |
      | table cell           | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: bar;;B: baz}}}"                           | block "foo"              |
      | table cell           | "bar" | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: bar;;B: baz}}}"                           | block "foo"              |
      | root                 | 5     | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: bar;;B: baz"                                                | block "foo"              |
      | root                 | false | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: bar;;B: baz"                                                | block "foo"              |
      | root                 | []    | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: bar;;B: baz"                                                | block "foo"              |
      | table rows           | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;  ROW:;;    CELL:;;      B: foo" | "TABLE:{ROW:{CELL:{B: foo}};;ROW:{CELL:{B: foo}}}"                      | first row holding "foo"  |
      | table cells          | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;    CELL:;;      B: foo"         | "TABLE:{ROW:{CELL:{B: foo};;CELL:{B: foo}}}"                            | first cell holding "foo" |
      | block object field   | null  | "NOTE:;;  B: foo;;  B: bar"                                                | "NOTE:{B: foo;;B: bar}"                                                 | block "foo"              |
      | nested text children | null  | "CALLOUT:;;  B: foo[em:bar]"                                               | "CALLOUT:{B: foo[em:bar]}"                                              | span "foo"               |
      | nested markDefs      | null  | "CALLOUT:;;  B: [@link href=\"foo\":[@link href=\"bar\":foo]]"             | "CALLOUT:{B: [@link href=\"foo\":[@link href=\"bar\":foo]]}"            | link "foo"               |
      | text children        | 5     | "B: foo[strong:bar][em:baz]"                                               | "B: foo[strong:bar][em:baz]"                                            | span "foo"               |
      | text children        | false | "B: foo[strong:bar][em:baz]"                                               | "B: foo[strong:bar][em:baz]"                                            | span "foo"               |
      | text children        | []    | "B: foo[strong:bar][em:baz]"                                               | "B: foo[strong:bar][em:baz]"                                            | span "foo"               |
      | markDefs             | 5     | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]"    | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]" | link "foo"               |
      | markDefs             | false | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]"    | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]" | link "foo"               |
      | markDefs             | []    | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]"    | "B: [@link href=\"foo\":[@link href=\"bar\":[@link href=\"baz\":foo]]]" | link "foo"               |
      | callout              | 5     | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: bar;;B: baz}"                                      | block "foo"              |
      | callout              | false | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: bar;;B: baz}"                                      | block "foo"              |
      | callout              | []    | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: bar;;B: baz}"                                      | block "foo"              |
      | callout in callout   | 5     | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: bar;;B: baz}}"                            | block "foo"              |
      | callout in callout   | false | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: bar;;B: baz}}"                            | block "foo"              |
      | callout in callout   | []    | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: bar;;B: baz}}"                            | block "foo"              |
      | table cell           | 5     | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: bar;;B: baz}}}"                           | block "foo"              |
      | table cell           | false | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: bar;;B: baz}}}"                           | block "foo"              |
      | table cell           | []    | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: bar;;B: baz}}}"                           | block "foo"              |

  Scenario Outline: root set removes <entry> at <depth>
    Given the editor state is <before>
    When a collaborator sets the value to <sent> with <entry> after the <anchor>
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth                | entry | before                                                                     | after                                                        | anchor                   | sent                                                                       |
      | root                 | null  | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: baz"                                             | block "foo"              | "B: foo;;B: baz"                                                           |
      | root                 | "bar" | "B: foo;;B: bar;;B: baz"                                                   | "B: foo;;B: baz"                                             | block "foo"              | "B: foo;;B: baz"                                                           |
      | text children        | null  | "B: foo[strong:bar][em:baz]"                                               | "B: foo[em:baz]"                                             | span "foo"               | "B: foo[em:baz]"                                                           |
      | text children        | "bar" | "B: foo[strong:bar][em:baz]"                                               | "B: foo[em:baz]"                                             | span "foo"               | "B: foo[em:baz]"                                                           |
      | callout              | null  | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: baz}"                                   | block "foo"              | "CALLOUT:;;  B: foo;;  B: baz"                                             |
      | callout              | "bar" | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: baz}"                                   | block "foo"              | "CALLOUT:;;  B: foo;;  B: baz"                                             |
      | callout in callout   | null  | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"                         | block "foo"              | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: baz"                             |
      | callout in callout   | "bar" | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"                         | block "foo"              | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: baz"                             |
      | table cell           | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}"                        | block "foo"              | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: baz"                    |
      | table cell           | "bar" | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}"                        | block "foo"              | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: baz"                    |
      | table rows           | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;  ROW:;;    CELL:;;      B: foo" | "TABLE:{ROW:{CELL:{B: foo}};;ROW:{CELL:{B: foo}}}"           | first row holding "foo"  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;  ROW:;;    CELL:;;      B: foo" |
      | table cells          | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;    CELL:;;      B: foo"         | "TABLE:{ROW:{CELL:{B: foo};;CELL:{B: foo}}}"                 | first cell holding "foo" | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;    CELL:;;      B: foo"         |
      | block object field   | null  | "NOTE:;;  B: foo;;  B: bar"                                                | "NOTE:{B: foo;;B: bar}"                                      | block "foo"              | "NOTE:;;  B: foo;;  B: bar"                                                |
      | nested text children | null  | "CALLOUT:;;  B: foo[em:bar]"                                               | "CALLOUT:{B: foo[em:bar]}"                                   | span "foo"               | "CALLOUT:;;  B: foo[em:bar]"                                               |
      | nested markDefs      | null  | "CALLOUT:;;  B: [@link href=\"foo\":[@link href=\"bar\":foo]]"             | "CALLOUT:{B: [@link href=\"foo\":[@link href=\"bar\":foo]]}" | link "foo"               | "CALLOUT:;;  B: [@link href=\"foo\":[@link href=\"bar\":foo]]"             |

  Scenario Outline: keyed node set removes <entry> at <depth>
    Given the editor state is <before>
    When a collaborator sets the <target> to <entry>
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth              | entry | before                                                                | after                                 | anchor      | target      |
      | root               | null  | "B: foo;;B: bar;;B: baz"                                              | "B: foo;;B: baz"                      | block "foo" | block "bar" |
      | text children      | null  | "B: foo[strong:bar][em:baz]"                                          | "B: foo[em:baz]"                      | span "foo"  | span "bar"  |
      | callout            | null  | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                              | "CALLOUT:{B: foo;;B: baz}"            | block "foo" | block "bar" |
      | callout in callout | null  | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"            | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"  | block "foo" | block "bar" |
      | table cell         | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz" | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}" | block "foo" | block "bar" |

  Scenario Outline: positional node set removes <entry> at <depth>
    Given the editor state is <before>
    When a collaborator sets the second entry in the array holding the <anchor> to <entry>
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth              | entry | before                                                                | after                                 | anchor      |
      | root               | null  | "B: foo;;B: bar;;B: baz"                                              | "B: foo;;B: baz"                      | block "foo" |
      | text children      | null  | "B: foo[strong:bar][em:baz]"                                          | "B: foo[em:baz]"                      | span "foo"  |
      | callout            | null  | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                              | "CALLOUT:{B: foo;;B: baz}"            | block "foo" |
      | callout in callout | null  | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"            | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"  | block "foo" |
      | table cell         | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz" | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}" | block "foo" |

  Scenario Outline: array set removes <entry> at <depth>
    Given the editor state is <before>
    When a collaborator sets the array holding the <anchor> to the <array> with <entry> after its first entry
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth                | entry | before                                                                     | after                                                        | anchor                   | array                                                           |
      | text children        | null  | "B: foo[strong:bar][em:baz]"                                               | "B: foo[em:baz]"                                             | span "foo"               | spans in "B: foo[em:baz]"                                       |
      | text children        | "bar" | "B: foo[strong:bar][em:baz]"                                               | "B: foo[em:baz]"                                             | span "foo"               | spans in "B: foo[em:baz]"                                       |
      | callout              | null  | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: baz}"                                   | block "foo"              | nodes in "B: foo;;B: baz"                                       |
      | callout              | "bar" | "CALLOUT:;;  B: foo;;  B: bar;;  B: baz"                                   | "CALLOUT:{B: foo;;B: baz}"                                   | block "foo"              | nodes in "B: foo;;B: baz"                                       |
      | callout in callout   | null  | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"                         | block "foo"              | nodes in "B: foo;;B: baz"                                       |
      | callout in callout   | "bar" | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: bar;;    B: baz"                 | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"                         | block "foo"              | nodes in "B: foo;;B: baz"                                       |
      | table cell           | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}"                        | block "foo"              | nodes in "B: foo;;B: baz"                                       |
      | table cell           | "bar" | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: bar;;      B: baz"      | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}"                        | block "foo"              | nodes in "B: foo;;B: baz"                                       |
      | table rows           | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;  ROW:;;    CELL:;;      B: foo" | "TABLE:{ROW:{CELL:{B: foo}};;ROW:{CELL:{B: foo}}}"           | first row holding "foo"  | nodes in "ROW:;;  CELL:;;    B: foo;;ROW:;;  CELL:;;    B: foo" |
      | table cells          | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;    CELL:;;      B: foo"         | "TABLE:{ROW:{CELL:{B: foo};;CELL:{B: foo}}}"                 | first cell holding "foo" | nodes in "CELL:;;  B: foo;;CELL:;;  B: foo"                     |
      | block object field   | null  | "NOTE:;;  B: foo;;  B: bar"                                                | "NOTE:{B: foo;;B: bar}"                                      | block "foo"              | nodes in "B: foo;;B: bar"                                       |
      | nested text children | null  | "CALLOUT:;;  B: foo[em:bar]"                                               | "CALLOUT:{B: foo[em:bar]}"                                   | span "foo"               | spans in "B: foo[em:bar]"                                       |
      | nested markDefs      | null  | "CALLOUT:;;  B: [@link href=\"foo\":[@link href=\"bar\":foo]]"             | "CALLOUT:{B: [@link href=\"foo\":[@link href=\"bar\":foo]]}" | link "foo"               | links in "B: [@link href=\"foo\":[@link href=\"bar\":foo]]"     |

  Scenario Outline: initialValue removes <entry> at <depth>
    Given the editor starts as <before> with <entry> after the <anchor>
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth                          | entry | before                                                                     | after                                              | anchor                   |
      | callout                        | null  | "CALLOUT:;;  B: foo;;  B: baz"                                             | "CALLOUT:{B: foo;;B: baz}"                         | block "foo"              |
      | callout                        | "bar" | "CALLOUT:;;  B: foo;;  B: baz"                                             | "CALLOUT:{B: foo;;B: baz}"                         | block "foo"              |
      | callout in callout             | null  | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: baz"                             | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"               | block "foo"              |
      | callout in callout             | "bar" | "CALLOUT:;;  CALLOUT:;;    B: foo;;    B: baz"                             | "CALLOUT:{CALLOUT:{B: foo;;B: baz}}"               | block "foo"              |
      | table cell                     | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: baz"                    | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}"              | block "foo"              |
      | table cell                     | "bar" | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;      B: baz"                    | "TABLE:{ROW:{CELL:{B: foo;;B: baz}}}"              | block "foo"              |
      | children in callout            | null  | "CALLOUT:;;  B: foo[em:bar]"                                               | "CALLOUT:{B: foo[em:bar]}"                         | span "foo"               |
      | children in callout            | "bar" | "CALLOUT:;;  B: foo[em:bar]"                                               | "CALLOUT:{B: foo[em:bar]}"                         | span "foo"               |
      | markDefs in callout            | null  | "CALLOUT:;;  B: [@link href=\"foo\":foo]"                                  | "CALLOUT:{B: [@link href=\"foo\":foo]}"            | link "foo"               |
      | markDefs in callout            | "bar" | "CALLOUT:;;  B: [@link href=\"foo\":foo]"                                  | "CALLOUT:{B: [@link href=\"foo\":foo]}"            | link "foo"               |
      | children in callout in callout | null  | "CALLOUT:;;  CALLOUT:;;    B: foo[em:bar]"                                 | "CALLOUT:{CALLOUT:{B: foo[em:bar]}}"               | span "foo"               |
      | children in callout in callout | "bar" | "CALLOUT:;;  CALLOUT:;;    B: foo[em:bar]"                                 | "CALLOUT:{CALLOUT:{B: foo[em:bar]}}"               | span "foo"               |
      | markDefs in callout in callout | null  | "CALLOUT:;;  CALLOUT:;;    B: [@link href=\"foo\":foo]"                    | "CALLOUT:{CALLOUT:{B: [@link href=\"foo\":foo]}}"  | link "foo"               |
      | markDefs in callout in callout | "bar" | "CALLOUT:;;  CALLOUT:;;    B: [@link href=\"foo\":foo]"                    | "CALLOUT:{CALLOUT:{B: [@link href=\"foo\":foo]}}"  | link "foo"               |
      | children in table cell         | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo[em:bar]"                          | "TABLE:{ROW:{CELL:{B: foo[em:bar]}}}"              | span "foo"               |
      | children in table cell         | "bar" | "TABLE:;;  ROW:;;    CELL:;;      B: foo[em:bar]"                          | "TABLE:{ROW:{CELL:{B: foo[em:bar]}}}"              | span "foo"               |
      | markDefs in table cell         | null  | "TABLE:;;  ROW:;;    CELL:;;      B: [@link href=\"foo\":foo]"             | "TABLE:{ROW:{CELL:{B: [@link href=\"foo\":foo]}}}" | link "foo"               |
      | markDefs in table cell         | "bar" | "TABLE:;;  ROW:;;    CELL:;;      B: [@link href=\"foo\":foo]"             | "TABLE:{ROW:{CELL:{B: [@link href=\"foo\":foo]}}}" | link "foo"               |
      | table rows                     | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;  ROW:;;    CELL:;;      B: foo" | "TABLE:{ROW:{CELL:{B: foo}};;ROW:{CELL:{B: foo}}}" | first row holding "foo"  |
      | table cells                    | null  | "TABLE:;;  ROW:;;    CELL:;;      B: foo;;    CELL:;;      B: foo"         | "TABLE:{ROW:{CELL:{B: foo};;CELL:{B: foo}}}"       | first cell holding "foo" |
      | block object field             | null  | "NOTE:;;  B: foo;;  B: bar"                                                | "NOTE:{B: foo;;B: bar}"                            | block "foo"              |

  Scenario Outline: batch insert removes <entry> at <depth>
    Given the editor state is <before>
    When a collaborator inserts null before the first block and "bar" after the last block
    Then the editor state is <after>
    And no node array in the value holds a non-object entry
    And the host's copy matches the editor

    Examples:
      | depth | entry          | before                   | after                    |
      | root  | null and "bar" | "B: foo;;B: bar;;B: baz" | "B: foo;;B: bar;;B: baz" |
