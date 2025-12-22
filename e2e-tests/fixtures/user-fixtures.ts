import { t, Selector } from 'testcafe';
import { TestHelpers, urls, selectors, testData } from '../helpers/test-helpers';

/**
 * Base fixture class that provides common functionality
 */
export class BaseFixture {
  /**
   * Setup method called before each test
   */
  async beforeEach() {
    await t.maximizeWindow();
    await TestHelpers.waitForPageLoad();
  }

  /**
   * Cleanup method called after each test
   */
  async afterEach() {
    // Take screenshot on failure (automatically handled by TestCafe config)
    // Clean up any open modals or dialogs
    const modalExists = await Selector(selectors.modal).exists;
    if (modalExists) {
      await t.pressKey('esc');
    }
  }
}

/**
 * Fixture for unauthenticated user tests
 */
export class GuestUserFixture extends BaseFixture {
  async beforeEach() {
    await super.beforeEach();
    await t.navigateTo(urls.base);
  }
}

/**
 * Fixture for authenticated admin user tests
 */
export class AdminUserFixture extends BaseFixture {
  async beforeEach() {
    await super.beforeEach();
    await TestHelpers.login(testData.validUser.username, testData.validUser.password);
    await TestHelpers.waitForPageLoad();
  }

  async afterEach() {
    await super.afterEach();
    // Logout if still logged in
    const isLoggedIn = await TestHelpers.isLoggedIn();
    if (isLoggedIn) {
      await TestHelpers.logout();
    }
  }
}

/**
 * Fixture for regular user tests (non-admin)
 */
export class RegularUserFixture extends BaseFixture {
  private readonly regularUser = {
    username: 'user',
    password: 'user123'
  };

  async beforeEach() {
    await super.beforeEach();
    await TestHelpers.login(this.regularUser.username, this.regularUser.password);
    await TestHelpers.waitForPageLoad();
  }

  async afterEach() {
    await super.afterEach();
    // Logout if still logged in
    const isLoggedIn = await TestHelpers.isLoggedIn();
    if (isLoggedIn) {
      await TestHelpers.logout();
    }
  }
}

/**
 * Fixture for assessment completion tests
 */
export class AssessmentFixture extends AdminUserFixture {
  async createNewAssessment() {
    await t.navigateTo(urls.assessment);
    await TestHelpers.waitForElement(selectors.assessmentForm);
    return 'test-assessment-' + Date.now();
  }

  async quickCompleteAssessmentWithResults(yesPercentage = 0.7) {
    // Navigate to assessment page and create assessment
    await t.navigateTo(urls.assessment);
    await TestHelpers.waitForElement(selectors.assessmentForm);

    // Fill in system name to enable creating
    const systemNameInput = Selector('input[placeholder*="system name"], input[id*="systemName"], input[name*="systemName"]');
    const systemNameExists = await systemNameInput.exists;
    if (systemNameExists) {
      await t.typeText(systemNameInput, 'Quick Test Assessment', { replace: true });

      // Click Create Assessment button (not Save, since it's a new assessment)
      const createButton = Selector('button').withText(/Create Assessment/i);
      const createExists = await createButton.exists;
      if (createExists) {
        await t.click(createButton);
        await t.wait(3000); // Wait for save and page redirect (window.location.href)
      }
    }

    // Wait for URL to contain assessment ID (with retry logic)
    let assessmentId = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const currentUrl = await t.eval(() => window.location.pathname);
      const urlMatch = currentUrl.match(/\/assessment\/([a-f0-9-]+)/);
      if (urlMatch && urlMatch[1]) {
        assessmentId = urlMatch[1];
        console.log(`Found assessment ID: ${assessmentId}`);
        break;
      }
      console.log(`Attempt ${attempt + 1}: Waiting for assessment ID in URL... Current: ${currentUrl}`);
      await t.wait(500);
    }

    // If we still don't have an ID, throw error
    if (!assessmentId) {
      const finalUrl = await t.eval(() => window.location.pathname);
      throw new Error(`Failed to get valid assessment ID from URL. Current URL: ${finalUrl}`);
    }

    // Wait for the assessment form to be ready
    await TestHelpers.waitForElement(selectors.assessmentForm);

    // Now we should have an assessment with ID, complete it quickly
    const questionCount = await TestHelpers.quickCompleteAssessment(yesPercentage);

    // Navigate to results page
    console.log(`Navigating to results: ${urls.base}/results/${assessmentId}`);
    await t.navigateTo(`${urls.base}/results/${assessmentId}`);

    // Wait for results page to load
    await TestHelpers.waitForElement(selectors.resultsContainer);

    return {
      assessmentId,
      questionCount,
      yesPercentage
    };
  }

  async completeAssessmentWithResults(yesPercentage = 0.7) {
    // Navigate to assessment page and create assessment
    await t.navigateTo(urls.assessment);
    await TestHelpers.waitForElement(selectors.assessmentForm);

    // Fill in system name
    const systemNameInput = Selector('input[placeholder*="system name"], input[id*="systemName"], input[name*="systemName"]');
    await t.typeText(systemNameInput, 'Complete Test Assessment', { replace: true });

    // Click Create Assessment button
    const createButton = Selector('button').withText(/Create Assessment/i);
    await t.click(createButton);
    await t.wait(3000); // Wait for save and page redirect (window.location.href)

    // Wait for URL to contain assessment ID (with retry logic)
    let assessmentId = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const currentUrl = await t.eval(() => window.location.pathname);
      const urlMatch = currentUrl.match(/\/assessment\/([a-f0-9-]+)/);
      if (urlMatch && urlMatch[1]) {
        assessmentId = urlMatch[1];
        console.log(`Found assessment ID: ${assessmentId}`);
        break;
      }
      console.log(`Attempt ${attempt + 1}: Waiting for assessment ID in URL... Current: ${currentUrl}`);
      await t.wait(500);
    }

    // If we still don't have an ID, throw error
    if (!assessmentId) {
      const finalUrl = await t.eval(() => window.location.pathname);
      throw new Error(`Failed to get valid assessment ID from URL. Current URL: ${finalUrl}`);
    }

    // Wait for the assessment form to be ready
    await TestHelpers.waitForElement(selectors.assessmentForm);

    const questionCount = await TestHelpers.completeAssessment(yesPercentage);

    // Navigate to results page
    console.log(`Navigating to results: ${urls.base}/results/${assessmentId}`);
    await t.navigateTo(`${urls.base}/results/${assessmentId}`);

    // Wait for results page to load
    await TestHelpers.waitForElement(selectors.resultsContainer);

    return {
      assessmentId,
      questionCount,
      yesPercentage
    };
  }
}

/**
 * Fixture for user management tests
 */
export class UserManagementFixture extends AdminUserFixture {
  async navigateToUserManagement() {
    await t.navigateTo(urls.userManagement);
    await TestHelpers.waitForElement(selectors.userTable);
  }

  async createNewUser(userData: { username: string; password: string; role: string }) {
    await this.navigateToUserManagement();
    await t.click(selectors.addUserButton);
    await TestHelpers.waitForElement(selectors.userDialog);
    
    // Fill user form (selectors would need to be more specific)
    await t
      .typeText('input[name="username"]', userData.username)
      .typeText('input[name="password"]', userData.password)
      .click('button[type="submit"]');
      
    await TestHelpers.waitForPageLoad();
  }
}