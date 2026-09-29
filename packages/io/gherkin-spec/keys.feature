Feature: Keys

  Scenario: A received insert with a key the editor has already sent puts it out of step
    Given the document is "B: foo|"
    When the block "B _key="k9": baz" is inserted
    Then Editor A shows "B: foo;;B _key="k9": baz"
    And Editor A has sent batch 1
    When the block "B _key="k9": bar" is inserted in Editor B
    Then Editor B shows "B: foo;;B _key="k9": bar"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "B: foo;;B _key="k9": bar"
    When Editor A receives Editor B's batch 1
    Then Editor A reports that it is out of step
    And Editor A shows "B: foo;;B _key="k9": baz"
    When the server receives Editor A's batch 1
    Then the server has "B: foo;;B _key="k9": baz;;B _key="k9": bar"
    When Editor A's batch 1 comes back
    Then Editor A shows "B: foo;;B _key="k9": baz"
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foo;;B: baz;;B: bar"
    And every block in Editor A has a unique key
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then every block on the server has a unique key

  Scenario: An unsent insert that would reuse a key another editor used gets a new key
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When the block "B _key="k9": baz" is inserted
    Then Editor A shows "B: foox;;B _key="k9": baz"
    And Editor A has sent nothing new
    When the block "B _key="k9": bar" is inserted in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "B: foo;;B _key="k9": bar"
    When Editor A receives Editor B's batch 1
    Then Editor A is in step
    And Editor A shows "B: foox;;B: baz;;B _key="k9": bar"
    And every block in Editor A has a unique key
    When the server receives Editor A's batch 1
    Then the server has "B: foox;;B _key="k9": bar"
    When Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: foox;;B: baz;;B _key="k9": bar"
    And every block on the server has a unique key

  Scenario: Content received without keys is repaired, and the repair goes out in the next batch
    Given the server has "B: foo"
    And the server's block has no key
    And an editor that claims the first load
    When Editor A is loaded
    Then Editor A shows "B: foo"
    And every block in Editor A has a unique key
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo"
    And every block on the server has a unique key
    When Editor A's batch 1 comes back
    Then Editor A has sent nothing new
