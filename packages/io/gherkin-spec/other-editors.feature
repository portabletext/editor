Feature: Other editors

  Scenario: Another editor's change to a different block lands without disturbing sent or unsent changes
    Given the document is "B: foo|;;B: bar"
    When "x" is typed
    Then Editor A shows "B: foox|;;B: bar"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "B: fooxy|;;B: bar"
    And Editor A has sent nothing new
    When the caret is put after "bar" in Editor B
    And "z" is typed in Editor B
    Then Editor B shows "B: foo;;B: barz|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "B: foo;;B: barz"
    When Editor A receives Editor B's batch 1
    Then Editor A shows "B: fooxy|;;B: barz"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 1
    Then the server has "B: foox;;B: barz"
    When Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: fooxy;;B: barz"

  Scenario Outline: Two editors set the same block's style at once: the last one the server saved wins on every screen (the server saves <first save> then <second save>)
    Given the document is "B: foo|"
    When the style is set to "h2"
    Then Editor A shows "H2: foo|"
    And Editor A has sent batch 1
    When the style is set to "h1" in Editor B
    Then Editor B shows "H1: foo|"
    And Editor B has sent batch 1
    When the server receives <first save>
    And the server receives <second save>
    Then the server has "<server>"
    When <first>
    Then Editor A shows "<after first>"
    When <second>
    Then Editor A shows "<server>|"
    And Editor A has sent nothing new

    Examples:
      | first save         | second save        | server  | first                                | after first | second                               |
      | Editor B's batch 1 | Editor A's batch 1 | H2: foo | Editor A receives Editor B's batch 1 | H2: foo\|   | Editor A's batch 1 comes back        |
      | Editor A's batch 1 | Editor B's batch 1 | H1: foo | Editor A's batch 1 comes back        | H2: foo\|   | Editor A receives Editor B's batch 1 |

  Scenario: A host that folds two batches into one request names its transaction for each, and each batch is confirmed
    Given hosts that fold batches into shared requests
    And the document is "B: foo|;;B: bar"
    When "x" is typed
    Then Editor A shows "B: foox|;;B: bar"
    And Editor A has sent batch 1
    When the caret is put after "bar" in Editor B
    And "y" is typed in Editor B
    Then Editor B shows "B: foo;;B: bary|"
    And Editor B has sent batch 1
    When "z" is typed
    And "w" is typed in Editor B
    Then Editor A has sent nothing new
    And Editor B has sent nothing new
    When the server receives Editor A's batch 1 and Editor B's batch 1 as one transaction
    Then the server has "B: foox;;B: bary"
    And Editor A's host has named the transaction for batch 1
    And Editor B's host has named the transaction for batch 1
    When Editor A's batch 1 comes back
    Then Editor A shows "B: fooxz|;;B: bary"
    And Editor A has sent batch 2
    When Editor B's batch 1 comes back
    Then Editor B shows "B: foox;;B: baryw|"
    And Editor B has sent batch 2

  Scenario: The editor's own echo applies nothing, and a transaction that also carries another editor's batch applies only that batch
    Given hosts that fold batches into shared requests
    And the document is "B: foo|;;B: bar"
    When "x" is typed
    Then Editor A has sent batch 1
    When the server receives Editor A's batch 1
    And Editor A's batch 1 comes back
    Then Editor A shows "B: foox|;;B: bar"
    And Editor A's last apply carries no patches
    And Editor A's last apply has Editor A's batch 1 underneath
    When "y" is typed
    Then Editor A has sent batch 2
    When the caret is put after "bar" in Editor B
    And "z" is typed in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor A's batch 2 and Editor B's batch 1 as one transaction
    And Editor A's batch 2 comes back
    Then Editor A shows "B: fooxy|;;B: barz"
    And Editor A's last apply carries the patches of Editor B's batch 1

  Scenario: Undo reverts only this editor's changes, and a resync clears the undo history
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 1
    And Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    And Editor A's batch 2 comes back
    Then Editor A has sent nothing new
    When the style is set to "h1" in Editor B
    Then Editor B shows "H1: foo|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "H1: fooxy"
    When Editor A receives Editor B's batch 1
    Then Editor A shows "H1: fooxy|"
    When undo is performed
    Then Editor A shows "H1: foox|"
    And Editor A has sent batch 3
    When the server receives Editor A's batch 3
    Then the server has "H1: foox"
    When Editor A's batch 3 comes back
    And Editor A is resynced
    And undo is performed
    Then Editor A shows "H1: foox|"
    And Editor A has sent nothing new
