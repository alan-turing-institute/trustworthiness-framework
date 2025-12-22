import { t, Selector } from 'testcafe';

/**
 * Common URLs for the application
/**
 * Common URLs for the application
 */
export const urls = {
  base: 'http://localhost:3000',
  login: 'http://localhost:3000/login',
  home: 'http://localhost:3000/',
  assessment: 'http://localhost:3000/assessment',
  results: 'http://localhost:3000/results',
  userManagement: 'http://localhost:3000/users',
  standardsCompliance: 'http://localhost:3000/standards-compliance'
};

/**
 * Common selectors for UI elements
 */
export const selectors = {
  // Navigation
  navigationHeader: '[data-testid="navigation-header"]',
  navLogo: '[data-testid="nav-logo"]',
  navLinks: '[data-testid="nav-links"]',
  userMenu: '[data-testid="user-menu"]',
  
  // Authentication
  loginForm: 'form',
  usernameInput: '[data-testid="input-username"]',
  passwordInput: '[data-testid="input-password"]',
  loginButton: '[data-testid="button-login"]',
  logoutButton: '[data-testid="logout-button"]',
  
  // Assessment Form
  assessmentForm: '[data-testid="assessment-form"]',
  questionCard: '[data-testid="question-card"]',
  yesButton: '[data-testid="yes-button"]',
  noButton: '[data-testid="no-button"]',
  previousButton: '[data-testid="previous-button"]',
  nextButton: '[data-testid="next-button"]',
  submitButton: '[data-testid="submit-button"]',
  progressBar: '[data-testid="progress-bar"]',
  
  // Results Page
  resultsContainer: '[data-testid="results-container"]',
  polarChart: '[data-testid="polar-chart"]',
  perspectiveSelect: '[data-testid="perspective-select"]',
  pillarBreakdown: '[data-testid="pillar-breakdown"]',
  mechanismCard: '[data-testid="mechanism-card"]',
  cappingAlert: '[data-testid="capping-alert"]',
  exportButton: '[data-testid="export-button"]',
  shareButton: '[data-testid="share-button"]',

  // User Management
  userTable: '[data-testid="user-table"]',
  addUserButton: '[data-testid="button-create-user"]',
  userDialog: '[role="dialog"]',
  
  // Common UI elements
  modal: '[role="dialog"]',
  alert: '[role="alert"]',
  button: 'button',
  input: 'input',
  select: 'select',
  textarea: 'textarea',
  tooltip: '[role="tooltip"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  errorMessage: '[data-testid="error-message"]'
};

/**
 * Test data for different scenarios
 */
export const testData = {
  // User credentials
  validUser: {
    username: 'admin',
    password: 'admin123'
  },
  
  invalidUser: {
    username: 'invalid',
    password: 'wrong'
  },
  
  // Assessment data
  sampleAssessment: {
    name: 'E2E Test Assessment',
    description: 'Test assessment created by automated tests'
  },
  
  // Framework data
  sampleFramework: {
    name: 'Test Framework',
    version: '1.0.0'
  }
};

/**
 * Helper functions for common test actions
 */
export class TestHelpers {
  /**
   * Wait for an element to be visible and stable
   */
  static async waitForElement(selector: string, timeout = 10000) {
    await t.expect(Selector(selector).exists).ok('Element should exist', { timeout });
    await t.expect(Selector(selector).visible).ok('Element should be visible', { timeout });
  }

  /**
   * Login to the application
   */
  static async login(username = testData.validUser.username, password = testData.validUser.password) {
    await t.navigateTo(urls.login);
    await this.waitForElement(selectors.loginForm);
    
    await t
      .typeText(selectors.usernameInput, username, { replace: true })
      .typeText(selectors.passwordInput, password, { replace: true })
      .click(selectors.loginButton);
      
    // Wait for navigation to complete
    await t.expect(Selector(selectors.navigationHeader).exists).ok('Should be logged in');
  }

  /**
   * Logout from the application
   */
  static async logout() {
    try {
      // Try to click the user menu first to open the dropdown
      await t.click(selectors.userMenu);
      await t.wait(500); // Wait for dropdown to open

      // Look for logout button
      const logoutExists = await Selector(selectors.logoutButton).exists;
      if (logoutExists) {
        await t.click(selectors.logoutButton);
      } else {
        // Alternative: navigate directly to logout URL
        await t.navigateTo('/api/logout');
      }

      // Wait for redirect to complete
      await t.wait(1000);
    } catch (error) {
      // Fallback: navigate directly to logout URL
      console.log('Logout click failed, trying direct navigation');
      await t.navigateTo('/api/logout');
      await t.wait(1000);
    }
    
    // Check if we're at the login page by looking for login elements
    await TestHelpers.waitForElement(selectors.usernameInput, 10000);
  }

