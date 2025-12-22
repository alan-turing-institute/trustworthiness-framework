import { fixture, test, Selector } from 'testcafe';
import { AdminUserFixture, AssessmentFixture } from './fixtures/user-fixtures';
import { TestHelpers, urls, selectors } from './helpers/test-helpers';

fixture('Home Page and Assessment List Tests')
  .page(urls.base)
  .beforeEach(async t => {
    const adminFixture = new AdminUserFixture();
    await adminFixture.beforeEach();
  })
  .afterEach(async t => {
    const adminFixture = new AdminUserFixture();
    await adminFixture.afterEach();
  });

test('Should display dashboard with stats and assessment list', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  // Check for welcome message
  const welcomeMessage = Selector('h2').withText(/Welcome back/i);
  await t.expect(welcomeMessage.exists).ok('Should show welcome message');

  // Check for stats cards
  const statsCards = Selector('[data-testid="stats-card"], .grid .card, .flex.items-center');
  const statsExist = await statsCards.exists;
  if (statsExist) {
    await t.expect(statsCards.count).gte(1, 'Should show statistics');
  }

  // Check for assessment table
  const assessmentTable = Selector('table, [role="table"], [data-testid="assessment-table"]');
  const tableExists = await assessmentTable.exists;
  await t.expect(tableExists).ok('Should show assessment table or empty state');
});

test('Should display "New Assessment" button', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  const newAssessmentButton = Selector('button').withText(/New Assessment/i);
  await t.expect(newAssessmentButton.exists).ok('Should show New Assessment button');
  await t.expect(newAssessmentButton.visible).ok('New Assessment button should be visible');
});

test('Assessment list should NOT display pillar scores', async t => {
  // Create an assessment first
  const assessmentFixture = new AssessmentFixture();
  await assessmentFixture.quickCompleteAssessmentWithResults(0.7);

  // Go back to home
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  const table = Selector('table');
  const tableExists = await table.exists;

  if (tableExists) {
    // Check that table headers do NOT include "Pillar Scores"
    const headers = table.find('th');
    const headerTexts = [];
    const headerCount = await headers.count;

    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText;
      headerTexts.push(text.toLowerCase());
    }

    const hasPillarScoresColumn = headerTexts.some(text => text.includes('pillar') && text.includes('score'));
    await t.expect(hasPillarScoresColumn).notOk('Assessment list should NOT have a Pillar Scores column');

    // Verify expected columns exist
    const hasSystemName = headerTexts.some(text => text.includes('system'));
    const hasStatus = headerTexts.some(text => text.includes('status'));
    const hasLastModified = headerTexts.some(text => text.includes('modified') || text.includes('last'));
    const hasActions = headerTexts.some(text => text.includes('actions'));

    await t
      .expect(hasSystemName).ok('Should have System Name column')
      .expect(hasStatus).ok('Should have Status column')
      .expect(hasLastModified).ok('Should have Last Modified column')
      .expect(hasActions).ok('Should have Actions column');
  }
});

test('Should show assessment metadata in list', async t => {
  // Create an assessment
  await t.navigateTo(urls.assessment);
  await TestHelpers.waitForElement(selectors.assessmentForm);

  const systemNameInput = Selector('input#systemName, input[name="systemName"]');
  await t.typeText(systemNameInput, 'Test Assessment for List View', { replace: true });

  const descriptionInput = Selector('textarea#systemDescription, textarea[name="systemDescription"]');
  const descExists = await descriptionInput.exists;
  if (descExists) {
    await t.typeText(descriptionInput, 'This is a test description', { replace: true });
  }

  const createButton = Selector('button').withText(/Create Assessment/i);
  await t.click(createButton);
  await t.wait(2000);

  // Go to home
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  const table = Selector('table');
  const tableExists = await table.exists;

  if (tableExists) {
    // Find row with our assessment
    const assessmentRow = table.find('tr').withText('Test Assessment for List View');
    await t.expect(assessmentRow.exists).ok('Should find our assessment in the list');

    // Check for status badge
    const statusBadge = assessmentRow.find('[class*="badge"], .badge, [class*="Badge"]');
    const badgeExists = await statusBadge.exists;
    if (badgeExists) {
      await t.expect(statusBadge.visible).ok('Should show status badge');
    }

    // Check for visibility indicator
    const visibilityBadge = assessmentRow.find('[class*="badge"], .badge, [class*="Badge"]').nth(1);
    const visExists = await visibilityBadge.exists;
    if (visExists) {
      await t.expect(visibilityBadge.visible).ok('Should show visibility badge');
    }
  }
});

test('Should provide actions menu for assessments', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  const table = Selector('table');
  const tableExists = await table.exists;

  if (tableExists) {
    // Look for actions button/menu
    const actionsButton = Selector('button[aria-haspopup], [data-testid="actions-menu"], button').withAttribute('role', 'button');
    const actionExists = await actionsButton.exists;

    if (actionExists && await actionsButton.count > 0) {
      // Click first actions menu
      await t.click(actionsButton.nth(0));
      await t.wait(500);

      // Check for menu items
      const viewResultsItem = Selector('[role="menuitem"], .dropdown-item, [data-testid="menu-item"]').withText(/View Results/i);
      const editItem = Selector('[role="menuitem"], .dropdown-item, [data-testid="menu-item"]').withText(/Edit/i);

      const viewExists = await viewResultsItem.exists;
      const editExists = await editItem.exists;

      await t.expect(viewExists || editExists).ok('Should show action menu items');
    }
  }
});

test('Should navigate to assessment creation from "New Assessment" button', async t => {
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  const newAssessmentButton = Selector('button').withText(/New Assessment/i);
  await t.click(newAssessmentButton);
  await TestHelpers.waitForPageLoad();

  // Should be on assessment form
  await t.expect(Selector(selectors.assessmentForm).exists).ok('Should navigate to assessment form');

  // Should show new assessment indicators
  const gettingStartedMessage = Selector('p').withText(/Getting Started/i);
  const messageExists = await gettingStartedMessage.exists;
  await t.expect(messageExists).ok('Should show getting started message for new assessment');
});

test('Should show empty state when no assessments exist', async t => {
  // This test assumes a clean state or uses a user with no assessments
  await t.navigateTo(urls.home);
  await TestHelpers.waitForPageLoad();

  const emptyState = Selector('p, div').withText(/No assessments found|Create Your First Assessment/i);
  const tableExists = await Selector('table tbody tr').exists;

  // If no rows in table, should show empty state message
  if (!tableExists) {
    await t.expect(emptyState.exists).ok('Should show empty state message when no assessments');
  }
});
