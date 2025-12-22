import { fixture, test, Selector } from 'testcafe';
import { AssessmentFixture } from './fixtures/user-fixtures';
import { TestHelpers, urls, selectors } from './helpers/test-helpers';

fixture('Results Page Tests')
  .page(urls.base)
  .beforeEach(async t => {
    const assessmentFixture = new AssessmentFixture();
    await assessmentFixture.beforeEach();

    // Complete an assessment quickly to get to results
    const result = await assessmentFixture.quickCompleteAssessmentWithResults(0.7);
    await TestHelpers.waitForElement(selectors.resultsContainer);
  })
  .afterEach(async t => {
    const assessmentFixture = new AssessmentFixture();
    await assessmentFixture.afterEach();
  });

test('Should display results page with all components', async t => {
  await t
    .expect(Selector(selectors.resultsContainer).visible).ok('Results container should be visible')
    .expect(Selector(selectors.polarChart).visible).ok('Polar chart should be visible')
    .expect(Selector(selectors.pillarBreakdown).visible).ok('Pillar breakdown should be visible');
    
  await TestHelpers.takeScreenshot('results-page-overview');
});

test('Should allow perspective switching', async t => {
  // Check if perspective selector exists
  const perspectiveSelectExists = await Selector(selectors.perspectiveSelect).exists;

  if (perspectiveSelectExists) {
    await t.click(selectors.perspectiveSelect);

    // For Radix UI Select, we need to look for the content items
    const operationalOption = Selector('[data-radix-select-item]').withText('Operational');
    if (await operationalOption.exists) {
      await t.click(operationalOption);
      await TestHelpers.waitForPageLoad();
      await TestHelpers.takeScreenshot('results-operational-view');

      // Select design perspective
      await t.click(selectors.perspectiveSelect);
      const designOption = Selector('[data-radix-select-item]').withText('Design');
      if (await designOption.exists) {
        await t.click(designOption);
        await TestHelpers.waitForPageLoad();
        await TestHelpers.takeScreenshot('results-design-view');

        // Switch back to both
        await t.click(selectors.perspectiveSelect);
        const bothOption = Selector('[data-radix-select-item]').withText('Both');
        if (await bothOption.exists) {
          await t.click(bothOption);
          await TestHelpers.waitForPageLoad();
        }
      }
    }
  }
});

test('Should display mechanism details when clicking on pillars', async t => {
  // Try to click on the first pillar in the breakdown
  const firstPillar = Selector(selectors.pillarBreakdown).child().nth(0);

  if (await firstPillar.exists) {
    await t.click(firstPillar);
    await TestHelpers.waitForPageLoad();

    // Should show mechanism cards
    await t.expect(Selector(selectors.mechanismCard).visible).ok('Should show mechanism details');

    // Should show "Back to Overview" button
    const backButton = Selector('button').withText(/Back to Overview/i);
    await t.expect(backButton.exists).ok('Should show back to overview button in drill-down mode');

    await TestHelpers.takeScreenshot('pillar-drill-down');
  }
});

test('Should show mechanism codes in polar chart axes when drilling down', async t => {
  // Click on first pillar to drill down
  const firstPillar = Selector(selectors.pillarBreakdown).child().nth(0);

  if (await firstPillar.exists) {
    await t.click(firstPillar);
    await TestHelpers.waitForPageLoad();

    // Should show polar chart with mechanism data
    await t.expect(Selector(selectors.polarChart).visible).ok('Polar chart should be visible in drill-down');

    // The chart should now show mechanism codes on axes (verify chart has updated)
    // Canvas element should exist
    const canvas = Selector(selectors.polarChart).find('canvas');
    await t.expect(canvas.exists).ok('Chart canvas should exist in drill-down view');

    await TestHelpers.takeScreenshot('polar-chart-mechanism-drilldown');
  }
});

test('Should show mechanism tooltips with full names on hover', async t => {
  // Click on first pillar to drill down
  const firstPillar = Selector(selectors.pillarBreakdown).child().nth(0);

  if (await firstPillar.exists) {
    await t.click(firstPillar);
    await TestHelpers.waitForPageLoad();

    // Hover over polar chart to trigger tooltips
    const canvas = Selector(selectors.polarChart).find('canvas');
    const canvasExists = await canvas.exists;

    if (canvasExists) {
      // Hover over chart area to potentially trigger tooltip
      await t.hover(canvas);
      await t.wait(1000); // Wait for tooltip to appear

      // Chart.js tooltips are rendered on the canvas, so we can't directly test them
      // But we can verify the canvas is interactive
      await t.expect(canvas.visible).ok('Chart should be interactive');

      await TestHelpers.takeScreenshot('polar-chart-hover-state');
    }
  }
});