  /**
   * Take a screenshot with a descriptive name
   */
  static async takeScreenshot(name: string) {
    await t.takeScreenshot(name);
  }

  /**
   * Wait for page to load completely
   */
  static async waitForPageLoad() {
    await t.wait(1000); // Basic wait for animations
    await t.expect(Selector(selectors.loadingSpinner).exists).notOk('Loading should be complete', { timeout: 30000 });
  }

  /**
   * Check if user is logged in
   */
  static async isLoggedIn(): Promise<boolean> {
    const navExists = await Selector(selectors.navigationHeader).exists;
    return navExists;
  }

  /**
   * Quick assessment completion for testing - only answers enough questions to generate results
   */
  static async quickCompleteAssessment(yesPercentage = 0.7) {
    await this.waitForElement(selectors.assessmentForm);

    let questionCount = 0;

    // Only process first 2 pillars for quick testing
    const pillarButtons = Selector('[data-testid="pillar-button"]');
    const pillarCount = Math.min(2, await pillarButtons.count);
    console.log(`Quick completion: Found ${pillarCount} pillars to process`);

    for (let pillarIndex = 0; pillarIndex < pillarCount; pillarIndex++) {
      console.log(`Quick processing pillar ${pillarIndex + 1}/${pillarCount}`);

      const pillarButton = pillarButtons.nth(pillarIndex);
      const pillarButtonExists = await pillarButton.exists;

      if (pillarButtonExists) {
        await t.click(pillarButton);
        await t.wait(1000);

        // Only process first 3 mechanisms for speed
        const mechanismButtons = Selector('[data-testid="mechanism-button"]');
        const mechanismCount = Math.min(3, await mechanismButtons.count);
        console.log(`Quick completion: Found ${mechanismCount} mechanisms in pillar ${pillarIndex + 1}`);

        // Process each mechanism
        for (let mechIndex = 0; mechIndex < mechanismCount; mechIndex++) {
          const mechButton = mechanismButtons.nth(mechIndex);
          if (await mechButton.exists) {
            // Check if mechanism is already open
            const isOpen = await mechButton.parent().getAttribute('data-state') === 'open';
            
            // If not open, click to expand it
            if (!isOpen) {
              await t.click(mechButton);
              await t.wait(300);
            }

            // Answer up to 5 metrics per mechanism for quick completion
            let metricsAnswered = 0;
            const maxMetricsPerMechanism = 5;

            while (metricsAnswered < maxMetricsPerMechanism) {
              // Look for yes/no buttons in the current view
              const yesButton = Selector('[data-testid="yes-button"]').filterVisible();
              const noButton = Selector('[data-testid="no-button"]').filterVisible();

              const yesExists = await yesButton.exists;
              const noExists = await noButton.exists;

              if (yesExists || noExists) {
                questionCount++;
                metricsAnswered++;

                const shouldAnswerYes = Math.random() < yesPercentage;

                if (shouldAnswerYes && yesExists) {
                  await t.click(yesButton);
                } else if (noExists) {
                  await t.click(noButton);
                }
                await t.wait(100); // Shorter delay for speed

                // Try to navigate to next metric
                const nextButton = Selector('button').withText(/next/i).filterVisible();
                const nextExists = await nextButton.exists;
                const nextDisabled = nextExists ? await nextButton.hasAttribute('disabled') : true;

                if (nextExists && !nextDisabled) {
                  await t.click(nextButton);
                  await t.wait(100);
                } else {
                  // No more metrics in this mechanism
                  break;
                }
              } else {
                // No metrics found
                break;
              }
            }

            console.log(`Quick completion: Mechanism ${mechIndex + 1} answered ${metricsAnswered} metrics`);
          }
        }
      }
    }

    console.log(`Quick assessment complete: answered ${questionCount} questions`);
    return questionCount;
  }

