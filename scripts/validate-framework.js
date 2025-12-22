import fs from 'fs';

const framework = JSON.parse(fs.readFileSync('server/framework/framework.json', 'utf-8'));

// Get all mechanism codes
const mechanismCodes = new Set(framework.mechanisms.map(m => m.code));

// Check each metric
const orphanedMetrics = [];
const validMetrics = [];
const mechanismMetricsCount = {};

framework.metrics.forEach(metric => {
  if (mechanismCodes.has(metric.mechanismCode)) {
    validMetrics.push(metric.code);
    mechanismMetricsCount[metric.mechanismCode] = (mechanismMetricsCount[metric.mechanismCode] || 0) + 1;
  } else {
    orphanedMetrics.push({
      code: metric.code,
      mechanismCode: metric.mechanismCode,
      name: metric.name
    });
  }
});

console.log('=== VALIDATION REPORT ===');
console.log('Total Mechanisms:', framework.mechanisms.length);
console.log('Total Metrics:', framework.metrics.length);
console.log('Valid Metrics (linked to mechanisms):', validMetrics.length);
console.log('Orphaned Metrics (invalid mechanism reference):', orphanedMetrics.length);

if (orphanedMetrics.length > 0) {
  console.log('\n=== ORPHANED METRICS ===');
  orphanedMetrics.forEach(m => {
    console.log(`  - ${m.code} (references unknown mechanism: ${m.mechanismCode})`);
  });
}

// Find mechanisms with no metrics
const mechanismsWithoutMetrics = framework.mechanisms
  .filter(m => !mechanismMetricsCount[m.code])
  .map(m => m.code);

if (mechanismsWithoutMetrics.length > 0) {
  console.log('\n=== MECHANISMS WITHOUT METRICS ===');
  console.log('Count:', mechanismsWithoutMetrics.length);
  mechanismsWithoutMetrics.forEach(code => {
    console.log(`  - ${code}`);
  });
}

// Show metrics count per mechanism
console.log('\n=== METRICS PER MECHANISM ===');
Object.entries(mechanismMetricsCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([code, count]) => {
    const mech = framework.mechanisms.find(m => m.code === code);
    console.log(`  ${code}: ${count} metrics - ${mech?.name || 'Unknown'}`);
  });

if (orphanedMetrics.length === 0) {
  console.log('\n✅ All metrics are properly connected to existing mechanisms!');
} else {
  console.log(`\n❌ Found ${orphanedMetrics.length} orphaned metrics!`);
}