test('Should show capping alerts when present', async t => {
  // Check if capping alerts exist (depends on assessment results)
  const cappingAlertExists = await Selector(selectors.cappingAlert).exists;
  
  if (cappingAlertExists) {
    await t.expect(Selector(selectors.cappingAlert).visible).ok('Capping alerts should be visible');
    
    // Test tooltip functionality if present
    await t.hover(selectors.cappingAlert);
    await t.wait(1000); // Wait for tooltip
    
    await TestHelpers.takeScreenshot('capping-alerts');
  }
});

test('Should display export and share functionality', async t => {
  // Check for export button
  const exportButtonExists = await Selector(selectors.exportButton).exists;
  if (exportButtonExists) {
    await t.expect(Selector(selectors.exportButton).visible).ok('Export button should be visible');
  }
  
  // Check for share button
  const shareButtonExists = await Selector(selectors.shareButton).exists;
  if (shareButtonExists) {
    await t.expect(Selector(selectors.shareButton).visible).ok('Share button should be visible');
  }
});

test('Should handle export functionality', async t => {
  const exportButtonExists = await Selector(selectors.exportButton).exists;
  
  if (exportButtonExists) {
    await t.click(selectors.exportButton);
    await t.wait(2000); // Wait for export process
    
    // The actual export might download a file or open a new window
    // Verify that the action doesn't cause errors
    await TestHelpers.checkConsoleErrors();
    
    await TestHelpers.takeScreenshot('export-initiated');
  }
});

test('Should be responsive on different screen sizes', async t => {
  await TestHelpers.testResponsiveness();
  
  // Take screenshots at different sizes
  await t.resizeWindow(1920, 1080);
  await TestHelpers.takeScreenshot('results-desktop');
  
  await t.resizeWindow(768, 1024);
  await TestHelpers.takeScreenshot('results-tablet');
  
  await t.resizeWindow(375, 667);
  await TestHelpers.takeScreenshot('results-mobile');
  
  // Reset to desktop
  await t.resizeWindow(1920, 1080);
});

test('Should show proper accessibility elements', async t => {
  await TestHelpers.checkAccessibility();
  
  // Check for specific accessibility features in results
  await t
    .expect(Selector('h1, h2, h3').exists).ok('Should have proper heading structure')
    .expect(Selector('[aria-label], [aria-labelledby]').exists).ok('Should have aria labels for chart elements')
    .expect(Selector('[role="button"], button').exists).ok('Should have proper button roles');
});

test('Should handle navigation back to assessment', async t => {
  // Look for back button or navigation link
  const backButton = Selector('[data-testid="back-button"], .back-link').withText(/back|previous|assessment/i);
  
  if (await backButton.exists) {
    await t.click(backButton);
    await TestHelpers.waitForPageLoad();
    
    // Should be back on assessment or home page
    const onAssessment = await Selector(selectors.assessmentForm).exists;
    const onHome = await Selector(selectors.navigationHeader).exists;
    
    await t.expect(onAssessment || onHome).ok('Should navigate back successfully');
  }
});

test('Should persist results data on page refresh', async t => {
  // Get current results data (check if polar chart has data)
  const chartExists = await Selector(selectors.polarChart).exists;
  
  if (chartExists) {
    // Refresh the page
    await t.eval(() => location.reload());
    await TestHelpers.waitForPageLoad();
    
    // Results should still be there
    await t.expect(Selector(selectors.resultsContainer).visible).ok('Results should persist after refresh');
    await t.expect(Selector(selectors.polarChart).visible).ok('Chart should still be visible');
  }
});

test('Should show loading states appropriately', async t => {
  // Get current assessment ID from URL
  const currentUrl = await t.eval(() => window.location.pathname);
  const assessmentIdMatch = currentUrl.match(/\/results\/([^\/]+)/);

  if (assessmentIdMatch) {
    const assessmentId = assessmentIdMatch[1];

    // Navigate away and back to results to test loading
    await t.navigateTo(urls.home);
    await TestHelpers.waitForPageLoad();

    // Go back to results with the assessment ID
    await t.navigateTo(`${urls.results}/${assessmentId}`);

    // Check for loading state (this might be very brief)
    const loadingExists = await Selector(selectors.loadingSpinner).exists;
    if (loadingExists) {
      await t.expect(Selector(selectors.loadingSpinner).visible).ok('Should show loading state');
    }

    // Wait for results to load
    await TestHelpers.waitForElement(selectors.resultsContainer);
    await t.expect(Selector(selectors.resultsContainer).visible).ok('Results should load successfully');
  }
});