  /**
   * Fill out assessment questions with random answers across all pillars
   */
  static async completeAssessment(yesPercentage = 0.7) {
    await this.waitForElement(selectors.assessmentForm);

    let questionCount = 0;

    // First, get all pillar navigation buttons
    const pillarButtons = Selector('[data-testid="pillar-button"]');

    const pillarCount = await pillarButtons.count;
    console.log(`Found ${pillarCount} pillars to process`);

    // Process each pillar
    for (let pillarIndex = 0; pillarIndex < pillarCount; pillarIndex++) {
      console.log(`Processing pillar ${pillarIndex + 1}/${pillarCount}`);

      // Click on the pillar navigation button
      const pillarButton = pillarButtons.nth(pillarIndex);
      const pillarButtonExists = await pillarButton.exists;

      if (pillarButtonExists) {
        await t.click(pillarButton);
        await t.wait(1000); // Wait for pillar content to load

        // Get all mechanism buttons for this pillar
        const mechanismButtons = Selector('[data-testid="mechanism-button"]');
        const mechanismCount = await mechanismButtons.count;
        console.log(`Found ${mechanismCount} mechanisms in pillar ${pillarIndex + 1}`);

        // Process each mechanism
        for (let mechIndex = 0; mechIndex < mechanismCount; mechIndex++) {
          const mechButton = mechanismButtons.nth(mechIndex);
          const mechButtonExists = await mechButton.exists;

          if (mechButtonExists) {
            // Check if mechanism is already open
            const isOpen = await mechButton.parent().getAttribute('data-state') === 'open';
            
            // If not open, click to expand it
            if (!isOpen) {
              await t.click(mechButton);
              await t.wait(500); // Wait for expansion animation
            }

            // Now answer metrics in this mechanism
            // The UI shows one metric at a time, so we need to navigate through them
            let metricsAnswered = 0;
            let hasMoreMetrics = true;

            while (hasMoreMetrics) {
              // Look for yes/no buttons in the current view
              const yesButton = Selector('[data-testid="yes-button"]').filterVisible();
              const noButton = Selector('[data-testid="no-button"]').filterVisible();

              const yesExists = await yesButton.exists;
              const noExists = await noButton.exists;

              if (yesExists || noExists) {
                questionCount++;
                metricsAnswered++;

                // Answer randomly based on yesPercentage
                const shouldAnswerYes = Math.random() < yesPercentage;

                if (shouldAnswerYes && yesExists) {
                  await t.click(yesButton);
                  console.log(`Mechanism ${mechIndex + 1}, Metric ${metricsAnswered}: Answered YES`);
                } else if (noExists) {
                  await t.click(noButton);
                  console.log(`Mechanism ${mechIndex + 1}, Metric ${metricsAnswered}: Answered NO`);
                }

                await t.wait(300); // Small delay to allow auto-save

                // Try to navigate to next metric
                const nextButton = Selector('button').withText(/next/i).filterVisible();
                const nextExists = await nextButton.exists;
                const nextDisabled = nextExists ? await nextButton.hasAttribute('disabled') : true;

                if (nextExists && !nextDisabled) {
                  await t.click(nextButton);
                  await t.wait(300);
                } else {
                  // No more metrics in this mechanism
                  hasMoreMetrics = false;
                }
              } else {
                // No metrics found (might be excluded or filtered)
                hasMoreMetrics = false;
              }

              // Safety limit to prevent infinite loops
              if (metricsAnswered > 100) {
                console.log(`Safety limit reached for mechanism ${mechIndex + 1}`);
                hasMoreMetrics = false;
              }
            }

            console.log(`Mechanism ${mechIndex + 1}: answered ${metricsAnswered} metrics`);
          }
        }

        console.log(`Completed pillar ${pillarIndex + 1}`);
      }
    }

    console.log(`Assessment complete: answered ${questionCount} total questions`);
    return questionCount;
  }

  /**
   * Check for accessibility issues (basic checks)
   */
  static async checkAccessibility() {
    // Check for basic accessibility requirements
    const hasHeadings = await Selector('h1, h2, h3, h4, h5, h6').exists;
    const hasLabels = await Selector('label').exists;
    const hasButtons = await Selector('button, [role="button"]').exists;
    
    await t
      .expect(hasHeadings).ok('Page should have heading elements')
      .expect(hasLabels).ok('Form elements should have labels')
      .expect(hasButtons).ok('Interactive elements should be properly marked');
  }

  /**
   * Check responsive design at different screen sizes
   */
  static async testResponsiveness() {
    // Desktop
    await t.resizeWindow(1200, 800);
    await this.waitForPageLoad();

    // Tablet
    await t.resizeWindow(768, 600);
    await this.waitForPageLoad();

    // Mobile
    await t.resizeWindow(375, 667);
    await this.waitForPageLoad();

    // Reset to desktop
    await t.resizeWindow(1200, 800);
  }

  /**
   * Verify no console errors (basic check)
   */
  static async checkConsoleErrors() {
    // Note: TestCafe doesn't have direct console access like Playwright
    // But we can check for visible error messages
    const errorExists = await Selector(selectors.errorMessage).exists;
    await t.expect(errorExists).notOk('No error messages should be visible');
  }
}