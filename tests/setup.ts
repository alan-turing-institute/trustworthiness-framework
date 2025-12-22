import '@testing-library/jest-dom'

// Global test setup
global.console = {
  ...console,
  // Uncomment to ignore specific console outputs during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}