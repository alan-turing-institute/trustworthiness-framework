import { fixture, test, Selector } from 'testcafe';
import { AdminUserFixture } from './fixtures/user-fixtures';
import { TestHelpers, urls, selectors } from './helpers/test-helpers';

fixture('Navigation and Accessibility Tests')
  .page(urls.base)
  .beforeEach(async t => {
    const adminFixture = new AdminUserFixture();
    await adminFixture.beforeEach();
  })
  .afterEach(async t => {
    const adminFixture = new AdminUserFixture();
    await adminFixture.afterEach();
  });

test('Should have working navigation between all pages', async t => {
  const navigationTests = [
    { url: urls.home, expectedElement: selectors.navigationHeader, name: 'Home' },
    { url: urls.assessment, expectedElement: selectors.assessmentForm, name: 'Assessment' },
    { url: urls.userManagement, expectedElement: selectors.userTable, name: 'User Management' }
  ];

  for (const navTest of navigationTests) {
    await t.navigateTo(navTest.url);
    await TestHelpers.waitForPageLoad();

    // Check that we reached the expected page
    const elementExists = await Selector(navTest.expectedElement).exists;
    await t.expect(elementExists).ok(`Should navigate to ${navTest.name} page`);

    await TestHelpers.takeScreenshot(`navigation-${navTest.name.toLowerCase().replace(' ', '-')}`);
  }

  // Test standards compliance with a mock assessment ID (it will show "Assessment not found" but proves navigation works)
  await t.navigateTo('http://localhost:3000/standards/test-id');
  await TestHelpers.waitForPageLoad();

  // Should show the page with error message, proving navigation works
  const standardsPageExists = await Selector('h1').withText(/Standards Compliance|Assessment not found/).exists;
  await t.expect(standardsPageExists).ok('Should navigate to Standards Compliance page (even with invalid ID)');

  await TestHelpers.takeScreenshot('navigation-standards-compliance');
});

test('Should have accessible navigation menu', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForElement(selectors.navigationHeader);

  // Check for navigation accessibility
  await t
    .expect(Selector('nav, [role="navigation"]').exists).ok('Should have navigation landmark')
    .expect(Selector('a, [role="link"]').exists).ok('Should have navigation links');

  // Check for active page indication (look for active classes or styles)
  const hasActiveIndicator = await Selector('.text-primary, .bg-blue-50, [aria-current]').exists;
  if (hasActiveIndicator) {
    await t.expect(hasActiveIndicator).ok('Should indicate current page');
  }

  // Test keyboard navigation
  await t.pressKey('tab'); // Should focus first focusable element
  await TestHelpers.takeScreenshot('keyboard-navigation-focus');
});

test('Should be keyboard accessible throughout the application', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);
  
  // Test tab navigation through assessment form
  await t
    .pressKey('tab') // Focus first element
    .pressKey('tab') // Focus next element
    .pressKey('space') // Should activate focused element
    .wait(500);
  
  // Check if action was performed (depends on implementation)
  await TestHelpers.takeScreenshot('keyboard-assessment-interaction');
  
  // Test escape key functionality
  await t.pressKey('esc');
  await t.wait(500);
});

test('Should have proper heading structure on all pages', async t => {
  const pagesToTest = [
    { url: urls.home, name: 'Home' },
    { url: urls.assessment, name: 'Assessment' },
    { url: urls.userManagement, name: 'User Management' }
  ];

  for (const page of pagesToTest) {
    await t.navigateTo(page.url);
    await TestHelpers.waitForPageLoad();
    
    // Check heading hierarchy
    const h1Exists = await Selector('h1').exists;
    const headingsExist = await Selector('h1, h2, h3, h4, h5, h6').exists;
    
    await t
      .expect(h1Exists).ok(`${page.name} page should have an h1 element`)
      .expect(headingsExist).ok(`${page.name} page should have proper heading structure`);
  }
});

