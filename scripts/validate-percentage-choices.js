import fs from 'fs';

const framework = JSON.parse(fs.readFileSync('server/framework/framework.json', 'utf-8'));

console.log('=== VALIDATING PERCENTAGE CHOICES ===\n');

let totalIssues = 0;
const issuesByMechanism = {};

framework.mechanisms.forEach(mechanism => {
  const designChoicesCount = mechanism.designChoices.length;
  const operationalChoicesCount = mechanism.operationalChoices.length;
  
  const mechanismMetrics = framework.metrics.filter(m => m.mechanismCode === mechanism.code);
  
  const designMetrics = mechanismMetrics.filter(m => m.type === 'design');
  const operationalMetrics = mechanismMetrics.filter(m => m.type === 'operational');
  
  const issues = [];
  
  // Check design metrics
  designMetrics.forEach(metric => {
    const nonNullChoices = metric.percentageChoices.filter(c => c !== null).length;
    if (nonNullChoices !== designChoicesCount) {
      issues.push({
        metricCode: metric.code,
        metricName: metric.name,
        type: 'design',
        expected: designChoicesCount,
        actual: nonNullChoices,
        percentageChoices: metric.percentageChoices
      });
    }
  });
  
  // Check operational metrics
  operationalMetrics.forEach(metric => {
    const nonNullChoices = metric.percentageChoices.filter(c => c !== null).length;
    if (nonNullChoices !== operationalChoicesCount) {
      issues.push({
        metricCode: metric.code,
        metricName: metric.name,
        type: 'operational',
        expected: operationalChoicesCount,
        actual: nonNullChoices,
        percentageChoices: metric.percentageChoices
      });
    }
  });
  
  if (issues.length > 0) {
    issuesByMechanism[mechanism.code] = {
      name: mechanism.name,
      designChoicesCount,
      operationalChoicesCount,
      designMetricsCount: designMetrics.length,
      operationalMetricsCount: operationalMetrics.length,
      issues
    };
    totalIssues += issues.length;
  }
});

if (totalIssues === 0) {
  console.log('✅ All metrics have the correct number of non-null percentage choices!');
  console.log(`\nValidated ${framework.metrics.length} metrics across ${framework.mechanisms.length} mechanisms.`);
} else {
  console.log(`❌ Found ${totalIssues} metrics with incorrect percentage choices:\n`);
  
  Object.entries(issuesByMechanism).forEach(([code, data]) => {
    console.log(`\n${code}: ${data.name}`);
    console.log(`  Design choices: ${data.designChoicesCount}, Operational choices: ${data.operationalChoicesCount}`);
    console.log(`  Design metrics: ${data.designMetricsCount}, Operational metrics: ${data.operationalMetricsCount}`);
    console.log(`  Issues found: ${data.issues.length}`);
    
    data.issues.forEach(issue => {
      console.log(`\n    ${issue.metricCode} (${issue.type}): ${issue.metricName}`);
      console.log(`      Expected: ${issue.expected} non-null choices`);
      console.log(`      Actual: ${issue.actual} non-null choices`);
      console.log(`      Percentage choices: [${issue.percentageChoices.join(', ')}]`);
    });
  });
  
  console.log(`\n\nSummary: ${totalIssues} issues found across ${Object.keys(issuesByMechanism).length} mechanisms.`);
}
