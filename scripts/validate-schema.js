import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const SCHEMA_PATH = path.join(__dirname, '../server/framework/framework.schema.json');
const FRAMEWORK_PATH = path.join(__dirname, '../server/framework.json');

// Load files
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
const framework = JSON.parse(fs.readFileSync(FRAMEWORK_PATH, 'utf-8'));

// Validate
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
const valid = validate(framework);

if (valid) {
  console.log('✅ Framework JSON is valid according to schema!');
  console.log(`\nStatistics:`);
  console.log(`  Pillars: ${framework.length}`);
  const totalMechanisms = framework.reduce((sum, p) => sum + p.mechanisms.length, 0);
  console.log(`  Mechanisms: ${totalMechanisms}`);
  const totalMetrics = framework.reduce((sum, p) => 
    sum + p.mechanisms.reduce((mSum, m) => mSum + m.metrics.length, 0), 0);
  console.log(`  Metrics: ${totalMetrics}`);
} else {
  console.error('❌ Framework JSON is invalid!');
  console.error('\nValidation errors:');
  validate.errors.forEach(err => {
    console.error(`  - ${err.instancePath}: ${err.message}`);
    if (err.params) {
      console.error(`    Params: ${JSON.stringify(err.params)}`);
    }
  });
  process.exit(1);
}
