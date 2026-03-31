# Phase 2: Core Hooks Implementation (C1-C3 Full)

## Objective

Validate individual Forge hook components in isolation and expand test coverage

## Tasks

### Task 2.1: Expand C1 Module (Hash Consistency)

- **Goal**: Achieve 100% coverage of hash calculation across edge cases
- **Work**:
  - Add tests for deep symlink chains (>3 levels)
  - Test hash consistency with .git/worktree
  - Verify bridge path calculation with environment variable overrides
  - Document hash algorithm in comments
- **Acceptance Criteria**:
  - All edge cases covered
  - Comments explain hash algorithm
  - C1 module expanded to 12+ test cases

### Task 2.2: Expand C2 Module (Context Proxy Hook)

- **Goal**: Complete context proxy hook validation
- **Work**:
  - Test context proxy with multiple session IDs in parallel
  - Verify toolCallCount persistence across saves/restores
  - Test proxy skip conditions (CC client, certain operations)
  - Document context proxy state machine
- **Acceptance Criteria**:
  - C2 module expanded to 10+ test cases
  - State machine documented
  - All skip conditions validated

### Task 2.3: Expand C3 Module (Instruction Strings)

- **Goal**: Validate instruction injection for all quality gates
- **Work**:
  - Add test for multi-language instruction support (if applicable)
  - Test instruction payload size limits
  - Verify instruction escaping/encoding
  - Test instruction parsing on various client types
- **Acceptance Criteria**:
  - C3 module expanded to 10+ test cases
  - All gates have instruction tests
  - Encoding verified

### Task 2.4: Integration Between C1-C3

- **Goal**: Ensure C1-C3 work together correctly
- **Work**:
  - Test bridge creation using hash from C1
  - Test instruction injection with context from C2
  - Test combined workflow
- **Acceptance Criteria**:
  - No conflicts between modules
  - Shared state consistent
  - Integration tests pass

## Quality Gates

- All C1 tests pass (12+)
- All C2 tests pass (10+)
- All C3 tests pass (10+)
- Code review: No critical issues
- No new test failures

## Definition of Done

- ✅ All 3 modules expanded and passing
- ✅ Test count increased from 23 to 32+
- ✅ Code documented
- ✅ Ready for Phase 3 (C4 full FSM testing)
