# End-to-End Testing Documentation

## Overview

This directory contains end-to-end (E2E) tests for the PillarAssess application using TestCafe. These tests simulate real user interactions to ensure the application works correctly from a user's perspective.

## Test Structure

```
e2e-tests/
├── fixtures/           # Test fixtures for different user types
├── helpers/            # Utility functions and constants
├── reports/            # Test execution reports
├── screenshots/        # Test screenshots (automatically generated)
├── videos/            # Test videos (automatically generated on failures)
├── auth.test.ts       # Authentication and login tests
├── assessment.test.ts # Assessment workflow tests
├── results.test.ts    # Results page functionality tests
└── navigation.test.ts # Navigation and accessibility tests
```

## Test Suites

### 1. Authentication Tests (`auth.test.ts`)
Tests user authentication functionality:
- Login with valid/invalid credentials
- Session management
- Logout functionality
- Redirect behavior for unauthenticated users
- Session persistence across page refreshes

### 2. Assessment Workflow Tests (`assessment.test.ts`)
Tests the core assessment functionality:
- Assessment form display and navigation
- Question answering and validation
- Progress indication
- Assessment completion and submission
- Error handling during assessment

### 3. Results Page Tests (`results.test.ts`)
Tests the results display and interaction:
- Results visualization (polar charts)
- Perspective switching (operational/design/both)
- Pillar drill-down functionality
- Capping alerts and tooltips
- Export and share features
- Responsive design

### 4. Navigation and Accessibility Tests (`navigation.test.ts`)
Tests navigation and accessibility features:
- Navigation between pages
- Keyboard accessibility
- Screen reader compatibility
- Proper heading structure
- Form labeling and associations
- Color contrast and visual indicators
- Browser back/forward button handling

## Running Tests

### Prerequisites
1. Ensure the application is running on `http://localhost:3000`
2. Database should be set up with test data
3. Valid user credentials available (default: admin/admin123)

### Test Commands

```bash
# Run all tests in Chrome
npm run test:e2e

# Run tests in headless mode (faster, no browser window)
npm run test:e2e:headless

# Run tests in different browsers
npm run test:e2e:firefox
npm run test:e2e:safari
npm run test:e2e:all

# Run tests with live mode (for development)
npm run test:e2e:dev
```

### Development Mode
Use live mode for test development:
```bash
npm run test:e2e:dev
```
This keeps the browser open and re-runs tests when files change.

## Test Configuration

The tests are configured via `.testcaferc.json`:
- **Screenshots**: Automatically taken on test failures
- **Videos**: Recorded for failed tests only
- **Reports**: Generated in JSON and spec formats
- **Timeouts**: Configured for selector, assertion, and page load
- **Concurrency**: Set to 1 for stability

## Test Data and Fixtures

### User Fixtures
- `GuestUserFixture`: For unauthenticated user tests
- `AdminUserFixture`: For admin user tests
- `RegularUserFixture`: For regular user tests
- `AssessmentFixture`: For assessment-specific tests
- `FrameworkFixture`: For framework management tests

### Test Data
Configured in `helpers/test-helpers.ts`:
- User credentials
- Sample assessment data
- Framework test data
- Common selectors and URLs

## Best Practices

### 1. Test Independence
- Each test should be independent and not rely on other tests
- Use fixtures to set up required state
- Clean up after each test

### 2. Selectors
- Use `data-testid` attributes for reliable element selection
- Avoid using CSS classes or IDs that might change
- Use semantic selectors when possible

### 3. Waiting Strategies
- Use `TestHelpers.waitForElement()` instead of arbitrary waits
- Wait for specific conditions rather than time-based waits
- Handle loading states properly

### 4. Error Handling
- Tests should handle various error conditions gracefully
- Use try-catch blocks for operations that might fail
- Provide meaningful error messages

### 5. Screenshots and Documentation
- Take screenshots at key points for documentation
- Use descriptive names for screenshots
- Document any special test setup requirements

## Troubleshooting

### Common Issues

#### Tests Failing Due to Timing
- Increase timeouts in `.testcaferc.json`
- Add more specific wait conditions
- Check for loading states

#### Element Not Found
- Verify selectors are correct
- Check if elements are properly rendered
- Ensure page has loaded completely

#### Browser Compatibility
- Some features might not work in all browsers
- Use feature detection in tests
- Test in multiple browsers regularly

#### Test Data Issues
- Ensure database is in correct state
- Check user credentials
- Verify test data is available

### Debugging Tests

1. **Use Live Mode**: Run tests with `--live` flag to keep browser open
2. **Add Console Logs**: Use `console.log()` in test code for debugging
3. **Take Screenshots**: Add `TestHelpers.takeScreenshot()` at failure points
4. **Step Through**: Use `--debug-on-fail` flag to pause on failures

## Continuous Integration

For CI/CD integration:

```bash
# Headless mode for CI
npm run test:e2e:headless

# With specific browser
testcafe chrome:headless e2e-tests/ --reporter json > test-results.json
```

### CI Configuration Example
```yaml
- name: Run E2E Tests
  run: |
    npm run dev:full &
    sleep 30  # Wait for app to start
    npm run test:e2e:headless
```

## Test Coverage Areas

### Functional Testing
- ✅ User authentication and authorization
- ✅ Assessment workflow and navigation
- ✅ Results calculation and display
- ✅ Data persistence and session management

### UI/UX Testing
- ✅ Responsive design across screen sizes
- ✅ Interactive elements and hover states
- ✅ Loading states and error handling
- ✅ Visual regression detection

### Accessibility Testing
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ ARIA labels and roles
- ✅ Color contrast and visual indicators
- ✅ Form labeling and validation

### Browser Compatibility
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (macOS)
- ⚠️ Edge (requires additional setup)

## Extending Tests

### Adding New Tests
1. Create test file in appropriate category
2. Import required fixtures and helpers
3. Follow existing naming conventions
4. Add documentation for new test scenarios

### Adding New Selectors
1. Add `data-testid` attributes to components
2. Update `selectors` object in `test-helpers.ts`
3. Use semantic and descriptive names

### Adding New Fixtures
1. Create fixture class extending `BaseFixture`
2. Implement setup and teardown methods
3. Add fixture-specific helper methods
4. Document fixture usage

## Maintenance

### Regular Tasks
- Review and update selectors when UI changes
- Update test data as application evolves
- Monitor test execution times and optimize
- Update browser versions and TestCafe
- Review and clean up old screenshots/videos

### Performance Optimization
- Use headless mode for faster execution
- Minimize unnecessary waits
- Parallelize tests where possible
- Clean up test artifacts regularly

## Reporting Issues

When reporting test failures:
1. Include test name and browser
2. Attach screenshots and videos
3. Provide steps to reproduce
4. Include test environment details
5. Check recent code changes

---

For more information about TestCafe, visit: https://testcafe.io/documentation/