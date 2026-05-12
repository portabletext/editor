Feature: Flag Preservation

  Background:
    Given a global keymap

  # ---------------------------------------------------------------------------
  # `i` (case-insensitive) is preserved.
  # The pattern `/\[!note\]/i` matches `[!note]` regardless of case. Without
  # preserving `i`, only the exact lowercase trigger would fire.
  # ---------------------------------------------------------------------------
  Scenario Outline: Case-Insensitive Rule
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state       |
      | "B: " | "[!note]"     | "B: NOTE end\|" |
      | "B: " | "[!NOTE]"     | "B: NOTE end\|" |
      | "B: " | "[!Note]"     | "B: NOTE end\|" |

  # ---------------------------------------------------------------------------
  # Unicode (`u`) is preserved.
  # The pattern `/\p{L}+!/u` uses a Unicode property escape that requires
  # the `u` flag at construction time, otherwise `new RegExp` throws.
  # Preserving `u` lets the rule match across Unicode letters.
  # ---------------------------------------------------------------------------
  Scenario Outline: Unicode Rule
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state      |
      | "B: " | "hello!"      | "B: HIT end\|" |
      | "B: " | "héllo!"      | "B: HIT end\|" |

  # ---------------------------------------------------------------------------
  # User-set `g` is stripped, leaving the plugin's own `g` flag intact.
  # The rule still fires; no `Invalid flags` error.
  # ---------------------------------------------------------------------------
  Scenario Outline: User Sets `g` Flag
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state        |
      | "B: " | "(c)"         | "B: GMARK end\|" |

  # ---------------------------------------------------------------------------
  # User-set `d` is stripped, leaving the plugin's own `d` flag intact.
  # The rule still fires; no `Invalid flags` error.
  # ---------------------------------------------------------------------------
  Scenario Outline: User Sets `d` Flag
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state        |
      | "B: " | "(d)"         | "B: DMARK end\|" |

  # ---------------------------------------------------------------------------
  # User-set `y` (sticky) is stripped.
  # With `y` preserved, `matchAll` would only match at `lastIndex` (0 on a
  # freshly-built matcher), so `foo` inside `xyzfoo` would never match.
  # Stripping `y` keeps the loop semantics: pattern fires anywhere in the
  # text.
  # ---------------------------------------------------------------------------
  Scenario Outline: User Sets `y` Flag
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state    | inserted text | new state           |
      | "B: xyz" | "foo"         | "B: xyzYMARK end\|" |

  # ---------------------------------------------------------------------------
  # Bare pattern (no consumer flags) still fires. Historical contract pin.
  # ---------------------------------------------------------------------------
  Scenario Outline: Bare Pattern
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state        |
      | "B: " | "[!plain]"    | "B: PLAIN end\|" |

  # ---------------------------------------------------------------------------
  # `i` flag flows through to capture groups.
  # `defineTextTransformRule` replaces captured groups (not the full match)
  # when groups are present. Pattern `/<<(yes|no)>>/i` against `<<YES>>`
  # captures `YES`; the transform replaces just the capture, leaving the
  # angle brackets. Without `i` flowing into the group-match path, the
  # capture would not fire on uppercase input.
  # ---------------------------------------------------------------------------
  Scenario Outline: Case-Insensitive Rule With Capture Group
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state           |
      | "B: " | "<<yes>>"     | "B: <<GHIT>> end\|" |
      | "B: " | "<<YES>>"     | "B: <<GHIT>> end\|" |
      | "B: " | "<<No>>"      | "B: <<GHIT>> end\|" |

  # ---------------------------------------------------------------------------
  # `u` flag flows through to capture groups.
  # Pattern `/@(\p{L}+)\b/u` against `@héllo` captures `héllo`
  # (Unicode letters). Transform replaces the capture, leaving the leading
  # `@`. The `@` prefix keeps the pattern disjoint from the full-match
  # unicode rule above.
  # ---------------------------------------------------------------------------
  Scenario Outline: Unicode Rule With Capture Group
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state | inserted text | new state        |
      | "B: " | "@hello"      | "B: @UHIT end\|" |
      | "B: " | "@héllo"      | "B: @UHIT end\|" |

  # ---------------------------------------------------------------------------
  # `y` is stripped even when the pattern has a capture group.
  # Pattern `/(jam)session/y` against `xxxjamsession` matches at index 3
  # (only possible with `y` stripped); captures `jam`; transform replaces
  # just the capture, leaving `xxx` and `session` intact.
  # ---------------------------------------------------------------------------
  Scenario Outline: Sticky Rule With Capture Group
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And " end" is typed
    Then the editor state is <new state>

    Examples:
      | state    | inserted text | new state                 |
      | "B: xxx" | "jamsession"  | "B: xxxYHITsession end\|" |
