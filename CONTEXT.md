# Crackin'

A stateless, configurable 2D math game training multiplication and division fluency in children. The central skill is recognising relationships between numbers through their shared structure, not rote recall.

## Language

### Numbers and structure

**Drawer**:
The family of all valid products of a given number n, where n ∈ {2..9} and both factors stay within 1–10. Drawer 7 = {7, 14, 21, 28, 35, 42, 49, 56, 63, 70}. A number can belong to multiple drawers.
_Avoid_: times-table, multiplication table, family

**Triple**:
The atomic unit of the domain — a pair of factors and their product: (a, b, p) where a × b = p and a, b ∈ {1..10}. All challenge types derive from a triple.
_Avoid_: fact, equation, problem

**Base space**:
The complete universe of valid triples — the 10×10 multiplication table with factors 1–10. Drawers 1 and 10 are excluded (identity and scale, not meaningful recall targets). Active base space: factors 2–9.
_Avoid_: grid, table, matrix

**Valid drawer**:
Drawer n is valid for product p only if p = n × m where both n ≤ 10 and m ≤ 10. 42 belongs to drawer 6 (6×7) and drawer 7 (7×6). It does not belong to drawer 3 (3×14 — 14 is out of range).
_Avoid_: applicable drawer, matching drawer

**Decimal extension**:
Any number with trailing zeros reduces to its core pattern by stripping those zeros. 420 → 42 → triple (6, 7, 42). The stripped number is worked within the base space; scale is reattached at the end. Trailing zeros are scale noise and do not affect drawer membership.
_Avoid_: larger numbers, extended range, big numbers

### Challenge types

**Multiplication challenge**:
Given two factors a and b from a triple, the player produces the product p.

**Division challenge**:
Given the product p and one factor from a triple, the player produces the missing factor.

**Classify challenge**:
Given a product p (zeros stripped), the player identifies all valid drawers it belongs to.

**Group challenge**:
Given a set of numbers, the player finds the minimum set of drawers that covers every number in the set. A drawer "covers" a number if that drawer is valid for it.
_Avoid_: sort, categorise, cluster

**Relate challenge**:
Given two numbers A and B, the player constructs the shortest step-by-step path from A to B using ×/÷ operations with operands 1–9. Operations ×10^n and ÷10^n are free steps — they do not count toward path length.

**Free step**:
Any operation that multiplies or divides by a power of 10 (×10, ÷10, ×100, etc.) in a Relate challenge. Free because stripping/adding zeros is scale noise, not mathematical reasoning.

### Game modes

**Shooter**:
The primary game mode. Handles Multiplication, Division, and Classify challenges. A prompt is shown; distractor numbers and one correct answer fly across the screen on geometric tiles. The player shoots the correct answer.

**Group mini-game**:
A cluster of numbers is shown on screen. The player taps drawer labels (2–9) to claim coverage. Live feedback highlights which numbers each tapped drawer covers and which remain uncovered.

**Relate mini-game**:
Start and target numbers are shown. The player constructs a path step-by-step: at each step, they select an operation (× or ÷) and an operand (1–9). The current number updates after each step. The goal is to reach the target in the fewest non-free steps.

### Scoring

**Streak**:
A count of consecutive correct answers within a session. Resets on any error.

**Streak multiplier**:
A score multiplier that increases at streak milestones (e.g. ×2 at 3-in-a-row, ×3 at 5-in-a-row). Applied to the base score of each answer.

**Session score**:
`floor(1000 / response_ms) × streak_multiplier` per correct answer. Not persisted between sessions.

### Configuration

**Session config**:
The complete set of parameters for a play session — active drawers, active modes, challenge types per mode, and difficulty parameters. Expressed as URL query parameters and editable via the in-app settings screen.

**Shareable link**:
A URL with a fully-encoded session config. A parent configures a session in the settings screen and shares the resulting URL with a child. No account or login required.

## Relationships

- A **Triple** (a, b, p) defines membership in exactly two **Drawers**: drawer a and drawer b (when a ≠ b)
- A **Drawer** contains all products p where both factors fit within the **Base space**
- **Decimal extension** maps any number to its core triple by stripping trailing zeros
- A **Shooter** session draws on Multiplication, Division, and Classify challenges, all derived from Triples
- A **Group mini-game** session operates on sets of numbers, finding minimum Drawer coverage
- A **Relate mini-game** session finds shortest paths between numbers through the Drawer graph
- A **Session config** controls which Drawers, modes, and challenge types are active
- A **Shareable link** encodes a complete Session config as URL params

## Example dialogue

> **Dev:** "Should 420 appear in drawer 6 or drawer 7?"
> **Domain expert:** "Both — strip the zero, you get 42, which is 6×7. Both drawers are valid."

> **Dev:** "What about 3×14 for 42?"
> **Domain expert:** "Not valid — 14 is outside the base space. The valid drawer rule requires both factors to be 10 or under."

> **Dev:** "In the Relate challenge, does ÷10 cost a step?"
> **Domain expert:** "No — dividing by 10 is a free step. Only operands 1–9 count toward path length."

## Flagged ambiguities

- "table" was used to mean both the 10×10 grid of facts and an individual drawer — resolved: the grid is the **Base space**, an individual row is a **Drawer**.
- "decimal extension" initially suggested a separate mode — resolved: it is a uniform rule applied across all challenge types, not a separate mode.
- "valid drawer" initially ambiguous about whether factors must both be ≤10 — resolved: both factors must be ≤10; 3×14 is not a valid triple regardless of the product.
