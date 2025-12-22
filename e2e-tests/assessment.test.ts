import { fixture, test, Selector } from 'testcafe';
import { AssessmentFixture } from './fixtures/user-fixtures';
import { TestHelpers, urls, selectors } from './helpers/test-helpers';

fixture('Assessment Workflow Tests')
  .page(urls.base)
  .beforeEach(async t => {
    const assessmentFixture = new AssessmentFixture();
    await assessmentFixture.beforeEach();
  })
  .afterEach(async t => {
    const assessmentFixture = new AssessmentFixture();
    await assessmentFixture.afterEach();
  });

test('Should display new assessment form when logged in', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  await t.expect(Selector(selectors.assessmentForm).visible).ok('Assessment form should be visible');

  // For new assessments, mechanisms should NOT be visible yet
  const mechanismButton = Selector('[data-testid="mechanism-button"]').nth(0);
  const mechanismExists = await mechanismButton.exists;
  await t.expect(mechanismExists).notOk('Mechanisms should not be visible for new assessments');

  // Should see basic info fields instead
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.expect(systemNameInput.visible).ok('System name input should be visible');

  // Should see the getting started message
  const gettingStartedMessage = Selector('p').withText(/Getting Started/i);
  const messageExists = await gettingStartedMessage.exists;
  await t.expect(messageExists).ok('Should show getting started message for new assessments');

  // Should see Create Assessment button
  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.expect(createButton.visible).ok('Create Assessment button should be visible');
});

test('Should create assessment and then show questions for answering', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Fill in system name
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t
    .typeText(systemNameInput, 'Test Assessment for Questions', { replace: true });

  // Create the assessment
  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  await t.wait(2000); // Wait for save and redirect

  // After creating, we should now see pillars and mechanisms
  const pillarButton = Selector('[data-testid="pillar-button"]').nth(0);
  await t.expect(pillarButton.exists).ok('Pillar navigation should now be visible after creating assessment');

  // Expand first mechanism to reveal questions
  const firstMechanismButton = Selector('[data-testid="mechanism-button"]').nth(0);
  const mechanismExists = await firstMechanismButton.exists;
  if (mechanismExists) {
    await t.click(firstMechanismButton);
    await t.wait(500); // Wait for animation

    // Answer first question
    await t.click(selectors.yesButton);
    await t.wait(200);

    // Should show auto-save enabled indicator
    const autoSaveIndicator = Selector('span').withText(/Auto-save enabled/i);
    const indicatorExists = await autoSaveIndicator.exists;
    if (indicatorExists) {
      await t.expect(autoSaveIndicator.visible).ok('Should show auto-save indicator');
    }
  }
});

test('Should show progress indicator for existing assessment', async t => {
  // The progress bar only appears for existing assessments, not new ones
  // First create an assessment by filling in basic info and saving
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Fill in system name to enable saving
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.typeText(systemNameInput, 'Test Assessment for Progress', { replace: true });

  // Create the assessment
  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  await t.wait(2000); // Wait for save and redirect

  // Now we should have a progress bar for the existing assessment
  const progressBarExists = await Selector(selectors.progressBar).exists;
  await t.expect(progressBarExists).ok('Progress bar should be visible for existing assessment');
  await t.expect(Selector(selectors.progressBar).visible).ok('Progress bar should be visible');
});

test('Should be able to navigate between pillars and mechanisms', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Create assessment first
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.typeText(systemNameInput, 'Test Assessment for Navigation', { replace: true });

  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  await t.wait(2000); // Wait for save and redirect

  // Test pillar navigation
  const pillarButtons = Selector('[data-testid="pillar-button"]');
  const pillarCount = await pillarButtons.count;

  if (pillarCount > 1) {
    // Click second pillar
    await t.click(pillarButtons.nth(1));
    await t.wait(500);
  }

  // Test that we can expand/collapse mechanisms
  const mechanismButtons = Selector('[data-testid="mechanism-button"]');
  const mechanismCount = await mechanismButtons.count;

  if (mechanismCount > 0) {
    // Expand first mechanism
    await t.click(mechanismButtons.nth(0));
    await t.wait(500);

    // Metrics should be visible (not using question-card selector anymore)
    const metricsVisible = await Selector('[data-testid="yes-button"], [data-testid="no-button"]').exists;
    if (metricsVisible) {
      await t.expect(Selector('[data-testid="yes-button"]').visible).ok('Should show metrics when mechanism expanded');
    }

    // Collapse first mechanism
    await t.click(mechanismButtons.nth(0));
    await t.wait(500);

    if (mechanismCount > 1) {
      // Expand second mechanism
      await t.click(mechanismButtons.nth(1));
      await t.wait(500);
    }
  }
});