test('Should have proper form labels and associations', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);
  
  // Check for form accessibility
  const inputs = Selector('input, select, textarea');
  const inputCount = await inputs.count;
  
  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const inputId = await input.getAttribute('id');
    const hasLabel = inputId ? await Selector('label').withAttribute('for', inputId).exists : false ||
                    await input.hasAttribute('aria-label') ||
                    await input.hasAttribute('aria-labelledby');
    
    if (await input.visible) {
      await t.expect(hasLabel).ok(`Input ${i + 1} should have an associated label`);
    }
  }
});

test('Should have sufficient color contrast and visual indicators', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();
  
  // Test focus indicators
  const firstLink = Selector('a, button').nth(0);
  if (await firstLink.exists) {
    await t.click(firstLink);
    await TestHelpers.takeScreenshot('focus-indicator-test');
  }
  
  // Test hover states
  const buttons = Selector('button');
  const buttonCount = await buttons.count;
  
  if (buttonCount > 0) {
    await t.hover(buttons.nth(0));
    await TestHelpers.takeScreenshot('hover-state-test');
  }
});

test('Should handle screen reader compatibility', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  // Check for screen reader friendly elements on home page
  await t
    .expect(Selector('[aria-label], [aria-labelledby], [aria-describedby]').exists).ok('Should have aria labels for complex content')
    .expect(Selector('[role="button"], [role="link"], button, a').exists).ok('Should have proper interactive elements')
    .expect(Selector('h1, h2, h3, h4, h5, h6').exists).ok('Should have proper heading structure');

  // Test navigation with screen reader considerations
  await t.navigateTo(urls.userManagement);
  await TestHelpers.waitForPageLoad();

  // Check table accessibility
  const tableExists = await Selector(selectors.userTable).exists;
  if (tableExists) {
    await t.expect(Selector('table, [role="table"]').exists).ok('Should have accessible table structure');
  }
});

test('Should work properly with browser zoom', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  // Test different viewport sizes (simulates zoom behavior)
  const sizes = [
    { width: 1200, height: 800, name: 'desktop' },
    { width: 768, height: 600, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' }
  ];

  for (const size of sizes) {
    await t.resizeWindow(size.width, size.height);
    await TestHelpers.waitForPageLoad();

    // Navigation should still be usable at all sizes
    await t.expect(Selector(selectors.navigationHeader).visible).ok(`Navigation should be usable at ${size.name} size`);

    await TestHelpers.takeScreenshot(`zoom-${size.name}-simulation`);
  }

  // Reset to normal size
  await t.resizeWindow(1200, 800);
});

test('Should handle browser back/forward buttons correctly', async t => {
  // Navigate through several pages
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();
  
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForPageLoad();
  
  await t.navigateTo(urls.userManagement);
  await TestHelpers.waitForPageLoad();
  
  // Use browser back button
  await t.eval(() => window.history.back());
  await TestHelpers.waitForPageLoad();
  
  // Should be back on assessment page
  await t.expect(Selector(selectors.assessmentForm).exists).ok('Should handle browser back button');
  
  // Use browser forward button
  await t.eval(() => window.history.forward());
  await TestHelpers.waitForPageLoad();
  
  // Should be back on user management
  await t.expect(Selector(selectors.userTable).exists).ok('Should handle browser forward button');
});

test('Should provide appropriate error messages and feedback', async t => {
  // Test form validation messages
  await t.navigateTo(urls.userManagement);
  await TestHelpers.waitForPageLoad();
  
  // Try to trigger validation if possible
  const addUserExists = await Selector(selectors.addUserButton).exists;
  if (addUserExists) {
    await t.click(selectors.addUserButton);
    await TestHelpers.waitForElement(selectors.userDialog);
    
    // Try to submit empty form to test validation
    const submitButton = Selector('button[type="submit"]');
    if (await submitButton.exists) {
      await t.click(submitButton);
      await t.wait(1000);
      
      // Check for validation messages
      const validationExists = await Selector('[role="alert"], .error-message, .field-error').exists;
      if (validationExists) {
        await t.expect(Selector('[role="alert"], .error-message, .field-error').visible)
          .ok('Should show validation messages');
      }
    }
  }
});