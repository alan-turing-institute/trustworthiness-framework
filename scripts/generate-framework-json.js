import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PILLARS_CSV = path.join(__dirname, '../server/framework/pillars.csv');
const MECHANISMS_CSV = path.join(__dirname, '../server/framework/mechanisms.csv');
const METRICS_CSV = path.join(__dirname, '../server/framework/metrics.csv');
const OUTPUT_JSON = path.join(__dirname, '../server/framework/framework.json');

// Parse CSV helper function that properly handles multi-line quoted fields
// Returns array of row arrays to handle duplicate header names
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      // Row separator
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field)) { // Only add non-empty rows
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  // Push last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field)) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

// Parse CSV and convert to objects, handling duplicate headers
function parseCSVWithHeaders(filePath) {
  const rows = parseCSV(filePath);
  if (rows.length === 0) return [];
  
  const headers = rows[0].map(h => h.trim());
  
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = (row[index] || '').trim();
    });
    return obj;
  });
}

// Parse metrics CSV with special handling for duplicate "Type" columns
function parseMetricsCSV(filePath) {
  const rows = parseCSV(filePath);
  if (rows.length === 0) return [];
  
  const headers = rows[0];
  
  return rows.slice(1).map(row => {
    return {
      mechanismCode: row[0] || '',
      configurationType: row[1] || '', // First "Type" column (design/operational)
      code: row[2] || '',
      metricType: row[3] || '', // Second "Type" column (Boolean/percentage)
      name: row[4] || '',
      description: row[5] || '',
      standards: row[6] || '',
      weight: row[7] || '',
      percentageChoice0: row[8] || '',
      percentageChoice1: row[9] || '',
      percentageChoice2: row[10] || '',
      percentageChoice3: row[11] || '',
      percentageChoice4: row[12] || ''
    };
  });
}

// Load and parse CSV files
console.log('Loading CSV files...');
const pillarsData = parseCSVWithHeaders(PILLARS_CSV);
const mechanismsData = parseCSVWithHeaders(MECHANISMS_CSV);
const metricsData = parseMetricsCSV(METRICS_CSV);

console.log(`Loaded ${pillarsData.length} pillars`);
console.log(`Loaded ${mechanismsData.length} mechanisms`);
console.log(`Loaded ${metricsData.length} metrics`);

// Build the framework structure (nested format)
const framework = [];

// Map to track pillar codes for validation
const pillarMap = new Map();

// Process pillars
pillarsData.forEach(pillar => {
  if (pillar.code && pillar.name) {
    const pillarObj = {
      code: pillar.code,
      name: pillar.name,
      description: `Framework pillar covering ${pillar.name.toLowerCase()} aspects`,
      mechanisms: []
    };
    framework.push(pillarObj);
    pillarMap.set(pillar.code, pillarObj);
  }
});

// Map to track mechanism codes for validation
const mechanismMap = new Map();

// Process mechanisms and add to their pillars
mechanismsData.forEach(mech => {
  if (mech.Code && mech.Name) {
    const pillarCode = mech.Code.split('.')[0]; // Extract pillar code (e.g., "S" from "S.AC")
    
    const pillar = pillarMap.get(pillarCode);
    if (!pillar) {
      console.warn(`Warning: Mechanism ${mech.Code} references unknown pillar: ${pillarCode}`);
      return;
    }
    
    // Build design configurations array
    const designConfigurations = [];
    for (let i = 1; i <= 5; i++) {
      const choice = mech[`DesignChoice${i}`];
      if (choice) {
        designConfigurations.push({
          label: choice,
          description: choice // Using choice as description for now
        });
      }
    }
    
    // Build operational configurations array
    const operationalConfigurations = [];
    for (let i = 1; i <= 5; i++) {
      const choice = mech[`OperationalChoice${i}`];
      if (choice) {
        operationalConfigurations.push({
          label: choice,
          description: choice // Using choice as description for now
        });
      }
    }
    
    const mechanismObj = {
      code: `${pillar.code}-${mech.Code}`,
      name: mech.Name,
      description: `${mech.Name} controls and measures`,
      metrics: []
    };
    
    // Only add configuration arrays if they have items
    if (operationalConfigurations.length > 0) {
      mechanismObj.operationalConfigurations = operationalConfigurations;
    }
    if (designConfigurations.length > 0) {
      mechanismObj.designConfigurations = designConfigurations;
    }
    
    pillar.mechanisms.push(mechanismObj);
    mechanismMap.set(mech.Code, mechanismObj);
  }
});

