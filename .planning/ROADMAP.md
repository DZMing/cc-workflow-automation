# Development Roadmap

## Phase 1: 脚手架与基础 UI (Test Framework Setup)

**Goal**: Build core test infrastructure and validate hash consistency

**Tasks**:

1. Set up test runner (run-all.sh + test-helpers.js)
2. Implement C1 module tests (hash consistency - 8 use cases)
3. Create shared testing utilities
4. Document test module structure

**Success Criteria**:

- C1 tests passing (8/8)
- Test runner working
- Helpers module stable

---

## Phase 2: Core Hooks Implementation (C1-C3 Full)

**Goal**: Validate individual hook components in isolation

**Tasks**:

1. Implement C2 module tests (context proxy hook)
2. Implement C3 module tests (instruction string processing)
3. Create mock Forge hooks for testing
4. Verify hook dependency resolution

**Success Criteria**:

- C1, C2, C3 modules all passing
- Hooks correctly mocked
- No external dependencies

---

## Phase 3: Quality Gates FSM (C4)

**Goal**: Test complex state machine behavior of quality gates

**Tasks**:

1. Implement C4 module tests (quality gate FSM)
2. Test gate state transitions
3. Validate epoch and lease mechanisms
4. Test escalation logic

**Success Criteria**:

- C4 tests passing (100%)
- FSM transitions validated
- Escalation logic verified

---

## Phase 4: Integration & E2E Tests (C5)

**Goal**: End-to-end smoke testing across all hooks

**Tasks**:

1. Implement C5 module tests (integration smoke test)
2. Create realistic bridge scenarios
3. Test full workflow chain
4. Validate data consistency across modules

**Success Criteria**:

- C5 tests passing
- Integration validated
- Data flows correct

---

## Phase 5: Documentation & Release

**Goal**: Complete documentation and prepare for release

**Tasks**:

1. Write comprehensive test documentation
2. Document known limitations
3. Create troubleshooting guide
4. Release v1.0

**Success Criteria**:

- Documentation complete
- All tests passing
- Ready for integration into CI/CD
