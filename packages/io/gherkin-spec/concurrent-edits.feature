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
    And Editor A has been told work was dropped
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

  Scenario: The caret stays with its word while Editor B types before it
    Given the document is "B: |foo bar"
    When the caret is put after "foo"
    And "y" is typed in Editor B
    Then Editor B shows "B: y|foo bar"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: yfoo| bar"
    And Editor A's last apply carries the patches of Editor B's batch 1

  Scenario: The caret stays after the typing when its echo comes back folded with Editor B's text before it
    Given hosts that fold batches into shared requests
    And the document is "B: |foo bar"
    When the caret is put after "bar"
    And "x" is typed
    Then Editor A shows "B: foo barx|"
    And Editor A has sent batch 1
    When "baz " is typed in Editor B
    Then Editor B shows "B: baz |foo bar"
    And Editor B has sent batch 1
    When the server receives Editor A's batch 1 and Editor B's batch 1 as one transaction
    Then the server has "B: baz foo barx"
    When Editor A's batch 1 comes back
    Then Editor A shows "B: baz foo barx|"

  Scenario: The caret stays after unsent typing when Editor B types before earlier typing in the same span
    Given the document is "B: |foo bar baz"
    When "qux " is typed
    Then Editor A shows "B: qux |foo bar baz"
    And Editor A has sent batch 1
    When the caret is put after "bar"
    And "x" is typed
    Then Editor A shows "B: qux foo barx| baz"
    And Editor A has sent nothing new
    When "remote " is typed in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: remote qux foo barx| baz"

  Scenario: Two editors insert after the same block, and Editor A shows the server's order from the moment Editor B's insert arrives
    Given the document is "B: a|"
    When the block "B: x" is inserted
    Then Editor A shows "B: a;;B: x|"
    And Editor A has sent batch 1
    When the block "B: y" is inserted in Editor B
    Then Editor B shows "B: a;;B: y|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: a;;B: x|;;B: y"
    When the server receives Editor A's batch 1
    Then the server has "B: a;;B: x;;B: y"
    When Editor A's batch 1 comes back
    Then Editor A shows "B: a;;B: x|;;B: y"
    When Editor B's batch 1 comes back
    And Editor B receives Editor A's batch 1
    Then Editor B shows "B: a;;B: x;;B: y|"

  Scenario: Editor B removes the block Editor A's unsent insert went after, the removal lands first, and both leave A's screen
    Given the document is "B: a|;;B: b"
    When "q" is typed
    Then Editor A shows "B: aq|;;B: b"
    And Editor A has sent batch 1
    When the block "B: x" is inserted
    Then Editor A shows "B: aq;;B: x|;;B: b"
    And Editor A has sent nothing new
    When the block "a" is deleted in Editor B
    Then Editor B shows "B: |b"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "B: |b"
    And Editor A has been told work was dropped, with reason "no target"
    When the server receives Editor A's batch 1
    And Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    And Editor A's batch 2 comes back
    Then the server has "B: b"
    And Editor A shows "B: |b"

  Scenario: Editor B types into the block whose style Editor A changed, B's typing lands first, and A gets the whole block as the server will have it
    Given the document is "B: foo|"
    When the style is set to "h2"
    Then Editor A shows "H2: foo|"
    And Editor A has sent batch 1
    When "x" is typed in Editor B
    Then Editor B shows "B: foox|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "H2: foox"
    And Editor A's last apply sets the whole block "foox"
    When the server receives Editor A's batch 1
    Then the server has "H2: foox"
    When Editor A's batch 1 comes back
    Then Editor A shows "H2: foox"
    When Editor B's batch 1 comes back
    And Editor B receives Editor A's batch 1
    Then Editor B shows "H2: foox|"

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

  Scenario: Editor B deletes the block Editor A is typing into, the deletion lands first, and A's unsent typing is reported as dropped
    Given the document is "B: foo|;;B: bar"
    When "x" is typed
    Then Editor A shows "B: foox|;;B: bar"
    And Editor A has sent batch 1
    When the caret is put after "bar"
    And "y" is typed
    Then Editor A shows "B: foox;;B: bary|"
    And Editor A has sent nothing new
    When the block "bar" is deleted in Editor B
    Then Editor B shows "B: foo|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And the server receives Editor A's batch 1
    Then the server has "B: foox"
    When Editor A receives Editor B's batch 1
    Then Editor A has been told work was dropped, with reason "no target"
    And Editor A shows "B: foox"
    When Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: foox"
    When Editor A's batch 2 comes back
    Then Editor A shows "B: foox"
    And Editor A is in step
    And Editor A's sync is "synced"