// Process metrics and add to their mechanisms
let validMetrics = 0;
let invalidMetrics = 0;

metricsData.forEach(metric => {
  if (metric.mechanismCode && metric.code && metric.name) {
    const mechanismCode = metric.mechanismCode;
    
    const mechanism = mechanismMap.get(mechanismCode);
    if (!mechanism) {
      console.warn(`Warning: Metric ${metric.code} references unknown mechanism: ${mechanismCode}`);
      invalidMetrics++;
      return;
    }
    
    validMetrics++;
    
    // Parse standards (comma-separated or empty)
    const standards = metric.standards ? 
      metric.standards.split(',').map(s => s.trim()).filter(s => s) : 
      [];
    
    // Parse percentage choices - use correct column mapping
    const percentageChoice0 = metric.percentageChoice0 !== '' ? parseFloat(metric.percentageChoice0) : null;
    const percentageChoice1 = metric.percentageChoice1 !== '' ? parseFloat(metric.percentageChoice1) : null;
    const percentageChoice2 = metric.percentageChoice2 !== '' ? parseFloat(metric.percentageChoice2) : null;
    const percentageChoice3 = metric.percentageChoice3 !== '' ? parseFloat(metric.percentageChoice3) : null;
    const percentageChoice4 = metric.percentageChoice4 !== '' ? parseFloat(metric.percentageChoice4) : null;
    
    // Determine pillarCap and mechanismCap based on percentage choices
    // Default to 100 if no percentage choices are specified
    const hasPercentageChoices = [percentageChoice0, percentageChoice1, percentageChoice2, percentageChoice3, percentageChoice4]
      .some(val => val !== null);
    
    const maxPercentage = hasPercentageChoices ? 
      Math.max(percentageChoice0 ?? 0, percentageChoice1 ?? 0, percentageChoice2 ?? 0, percentageChoice3 ?? 0, percentageChoice4 ?? 0) : 
      100;
    
    const metricObj = {
      code: metric.code,
      name: `${metric.code} ${metric.name}`,
      description: metric.description || metric.name,
      type: metric.configurationType.toLowerCase(), // design or operational (first "Type" column)
      standards: standards,
      pillarCap: maxPercentage,
      mechanismCap: 100,
      metricType: metric.metricType.toLowerCase() === 'boolean' ? 'boolean' : 'percentage' // second "Type" column
    };
    
    // Only add percentage choices if they exist
    if (percentageChoice0 !== null) metricObj.percentageChoice0 = percentageChoice0;
    if (percentageChoice1 !== null) metricObj.percentageChoice1 = percentageChoice1;
    if (percentageChoice2 !== null) metricObj.percentageChoice2 = percentageChoice2;
    if (percentageChoice3 !== null) metricObj.percentageChoice3 = percentageChoice3;
    if (percentageChoice4 !== null) metricObj.percentageChoice4 = percentageChoice4;
    
    mechanism.metrics.push(metricObj);
  }
});

// Generate validation summary
console.log('\n=== Validation Summary ===');
console.log(`Pillars: ${framework.length}`);
const totalMechanisms = framework.reduce((sum, p) => sum + p.mechanisms.length, 0);
console.log(`Mechanisms: ${totalMechanisms}`);
console.log(`Metrics: ${validMetrics}`);
console.log(`  - Valid (linked to mechanisms): ${validMetrics}`);
console.log(`  - Invalid (orphaned): ${invalidMetrics}`);

// Write the framework JSON
console.log(`\nWriting framework to ${OUTPUT_JSON}...`);
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(framework, null, 2), 'utf-8');
console.log('Done!');
