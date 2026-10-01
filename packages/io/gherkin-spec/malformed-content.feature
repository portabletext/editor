Feature: Malformed content

  Scenario: Content received without keys is repaired, and the repair goes out in the next batch
    Given the server has "B _key="k1": foo"
    And the server's block "k1" has no key
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B: foo"
    And every block in Editor A has a unique key
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo"
    And every block on the server has a unique key
    When Editor A's batch 1 comes back
    Then Editor A has sent nothing new

  Scenario: A block received without a type is repaired as a text block, and the repair goes out in the next batch
    Given the server has "B _key="k1": foo;;B _key="k2": bar"
    And the server's block "k2" has no type
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B: foo;;B: bar"
    And Editor A has been warned
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B: bar"
    When Editor A's batch 1 comes back
    Then Editor A is in step
    And Editor A has sent nothing new

  Scenario: A text block received with children that aren't a list of objects gets one empty span, and the repair goes out in the next batch
    Given the server has "B _key="k1": foo;;B _key="k2": bar"
    And the server's block "k2" has children "oops"
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B: foo;;B: "
    And Editor A has been warned
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B: "
    When Editor A's batch 1 comes back
    Then Editor A is in step
    And Editor A has sent nothing new

  Scenario: A span received with a text that isn't a string gets an empty text, and the repair goes out in the next batch
    Given the server has "B _key="k1": foo;;B _key="k2": bar"
    And the server's block "k2" has a span whose text is 42
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B: foo;;B: "
    And Editor A has been warned
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B: "
    When Editor A's batch 1 comes back
    Then Editor A is in step
    And Editor A has sent nothing new

  Scenario: A block received as a string is left out and never written to, and a repair by index still hits the stored block
    Given the server has "B _key="k1": foo;;B _key="k2": bar"
    And the server's block "k1" is the string "oops"
    And the server's block "k2" has no key
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B _key="51491b98": |bar"
    And Editor A has been warned
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B _key="51491b98": bar"
    And the server has a block that is not an object
    When Editor A's batch 1 comes back
    And "x" is typed
    Then Editor A shows "B: x|bar"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: xbar"
    And the server has a block that is not an object

  Scenario: Emptying a field that still holds a block that is not an object removes the blocks the editor shows and leaves the stored one
    Given the server has "B _key="k1": foo;;B _key="k2": bar"
    And the server's block "k1" is the string "oops"
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B: |bar"
    When the block "bar" is deleted
    Then Editor A shows "B: |"
    And Editor A has sent batch 1
    And Editor A's batch 1 does not empty the field
    When the server receives Editor A's batch 1
    Then the server has a block that is not an object
    When Editor A's batch 1 comes back
    And "x" is typed
    Then Editor A shows "B: x|"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: x"
    And the server has a block that is not an object

  Scenario: The server's copy changes without a transaction before any transaction is recorded, and the resync repairs it
    Given the document is "B _key="k1": foo|"
    When the server's copy changes without a transaction so its block "k1" has no type
    And Editor A is resynced
    Then Editor A shows "B: foo"
    And Editor A has been warned
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo"

  Scenario: A transaction that removes a block's key puts the editor out of step, and the resync repairs it
    Given the document is "B _key="k1": foo|;;B _key="k2": bar"
    When a script changes the server's block "k2" so it has no key
    And Editor A receives the script's corruption
    Then Editor A reports that it is out of step, with reason "invalid content"
    And Editor A's sync is "out of step"
    And Editor A shows "B: foo|;;B _key="k2": bar"
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foo|;;B _key="241fea5d": bar"
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B _key="241fea5d": bar"

  Scenario: A transaction that removes a block's type puts the editor out of step, and the resync repairs it
    Given the document is "B _key="k1": foo|;;B _key="k2": bar"
    When a script changes the server's block "k2" so it has no type
    And Editor A receives the script's corruption
    Then Editor A reports that it is out of step, with reason "invalid content"
    And Editor A's sync is "out of step"
    And Editor A shows "B: foo|;;B: bar"
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foo|;;B: bar"
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B: bar"

  Scenario: A transaction that sets a block's children to a string puts the editor out of step, and the resync repairs it
    Given the document is "B _key="k1": foo|;;B _key="k2": bar"
    When a script changes the server's block "k2" so it has children "oops"
    And Editor A receives the script's corruption
    Then Editor A reports that it is out of step, with reason "invalid content"
    And Editor A's sync is "out of step"
    And Editor A shows "B: foo|;;B: bar"
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foo|;;B: "
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B: "

  Scenario: A transaction that sets a span's text to a number puts the editor out of step, and the resync repairs it
    Given the document is "B _key="k1": foo|;;B _key="k2": bar"
    When a script changes the server's block "k2" so it has a span whose text is 42
    And Editor A receives the script's corruption
    Then Editor A reports that it is out of step, with reason "invalid content"
    And Editor A's sync is "out of step"
    And Editor A shows "B: foo|;;B: bar"
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foo|;;B: "
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B: "

  Scenario: A transaction that replaces a block with a string puts the editor out of step, and the resync leaves the string out
    Given the document is "B _key="k1": foo|;;B _key="k2": bar"
    When a script changes the server's block "k2" so it is the string "oops"
    And Editor A receives the script's corruption
    Then Editor A reports that it is out of step, with reason "invalid content"
    And Editor A's sync is "out of step"
    And Editor A shows "B: foo|;;B: bar"
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foo|"
    And Editor A has sent nothing new
    And the server has "B: foo"
    And the server has a block that is not an object

  Scenario: Two editors repairing the same missing key of the same revision mint the same key
    Given the server has "B _key="k1": foo"
    And the server's block "k1" has no key
    And the editors are in their first commit
    When Editor A is loaded
    And Editor B is loaded
    And Editor A's first commit ends
    And Editor B's first commit ends
    Then Editor A shows "B _key="52491d2b": foo"
    And Editor B shows "B _key="52491d2b": foo"
    And Editor A has sent batch 1
    And Editor B has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B _key="52491d2b": foo"
    When the server receives Editor B's batch 1
    Then the server has "B _key="52491d2b": foo"
    When Editor A's batch 1 comes back
    And Editor A receives Editor B's batch 1
    And Editor B receives Editor A's batch 1
    And Editor B's batch 1 comes back
    Then Editor A is in step
    And Editor B is in step
    And Editor A shows "B _key="52491d2b": foo"
    And Editor B shows "B _key="52491d2b": foo"
    And Editor A has sent nothing new
    And Editor B has sent nothing new
