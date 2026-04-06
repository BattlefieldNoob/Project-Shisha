# Testing Rules

## Unit Test Location

Place unit tests in the **same folder** as the module under test, not in a separate `__tests__` folder.

**Correct:**
```
src/
  utils/
    numbers.ts      # Source file
    numbers.test.ts # Test file in same folder
```

**Incorrect:**
```
src/
  utils/
    numbers.ts
    __tests__/
      numbers.test.ts  # Don't use __tests__ folder
```

**Rationale:**
- Keeps tests close to the code they test
- Easier to find related tests
- Follows Bun/Vitest conventions
- Reduces folder nesting

## Test File Naming

- Use `.test.ts` extension (Bun/Jest convention)
- Match the source file name: `{module}.test.ts` for `{module}.ts`