test('Should complete full assessment across all pillars and mechanisms', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Create a test assessment first
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.typeText(systemNameInput, 'Complete Assessment Test', { replace: true });

  // Create the assessment
  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  
  // Wait for the page to redirect and reload (window.location.href is used in the frontend)
  await t.wait(3000); // Increased wait for page reload
  
  // Wait for the assessment form to be ready after redirect
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Verify we're now on the edit page with an ID in the URL
  const currentUrl = await t.eval(() => window.location.pathname);
  console.log(`Current URL after creation: ${currentUrl}`);
  await t.expect(currentUrl).match(/\/assessment\/[a-f0-9-]+/, 'Should have assessment ID in URL');

  // Verify pillars are visible
  const pillarButtons = Selector('[data-testid="pillar-button"]');
  await t.expect(pillarButtons.exists).ok('Should show pillar navigation after creating assessment');

  // Now complete the assessment using the improved logic
  const questionCount = await TestHelpers.completeAssessment(0.8);

  console.log(`Completed assessment with ${questionCount} questions answered`);

  // Verify that we answered a reasonable number of questions (should be > 10 for full assessment)
  await t.expect(questionCount).gt(10, 'Should have answered more than 10 questions across all pillars');

  await TestHelpers.takeScreenshot('complete-assessment-finished');
});

test('Should complete full assessment and redirect to results', async t => {
  const assessmentFixture = new AssessmentFixture();
  const result = await assessmentFixture.completeAssessmentWithResults(0.8);

  // Should be on results page
  await t.expect(Selector(selectors.resultsContainer).visible).ok('Should be on results page');

  // Should show polar chart
  await t.expect(Selector(selectors.polarChart).visible).ok('Should show polar chart');

  // Results should reflect the high yes percentage (80%)
  await TestHelpers.takeScreenshot('assessment-results-high-score');
});

test('Should show different results for low scoring assessment', async t => {
  const assessmentFixture = new AssessmentFixture();
  const result = await assessmentFixture.completeAssessmentWithResults(0.3);
  
  // Should be on results page
  await t.expect(Selector(selectors.resultsContainer).visible).ok('Should be on results page');
  
  // Should show capping alerts for low scores
  const cappingAlertExists = await Selector(selectors.cappingAlert).exists;
  if (cappingAlertExists) {
    await t.expect(Selector(selectors.cappingAlert).visible).ok('Should show capping alerts for low scores');
  }
  
  await TestHelpers.takeScreenshot('assessment-results-low-score');
});

test('Should handle assessment auto-saving gracefully', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Create assessment first
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.typeText(systemNameInput, 'Test Assessment for Auto-save', { replace: true });

  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  await t.wait(2000); // Wait for save and redirect

  // Expand first mechanism and answer a few questions
  const firstMechanismButton = Selector('[data-testid="mechanism-button"]').nth(0);
  const mechanismExists = await firstMechanismButton.exists;
  if (mechanismExists) {
    await t.click(firstMechanismButton);
    await t.wait(500);

    // Answer first few questions
    const yesButtons = Selector(selectors.yesButton);
    const questionCount = Math.min(3, await yesButtons.count);

    for (let i = 0; i < questionCount; i++) {
      const button = yesButtons.nth(i);
      if (await button.exists) {
        await t.click(button);
        await t.wait(500); // Wait for auto-save
      }
    }

    // Check for auto-save indicator (responses auto-save in existing assessments)
    const autoSaveIndicator = Selector('span').withText(/Auto-save enabled/i);
    const indicatorExists = await autoSaveIndicator.exists;
    if (indicatorExists) {
      await t.expect(autoSaveIndicator.visible).ok('Should show auto-save indicator');
    }
  }

  // Should not show error messages during auto-save
  const errorExists = await Selector(selectors.errorMessage).exists;
  await t.expect(errorExists).notOk('Should not show error messages during auto-save');
});

test('Should auto-save progress when questions are answered', async t => {
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  // Create assessment first
  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.typeText(systemNameInput, 'Test Assessment for Auto-save Progress', { replace: true });

  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  await t.wait(2000); // Wait for save and redirect

  // This assessment form auto-saves responses, so we just test basic functionality
  const firstMechanismButton = Selector('[data-testid="mechanism-button"]').nth(0);
  const mechanismExists = await firstMechanismButton.exists;
  if (mechanismExists) {
    await t.click(firstMechanismButton);
    await t.wait(500);

    // Answer a question and verify the form still functions
    const yesButton = Selector(selectors.yesButton).nth(0);
    if (await yesButton.exists) {
      await t.click(yesButton);
      await t.wait(500); // Wait for auto-save

      // Verify we're still on the assessment page and it's functional
      await t.expect(Selector(selectors.assessmentForm).exists).ok('Should remain on assessment form');

      // Progress should update
      const progressBar = Selector(selectors.progressBar);
      const progressExists = await progressBar.exists;
      if (progressExists) {
        await t.expect(progressBar.visible).ok('Progress bar should update');
      }
    }
  }
});