Feature: Concurrent edits

  Scenario: Two editors type into the same block at once, and both keep their words
    Given the document is "B: foo bar|"
    When the caret is put after "bar"
    And "x" is typed
    Then Editor A shows "B: foo barx|"
    And Editor A has sent batch 1
    When the caret is put after "foo" in Editor B
    And "y" is typed in Editor B
    Then Editor B shows "B: fooy| bar"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And the server receives Editor A's batch 1
    Then the server has "B: fooy barx"
    When Editor A receives Editor B's batch 1
    And Editor A's batch 1 comes back
    Then Editor A shows "B: fooy barx"
    When Editor B's batch 1 comes back
    And Editor B receives Editor A's batch 1
    Then Editor B shows "B: fooy| barx"

  Scenario: One editor deletes a repeated word while another types next to it, every screen converges, and the second copy is the one that goes
    Given the document is "B: copy copy|"
    When the caret is put after "copy " in Editor B
    And "hi" is typed in Editor B
    Then Editor B shows "B: copy hi|copy"
    And Editor B has sent batch 1
    When "copy" is deleted before the caret
    Then Editor A shows "B: copy |"
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    And the server receives Editor B's batch 1
    Then the server has "B: copy hi"
    When Editor A's batch 1 comes back
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: copy hi"
    When Editor B receives Editor A's batch 1
    And Editor B's batch 1 comes back
    Then Editor B shows "B: copy hi"

  # known red: the model warns about unsent typing with no target only after a resync, not when a received transaction takes the target away
  @skip
  Scenario: A script replaces the whole field while Editor A has unsent typing
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When a script sets the field to "B: bar"
    Then the server has "B: bar"
    When Editor A receives the script's change
    Then Editor A shows "B: bar"
    And Editor A has been warned
    When the server receives Editor A's batch 1
    Then the server has "B: bar"
    When Editor A's batch 1 comes back
    Then Editor A shows "B: bar"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: bar"
    When Editor A's batch 2 comes back
    Then Editor A shows "B: bar"
    And Editor A has sent nothing new

  # known red: the model doesn't map the caret through remote text changes
  @skip
  Scenario: The caret stays with its word while Editor B types before it
    Given the document is "B: |foo bar"
    When the caret is put after "foo"
    And "y" is typed in Editor B
    Then Editor B shows "B: y|foo bar"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: yfoo| bar"

  Scenario: Two editors fill an empty field at the same moment and end with two blocks
    Given the document is "B: foo|"
    When the block "foo" is deleted
    Then Editor A shows "B: |"
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has no field
    When Editor A's batch 1 comes back
    And Editor B receives Editor A's batch 1
    Then Editor B shows "B: |"
    When "x" is typed
    Then Editor A shows "B: x|"
    And Editor A has sent batch 2
    When "y" is typed in Editor B
    Then Editor B shows "B: y|"
    And Editor B has sent batch 1
    When the server receives Editor A's batch 2
    And the server receives Editor B's batch 1
    Then the server has "B: y;;B: x"
    When Editor A's batch 2 comes back
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: y;;B: x|"
    When Editor B receives Editor A's batch 2
    And Editor B's batch 1 comes back
    Then Editor B shows "B: y|;;B: x"
