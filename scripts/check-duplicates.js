import fs from 'fs';

const framework = JSON.parse(fs.readFileSync('server/framework/framework.json', 'utf-8'));

// Find duplicate metric codes within the same mechanism
const duplicates = {};
framework.metrics.forEach(metric => {
  const key = `${metric.mechanismCode}:${metric.code}`;
  if (!duplicates[key]) {
    duplicates[key] = [];
  }
  duplicates[key].push(metric);
});

const dupes = Object.entries(duplicates).filter(([_, metrics]) => metrics.length > 1);

if (dupes.length > 0) {
  console.log('Found duplicate metric codes within mechanisms:');
  dupes.forEach(([key, metrics]) => {
    console.log(`\n${key}: ${metrics.length} occurrences`);
    metrics.forEach((m, i) => {
      console.log(`  [${i+1}] ${m.name} (type: ${m.type})`);
    });
  });
} else {
  console.log('✅ No duplicates found');
}
