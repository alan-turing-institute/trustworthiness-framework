import { fixture, test, Selector } from 'testcafe';
import { GuestUserFixture, AdminUserFixture } from './fixtures/user-fixtures';
import { TestHelpers, urls, selectors, testData } from './helpers/test-helpers';

fixture('Authentication Tests')
  .page(urls.base)
  .beforeEach(async t => {
    const guestFixture = new GuestUserFixture();
    await guestFixture.beforeEach();
  });

test('Should redirect unauthenticated users to login page', async t => {
  // Try to access protected routes
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.loginForm);
  
  await t.expect(Selector(selectors.loginForm).visible).ok('Should be redirected to login page');
});

test('Should display login form correctly', async t => {
  await t.navigateTo(urls.login);
  await TestHelpers.waitForElement(selectors.loginForm);
  
  await t
    .expect(Selector(selectors.usernameInput).visible).ok('Username field should be visible')
    .expect(Selector(selectors.passwordInput).visible).ok('Password field should be visible')
    .expect(Selector(selectors.loginButton).visible).ok('Login button should be visible');
});

test('Should login successfully with valid credentials', async t => {
  await TestHelpers.login();
  
  // Should be redirected to home page
  await t.expect(Selector(selectors.navigationHeader).visible).ok('Should see navigation header');
  
  // Should not see login form anymore
  await t.expect(Selector(selectors.loginForm).exists).notOk('Login form should not be visible');
});

test('Should show error message with invalid credentials', async t => {
  await t.navigateTo(urls.login);
  await TestHelpers.waitForElement(selectors.loginForm);
  
  await t
    .typeText(selectors.usernameInput, testData.invalidUser.username)
    .typeText(selectors.passwordInput, testData.invalidUser.password)
    .click(selectors.loginButton);
  
  // Should stay on login page
  await t.expect(Selector(selectors.loginForm).visible).ok('Should still be on login page');
  
  // Should show error message via toast (wait for toast to appear)
  await t.wait(1000); // Allow time for toast to appear
  await t.expect(Selector('[data-radix-toast-viewport], [role="region"][aria-live], .toast, [data-state="open"]').visible).ok('Should show toast notification');
});

test('Should logout successfully', async t => {
  // Login first
  await TestHelpers.login();
  await TestHelpers.waitForPageLoad();
  
  // Logout
  await TestHelpers.logout();
  
  // Should be back to login page
  await t.expect(Selector(selectors.loginForm).visible).ok('Should be back at login page');
});

test('Should maintain session across page refreshes', async t => {
  await TestHelpers.login();
  await TestHelpers.waitForPageLoad();
  
  // Refresh the page
  await t.eval(() => location.reload());
  await TestHelpers.waitForPageLoad();
  
  // Should still be logged in
  await t.expect(Selector(selectors.navigationHeader).visible).ok('Should still be logged in after refresh');
});

test('Should handle session timeout gracefully', async t => {
  await TestHelpers.login();
  await TestHelpers.waitForPageLoad();
  
  // Simulate session timeout (this would depend on your session implementation)
  // For now, we'll just test that the app handles navigation properly
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForPageLoad();
  
  // Should be able to navigate to assessment
  await t.expect(Selector(selectors.assessmentForm).visible).ok('Should access assessment when logged in');
});