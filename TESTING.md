# Testing Setup with Vitest

This project uses [Vitest](https://vitest.dev/) as the testing framework, configured for React/TypeScript/Electron development.

## Features

- ✅ **React Testing Library** - For testing React components
- ✅ **JSX/TSX Support** - Full TypeScript and JSX support
- ✅ **JSDOM Environment** - Browser-like testing environment
- ✅ **Mock Support** - Comprehensive mocking for Electron APIs and Node modules
- ✅ **Code Coverage** - Built-in code coverage with v8
- ✅ **Watch Mode** - Real-time test execution during development
- ✅ **HTML Reports** - Beautiful test and coverage reports

## Available Scripts

```bash
# Run tests once
bun run test:run

# Run tests in watch mode (for development)
bun run test:watch

# Run tests with coverage report
bun run test:coverage

# Run tests with UI (visual interface)
bun run test:ui

# Run all tests (watch mode)
bun run test
```

## Important: Using Bun as Package Manager

When using Bun as your package manager, **always use `bun run test` instead of `bun test`**:

```bash
# ✅ CORRECT: Uses Vitest via package.json script
bun run test

# ❌ WRONG: Uses Bun's built-in test runner (incompatible with Vitest)
bun test
```

**Why this matters:**
- `bun test` runs Bun's own test runner, which doesn't understand Vitest APIs (`vi`, `describe`, `expect` from vitest)
- `bun run test` executes the "test" script from package.json, which properly runs Vitest
- Only `bun run test` will load the vitest.config.ts and setup files correctly

**Error if you use `bun test`:**
- `vi.useFakeTimers is not a function` - Bun's test runner doesn't have Vitest's `vi` API
- `document is not defined` - Bun's test runner doesn't use the JSDOM environment from vitest.config.ts

## Configuration

The testing setup includes:

### `vitest.config.ts`
- Configured for React/TypeScript
- JSDOM environment for DOM testing
- Path aliases (`@/` for `src/`)
- Coverage configuration with v8 provider
- Excludes Electron main/preload processes from testing

### `src/test/setup.ts`
- Global test setup and mocks
- Electron API mocking for renderer process tests
- PouchDB mocking for database tests
- DOM API mocks (ResizeObserver, IntersectionObserver, etc.)
- Testing Library jest-dom matchers

## Writing Tests

### Component Tests

Create test files alongside your components using the pattern `*.test.tsx`:

```typescript
// src/components/MyComponent/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

### Utility Function Tests

Test pure functions and utilities:

```typescript
// src/utils/__tests__/myUtils.test.ts
import { describe, it, expect } from 'vitest'
import { myUtilFunction } from '../myUtils'

describe('myUtilFunction', () => {
  it('returns expected result', () => {
    expect(myUtilFunction('input')).toBe('expected output')
  })
})
```

### Mock Examples

The setup includes comprehensive mocks for:

#### Electron APIs
```typescript
// Automatically mocked in setup.ts
electron.ipcRenderer.invoke('some-channel', data)
```

#### PouchDB
```typescript
// Automatically mocked in setup.ts
import PouchDB from 'pouchdb'
```

#### Custom Mocks
```typescript
import { vi } from 'vitest'

// Mock a module
vi.mock('../path/to/module', () => ({
  default: vi.fn(),
  namedExport: vi.fn()
}))
```

## Test Organization

```
src/
├── components/
│   └── shared/
│       ├── LoadingSpinner.tsx
│       └── __tests__/
│           └── LoadingSpinner.test.tsx
├── utils/
│   ├── timeUtils.ts
│   └── __tests__/
│       └── timeUtils.test.ts
└── test/
    └── setup.ts
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report**: `coverage/index.html` - Visual coverage report
- **Text Report**: Displayed in terminal
- **JSON Report**: `coverage/coverage.json` - Machine-readable format

View the HTML coverage report:
```bash
npx vite preview --outDir coverage
```

## Best Practices

1. **Test File Naming**: Use `*.test.tsx` for components and `*.test.ts` for utilities
2. **Organize Tests**: Keep tests close to the code they test using `__tests__` folders
3. **Mock External Dependencies**: Use the provided mocks for Electron and PouchDB
4. **Test User Interactions**: Use `@testing-library/user-event` for realistic user interactions
5. **Accessibility Testing**: Use `@testing-library/jest-dom` matchers for accessibility checks

## Example Test Files

The project includes example tests:

- `src/components/shared/__tests__/LoadingSpinner.test.tsx` - React component testing
- `src/utils/__tests__/timeUtils.test.ts` - Utility function testing

These demonstrate:
- Component rendering and props testing
- CSS class and attribute assertions
- Accessibility testing
- Pure function testing with mocked timers
- Locale-independent testing patterns

## Troubleshooting

### Common Issues

1. **Module Resolution**: Use the `@/` alias for src imports
2. **Electron APIs**: All Electron APIs are mocked by default in the test environment
3. **PouchDB**: Database operations are mocked to prevent actual database calls
4. **Locale-Dependent Tests**: Write tests that work across different locales

### Debug Tests

Run tests with debugging:
```bash
# Run specific test file
bun run test LoadingSpinner.test.tsx

# Run with debug output
DEBUG=1 bun run test

# Run with verbose output
bun run test --reporter=verbose