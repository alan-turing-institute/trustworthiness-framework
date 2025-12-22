import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { Assessment, AssessmentResponse, PillarWithMechanisms } from "@shared/schema";
import { calculateResults as sharedCalculateResults } from "@shared/scoreCalculation";

interface AssessmentData {
  assessment: Assessment;
  responses: AssessmentResponse[];
  framework: PillarWithMechanisms[];
}

interface PillarResults {
  id: string;
  name: string;
  code: string;
  icon?: string;
  operationalScore: number;
  designScore: number;
  isCapped?: boolean;
  mechanisms: Array<{
    id: string;
    name: string;
    code: string;
    operationalScore: number;
    designScore: number;
    isCapped?: boolean;
    metrics: Array<{
      id: string;
      name: string;
      type: "operational" | "design";
      score: number;
      mechanismCap: number;
      pillarCap: number;
      notes?: string;
    }>;
  }>;
}

interface ResultsData {
  pillars: PillarResults[];
  overallOperationalScore: number;
  overallDesignScore: number;
}

export class PDFService {
  private browser: Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  calculateResults(data: AssessmentData): ResultsData {
    const { responses, framework } = data;
    // Use shared calculateResults function
    return sharedCalculateResults(framework, responses);
  }

  generatePolarChartData(results: ResultsData, perspective: 'operational' | 'design' | 'both') {
    const data = results.pillars.map(pillar => {
      let value = 0;
      if (perspective === 'operational') {
        value = pillar.operationalScore;
      } else if (perspective === 'design') {
        value = pillar.designScore;
      } else {
        value = (pillar.operationalScore + pillar.designScore) / 2;
      }

      return {
        pillar: pillar.name,
        value: Math.round(value),
        fullMark: 100
      };
    });

    return data;
  }

  generatePolarChartSVG(data: Array<{pillar: string, value: number, fullMark: number}>, color: string = '#3b82f6'): string {
    const size = 300;
    const center = size / 2;
    const radius = size * 0.35;
    const numPoints = data.length;

    if (numPoints === 0) return '';

    // Calculate points for the data polygon
    const dataPoints = data.map((item, index) => {
      const angle = (index * 2 * Math.PI) / numPoints - Math.PI / 2; // Start from top
      const value = Math.max(0, Math.min(100, item.value)); // Clamp between 0-100
      const pointRadius = (value / 100) * radius;
      const x = center + pointRadius * Math.cos(angle);
      const y = center + pointRadius * Math.sin(angle);
      return { x, y, angle, label: item.pillar, value: item.value };
    });

    // Generate grid circles (20%, 40%, 60%, 80%, 100%)
    const gridCircles = [20, 40, 60, 80, 100].map(percent => {
      const r = (percent / 100) * radius;
      return `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
    }).join('');

    // Generate axis lines
    const axisLines = dataPoints.map(point => 
      `<line x1="${center}" y1="${center}" x2="${center + radius * Math.cos(point.angle)}" y2="${center + radius * Math.sin(point.angle)}" stroke="#e2e8f0" stroke-width="1"/>`
    ).join('');

    // Generate data polygon
    const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
    const dataPolygon = `<polygon points="${polygonPoints}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`;

    // Generate labels
    const labels = dataPoints.map(point => {
      const labelRadius = radius * 1.15;
      const labelX = center + labelRadius * Math.cos(point.angle);
      const labelY = center + labelRadius * Math.sin(point.angle);
      
      return `
        <text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central" 
              font-size="12" font-weight="500" fill="#374151">
          ${point.label}
        </text>
        <text x="${labelX}" y="${labelY + 15}" text-anchor="middle" dominant-baseline="central" 
              font-size="10" fill="#6b7280">
          ${point.value}%
        </text>
      `;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${gridCircles}
        ${axisLines}
        ${dataPolygon}
        ${labels}
      </svg>
    `;
  }

  generatePillarChartData(pillar: PillarResults, perspective: 'operational' | 'design' | 'both') {
    const data = pillar.mechanisms.map(mechanism => {
      let value = 0;
      if (perspective === 'operational') {
        value = mechanism.operationalScore;
      } else if (perspective === 'design') {
        value = mechanism.designScore;
      } else {
        value = (mechanism.operationalScore + mechanism.designScore) / 2;
      }

      return {
        mechanism: mechanism.name,
        value: Math.round(value),
        fullMark: 100
      };
    });

    return data;
  }

  async generateReportHTML(assessmentData: AssessmentData, metricNotes?: any[]): Promise<string> {
    const results = this.calculateResults(assessmentData);
    const { assessment } = assessmentData;

    // Create notes map for quick lookup
    const notesMap = new Map();
    if (metricNotes) {
      metricNotes.forEach(note => {
        notesMap.set(note.metricId, note.notes);
      });
    }

    const overallOperationalData = this.generatePolarChartData(results, 'operational');
    const overallDesignData = this.generatePolarChartData(results, 'design');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Assessment Report - ${assessment.systemName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 32px;
            font-weight: bold;
        }
        .header h2 {
            color: #64748b;
            margin: 0;
            font-weight: normal;
            font-size: 18px;
        }
        .assessment-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2563eb;
        }
        .assessment-info h3 {
            margin-top: 0;
            color: #1e40af;
            font-size: 20px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .info-item {
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            color: #475569;
            display: inline-block;
            min-width: 100px;
        }
        .info-value {
            color: #1f2937;
        }
        .chart-section {
            margin: 40px 0;
            page-break-inside: avoid;
        }
        .chart-section h3 {
            color: #1e40af;
            margin-bottom: 20px;
            font-size: 24px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .chart-container {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            gap: 40px;
        }
        .chart {
            text-align: center;
            flex: 1;
        }
        .chart h4 {
            margin-bottom: 15px;
            color: #374151;
            font-size: 18px;
        }
        .radar-chart {
            width: 300px;
            height: 300px;
            margin: 0 auto;
            position: relative;
        }
        .pillar-summary {
            margin: 30px 0;
            background: #f9fafb;
            border-radius: 8px;
            overflow: hidden;
        }
        .pillar-summary h4 {
            background: #2563eb;
            color: white;
            margin: 0;
            padding: 15px 20px;
            font-size: 18px;
        }
        .pillar-content {
            padding: 20px;
        }
        .score-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #e5e7eb;
        }
        .score-row.operational { border-left-color: #3b82f6; }
        .score-row.design { border-left-color: #10b981; }
        .score-label {
            font-weight: 600;
            color: #374151;
        }
        .score-value {
            font-size: 18px;
            font-weight: bold;
            padding: 5px 12px;
            border-radius: 20px;
            color: white;
        }
        .score-excellent { background: #10b981; }
        .score-good { background: #f59e0b; }
        .score-poor { background: #ef4444; }
        .pillar-section {
            page-break-before: always;
            margin-top: 50px;
        }
        .pillar-section h2 {
            color: #1e40af;
            margin-bottom: 30px;
            font-size: 28px;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 8px;
            border: 2px solid #2563eb;
        }
        .mechanism-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .mechanism-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
        }
        .mechanism-card h5 {
            margin: 0 0 10px 0;
            color: #1f2937;
            font-size: 16px;
        }
        .metric-list {
            margin: 20px 0;
        }
        .metric-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #e5e7eb;
        }
        .metric-item.operational { border-left-color: #3b82f6; }
        .metric-item.design { border-left-color: #10b981; }
        .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .metric-name {
            font-weight: bold;
            color: #1f2937;
            flex: 1;
        }
        .metric-type {
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin: 0 10px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .metric-type.operational { background: #dbeafe; color: #1e40af; }
        .metric-type.design { background: #d1fae5; color: #065f46; }
        .metric-score {
            font-size: 16px;
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 16px;
            color: white;
        }
        .metric-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin: 10px 0;
            font-size: 14px;
        }
        .metric-detail-item {
            color: #6b7280;
        }
        .metric-notes {
            background: #fffbeb;
            border: 1px solid #fbbf24;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
            font-style: italic;
            color: #92400e;
        }
        .page-break {
            page-break-before: always;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }

        /* Simple radar chart styles */
        .simple-radar {
            width: 250px;
            height: 250px;
            margin: 0 auto;
            position: relative;
            background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 50%;
            border: 2px solid #cbd5e1;
        }

        /* Polar chart styles */
        .polar-chart {
            width: 300px;
            height: 300px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .polar-chart svg {
            width: 100%;
            height: 100%;
        }

        .radar-labels {
            position: absolute;
            width: 100%;
            height: 100%;
        }

        .radar-label {
            position: absolute;
            font-size: 12px;
            font-weight: bold;
            color: #475569;
            transform: translate(-50%, -50%);
        }

        .overall-scores {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 20px 0;
        }

        .overall-score {
            text-align: center;
            background: white;
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #e5e7eb;
            min-width: 150px;
        }

        .overall-score h4 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 16px;
        }

        .overall-score .value {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Trustworthiness Assessment Report</h1>
        <h2>${assessment.systemName}</h2>
    </div>

    <div class="assessment-info">
        <h3>Assessment Information</h3>
        <div class="info-grid">
            <div>
                <div class="info-item">
                    <span class="info-label">System Name:</span>
                    <span class="info-value">${assessment.systemName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${assessment.status || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Created:</span>
                    <span class="info-value">${assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
            <div>
                <div class="info-item">
                    <span class="info-label">Description:</span>
                    <span class="info-value">${assessment.systemDescription || 'No description provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Visibility:</span>
                    <span class="info-value">${assessment.isPublic ? 'Public' : 'Private'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Last Updated:</span>
                    <span class="info-value">${assessment.updatedAt ? new Date(assessment.updatedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="chart-section">
        <h3>Overall Assessment Results</h3>

        <div class="overall-scores">
            <div class="overall-score">
                <h4>Operational Score</h4>
                <div class="value">${Math.round(results.overallOperationalScore)}%</div>
            </div>
            <div class="overall-score">
                <h4>Design Score</h4>
                <div class="value">${Math.round(results.overallDesignScore)}%</div>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart">
                <h4>Operational Perspective</h4>
                <div class="polar-chart">
                    ${this.generatePolarChartSVG(overallOperationalData, '#3b82f6')}
                </div>
            </div>
            <div class="chart">
                <h4>Design Perspective</h4>
                <div class="polar-chart">
                    ${this.generatePolarChartSVG(overallDesignData, '#10b981')}
                </div>
            </div>
        </div>
    </div>

    <div class="pillar-summary">
        <h4>Pillar Breakdown</h4>
        <div class="pillar-content">
            ${results.pillars.map(pillar => `
                <div class="score-row operational">
                    <span class="score-label">${pillar.name} - Operational</span>
                    <span class="score-value ${this.getScoreClass(pillar.operationalScore)}">${Math.round(pillar.operationalScore)}%</span>
                </div>
                <div class="score-row design">
                    <span class="score-label">${pillar.name} - Design</span>
                    <span class="score-value ${this.getScoreClass(pillar.designScore)}">${Math.round(pillar.designScore)}%</span>
                </div>
            `).join('')}
        </div>
    </div>

    ${results.pillars.map(pillar => this.generatePillarSection(pillar, notesMap)).join('')}

    <div class="footer">
        <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>Trustworthiness Framework Assessment Tool</p>
    </div>
</body>
</html>`;

    return html;
  }

  private generatePillarSection(pillar: PillarResults, notesMap: Map<string, string>): string {
    const operationalMechanismData = this.generatePillarChartData(pillar, 'operational');
    const designMechanismData = this.generatePillarChartData(pillar, 'design');
    
    return `
    <div class="pillar-section">
        <h2>${pillar.name} Detailed Analysis</h2>

        <div class="overall-scores">
            <div class="overall-score">
                <h4>Operational Score</h4>
                <div class="value">${Math.round(pillar.operationalScore)}%</div>
            </div>
            <div class="overall-score">
                <h4>Design Score</h4>
                <div class="value">${Math.round(pillar.designScore)}%</div>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart">
                <h4>Operational Mechanisms</h4>
                <div class="polar-chart">
                    ${this.generatePolarChartSVG(operationalMechanismData.map(d => ({pillar: d.mechanism, value: d.value, fullMark: d.fullMark})), '#3b82f6')}
                </div>
            </div>
            <div class="chart">
                <h4>Design Mechanisms</h4>
                <div class="polar-chart">
                    ${this.generatePolarChartSVG(designMechanismData.map(d => ({pillar: d.mechanism, value: d.value, fullMark: d.fullMark})), '#10b981')}
                </div>
            </div>
        </div>

        <h4>Mechanisms Overview</h4>
        <div class="mechanism-grid">
            ${pillar.mechanisms.map(mechanism => `
                <div class="mechanism-card">
                    <h5>${mechanism.name}</h5>
                    <div class="score-row operational">
                        <span class="score-label">Operational</span>
                        <span class="score-value ${this.getScoreClass(mechanism.operationalScore)}">${Math.round(mechanism.operationalScore)}%</span>
                    </div>
                    <div class="score-row design">
                        <span class="score-label">Design</span>
                        <span class="score-value ${this.getScoreClass(mechanism.designScore)}">${Math.round(mechanism.designScore)}%</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <h4>Detailed Metrics</h4>
        <div class="metric-list">
            ${pillar.mechanisms.map(mechanism => `
                <div style="margin-bottom: 30px;">
                    <h5 style="color: #1e40af; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                        ${mechanism.name} Metrics
                    </h5>
                    ${mechanism.metrics.map(metric => this.generateMetricItem(metric, notesMap)).join('')}
                </div>
            `).join('')}
        </div>
    </div>`;
  }

  private generateMetricItem(metric: any, notesMap: Map<string, string>): string {
    const notes = notesMap.get(metric.id);
    return `
        <div class="metric-item ${metric.type}">
            <div class="metric-header">
                <span class="metric-name">${metric.name}</span>
                <span class="metric-type ${metric.type}">${metric.type}</span>
                <span class="metric-score ${this.getScoreClass(metric.score)}">${Math.round(metric.score)}%</span>
            </div>
            <div class="metric-details">
                <div class="metric-detail-item">
                    <strong>Mechanism Cap:</strong> ${metric.mechanismCap}%
                </div>
                <div class="metric-detail-item">
                    <strong>Pillar Cap:</strong> ${metric.pillarCap}%
                </div>
            </div>
            ${notes ? `<div class="metric-notes"><strong>Notes:</strong> ${notes}</div>` : ''}
        </div>`;
  }

  private getScoreClass(score: number): string {
    if (score >= 75) return 'score-excellent';
    if (score >= 50) return 'score-good';
    return 'score-poor';
  }

  async generatePDF(assessmentData: AssessmentData, metricNotes?: any[]): Promise<Buffer> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    const page: Page = await this.browser.newPage();

    try {
      const html = await this.generateReportHTML(assessmentData, metricNotes);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  // Helper methods for comparison
  private calculateDiff(value1: number, value2: number): {
    delta: number;
    color: 'green' | 'red' | 'gray';
    bgColor: string;
  } {
    const delta = value2 - value1;
    let color: 'green' | 'red' | 'gray' = 'gray';
    let bgColor = '#f3f4f6'; // gray-100

    if (Math.abs(delta) >= 1) {
      if (delta > 0) {
        color = 'green';
        bgColor = '#d1fae5'; // green-100
      } else {
        color = 'red';
        bgColor = '#fee2e2'; // red-100
      }
    }

    return { delta, color, bgColor };
  }

  private formatDelta(delta: number): string {
    if (Math.abs(delta) < 0.5) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${Math.round(delta)}%`;
  }

  private getDiffClass(value1: number, value2: number): string {
    const delta = value2 - value1;
    if (Math.abs(delta) < 1) return 'diff-neutral';
    return delta > 0 ? 'diff-positive' : 'diff-negative';
  }

  private getDiffStyle(value1: number, value2: number): string {
    const diff = this.calculateDiff(value1, value2);
    return `background-color: ${diff.bgColor};`;
  }

  async generateComparisonPDF(comparisonData: any): Promise<Buffer> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    const page: Page = await this.browser.newPage();

    try {
      const html = await this.generateComparisonHTML(comparisonData);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '10mm',
          bottom: '15mm',
          left: '10mm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async generateComparisonHTML(comparisonData: any): Promise<string> {
    const { assessment1, assessment2, responses1, responses2, framework, notes1, notes2 } = comparisonData;

    // Calculate results for both assessments
    const excludedMechanisms1 = new Set(assessment1.excludedMechanisms || []);
    const excludedMechanisms2 = new Set(assessment2.excludedMechanisms || []);

    const results1 = sharedCalculateResults(framework, responses1, excludedMechanisms1);
    const results2 = sharedCalculateResults(framework, responses2, excludedMechanisms2);

    // Create notes maps
    const notesMap1 = new Map(notes1.map((n: any) => [n.metricId, n.notes]));
    const notesMap2 = new Map(notes2.map((n: any) => [n.metricId, n.notes]));

    // Generate pillar comparison sections
    const pillarSections = results1.pillars.map((pillar1: any) => {
      const pillar2 = results2.pillars.find((p: any) => p.id === pillar1.id);
      if (!pillar2) {
        console.warn(`Pillar ${pillar1.name} (${pillar1.id}) not found in second assessment`);
        return '';
      }
      return this.generatePillarComparisonSection(pillar1, pillar2, excludedMechanisms1, excludedMechanisms2);
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assessment Comparison Report</title>
  <style>
    ${this.getComparisonStyles()}
  </style>
</head>
<body>
  ${this.generateComparisonHeader(assessment1, assessment2)}
  ${this.generateComparisonInfoSection(assessment1, assessment2)}
  ${this.generateOverallScoresComparison(results1, results2)}
  ${this.generatePillarBreakdownTable(results1, results2)}
  ${pillarSections}
  ${this.generateComparisonFooter()}
</body>
</html>
    `;

    return html;
  }

  private getComparisonStyles(): string {
    return `
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 15px;
        background: white;
        color: #333;
        font-size: 11px;
      }

      .header {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 3px solid #2563eb;
        padding-bottom: 15px;
      }

      .header h1 {
        color: #1e40af;
        margin: 0 0 10px 0;
        font-size: 24px;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }

      .assessment-column {
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
      }

      .assessment-column.baseline {
        border-color: #93c5fd;
      }

      .assessment-column.comparison {
        border-color: #86efac;
      }

      .assessment-header {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 2px solid currentColor;
      }

      .info-item {
        margin: 8px 0;
        font-size: 11px;
      }

      .diff-positive {
        background-color: #d1fae5;
        color: #065f46;
      }

      .diff-negative {
        background-color: #fee2e2;
        color: #991b1b;
      }

      .diff-neutral {
        background-color: #f3f4f6;
        color: #374151;
      }

      .score-box {
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        position: relative;
        margin: 10px 0;
      }

      .delta-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: white;
        border: 2px solid currentColor;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: bold;
      }

      .score-comparison-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }

      .score-comparison-table th {
        background: #f1f5f9;
        padding: 8px;
        text-align: left;
        font-weight: 600;
        font-size: 10px;
        border-bottom: 2px solid #cbd5e1;
      }

      .score-comparison-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 10px;
      }

      .section-header {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        padding: 10px 15px;
        margin: 20px 0 10px 0;
        border-radius: 6px;
        border-left: 4px solid #2563eb;
        font-weight: bold;
        font-size: 14px;
        color: #1e40af;
        page-break-after: avoid;
      }

      .mechanism-comparison {
        margin: 10px 0;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
        page-break-inside: avoid;
      }

      .mechanism-header {
        background: #f9fafb;
        padding: 8px 12px;
        font-weight: 600;
        border-bottom: 1px solid #e5e7eb;
      }

      .mechanism-scores {
        display: grid;
        grid-template-columns: 1fr 1fr 120px;
        gap: 10px;
        padding: 10px 12px;
      }

      .metric-comparison {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 120px;
        gap: 8px;
        padding: 6px 12px;
        border-bottom: 1px solid #f3f4f6;
        font-size: 10px;
        align-items: center;
      }

      .metric-name {
        font-weight: 500;
      }

      .metric-score {
        text-align: center;
        padding: 4px;
        border-radius: 4px;
        font-weight: 600;
      }

      .page-break {
        page-break-before: always;
      }

      .avoid-break {
        page-break-inside: avoid;
      }

      .excluded-badge {
        background: #fef3c7;
        color: #92400e;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        margin-left: 8px;
      }
    `;
  }

  private generateComparisonHeader(assessment1: any, assessment2: any): string {
    return `
      <div class="header">
        <h1>Assessment Comparison Report</h1>
        <p style="margin: 0; color: #64748b;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
      </div>
    `;
  }

  private generateComparisonInfoSection(assessment1: any, assessment2: any): string {
    return `
      <div class="comparison-grid">
        <div class="assessment-column baseline">
          <div class="assessment-header" style="color: #2563eb;">
            📋 Baseline: ${assessment1.systemName}
          </div>
          <div class="info-item">
            <strong>Status:</strong> ${assessment1.status}
          </div>
          <div class="info-item">
            <strong>Created:</strong> ${new Date(assessment1.createdAt).toLocaleDateString()}
          </div>
          <div class="info-item">
            <strong>Description:</strong> ${assessment1.systemDescription || 'N/A'}
          </div>
        </div>

        <div class="assessment-column comparison">
          <div class="assessment-header" style="color: #059669;">
            📊 Comparison: ${assessment2.systemName}
          </div>
          <div class="info-item">
            <strong>Status:</strong> ${assessment2.status}
          </div>
          <div class="info-item">
            <strong>Created:</strong> ${new Date(assessment2.createdAt).toLocaleDateString()}
          </div>
          <div class="info-item">
            <strong>Description:</strong> ${assessment2.systemDescription || 'N/A'}
          </div>
        </div>
      </div>
    `;
  }

  private generateOverallScoresComparison(results1: any, results2: any): string {
    const opDiff = this.calculateDiff(results1.overallOperationalScore, results2.overallOperationalScore);
    const desDiff = this.calculateDiff(results1.overallDesignScore, results2.overallDesignScore);

    return `
      <div class="section-header">Overall Assessment Scores</div>

      <div class="comparison-grid">
        <div>
          <h4 style="margin: 10px 0 5px 0; color: #374151;">Operational Score</h4>
          <div class="score-box ${this.getDiffClass(results1.overallOperationalScore, results2.overallOperationalScore)}"
               style="${this.getDiffStyle(results1.overallOperationalScore, results2.overallOperationalScore)}">
            ${Math.round(results1.overallOperationalScore)}% → ${Math.round(results2.overallOperationalScore)}%
            <span class="delta-badge">
              ${this.formatDelta(opDiff.delta)}
            </span>
          </div>
        </div>

        <div>
          <h4 style="margin: 10px 0 5px 0; color: #374151;">Design Score</h4>
          <div class="score-box ${this.getDiffClass(results1.overallDesignScore, results2.overallDesignScore)}"
               style="${this.getDiffStyle(results1.overallDesignScore, results2.overallDesignScore)}">
            ${Math.round(results1.overallDesignScore)}% → ${Math.round(results2.overallDesignScore)}%
            <span class="delta-badge">
              ${this.formatDelta(desDiff.delta)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private generatePillarBreakdownTable(results1: any, results2: any): string {
    const rows = results1.pillars.map((pillar1: any) => {
      const pillar2 = results2.pillars.find((p: any) => p.id === pillar1.id);

      if (!pillar2) {
        return `
          <tr>
            <td style="font-weight: 600;">${pillar1.name}</td>
            <td style="text-align: center;">${Math.round(pillar1.operationalScore)}%</td>
            <td style="text-align: center; color: #6b7280;">N/A</td>
            <td style="text-align: center; background-color: #f3f4f6;">—</td>
            <td style="text-align: center;">${Math.round(pillar1.designScore)}%</td>
            <td style="text-align: center; color: #6b7280;">N/A</td>
            <td style="text-align: center; background-color: #f3f4f6;">—</td>
          </tr>
        `;
      }

      const opDiff = this.calculateDiff(pillar1.operationalScore, pillar2.operationalScore);
      const desDiff = this.calculateDiff(pillar1.designScore, pillar2.designScore);

      return `
        <tr>
          <td style="font-weight: 600;">${pillar1.name}</td>
          <td style="text-align: center;">${Math.round(pillar1.operationalScore)}%</td>
          <td style="text-align: center;">${Math.round(pillar2.operationalScore)}%</td>
          <td style="text-align: center; background-color: ${opDiff.bgColor}; font-weight: bold;">
            ${this.formatDelta(opDiff.delta)}
          </td>
          <td style="text-align: center;">${Math.round(pillar1.designScore)}%</td>
          <td style="text-align: center;">${Math.round(pillar2.designScore)}%</td>
          <td style="text-align: center; background-color: ${desDiff.bgColor}; font-weight: bold;">
            ${this.formatDelta(desDiff.delta)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="section-header">Pillar Breakdown Comparison</div>

      <table class="score-comparison-table">
        <thead>
          <tr>
            <th>Pillar</th>
            <th style="text-align: center;">Baseline Op</th>
            <th style="text-align: center;">Comparison Op</th>
            <th style="text-align: center;">Change</th>
            <th style="text-align: center;">Baseline Des</th>
            <th style="text-align: center;">Comparison Des</th>
            <th style="text-align: center;">Change</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private generatePillarComparisonSection(pillar1: any, pillar2: any, excludedMechanisms1: Set<string>, excludedMechanisms2: Set<string>): string {
    const mechanismComparisons: string[] = [];
    const processedMechIds = new Set<string>();

    // Process mechanisms from pillar1
    pillar1.mechanisms.forEach((mech1: any) => {
      const mech2 = pillar2.mechanisms.find((m: any) => m.id === mech1.id);
      processedMechIds.add(mech1.id);

      if (mech2) {
        mechanismComparisons.push(this.generateMechanismComparison(mech1, mech2, excludedMechanisms1, excludedMechanisms2));
      } else {
        // Mechanism exists in pillar1 but not pillar2
        mechanismComparisons.push(this.generateMissingMechanismComparison(mech1, 'baseline', excludedMechanisms1));
      }
    });

    // Process mechanisms from pillar2 that weren't in pillar1
    pillar2.mechanisms.forEach((mech2: any) => {
      if (!processedMechIds.has(mech2.id)) {
        mechanismComparisons.push(this.generateMissingMechanismComparison(mech2, 'comparison', excludedMechanisms2));
      }
    });

    return `
      <div class="page-break"></div>
      <div class="section-header">${pillar1.name} - Detailed Comparison</div>
      ${mechanismComparisons.join('')}
    `;
  }

  private generateMissingMechanismComparison(mech: any, side: 'baseline' | 'comparison', excludedMechanisms: Set<string>): string {
    const isExcluded = excludedMechanisms.has(mech.id);
    const sideName = side === 'baseline' ? 'Baseline' : 'Comparison';

    return `
      <div class="mechanism-comparison avoid-break">
        <div class="mechanism-header">
          ${mech.name}
          <span class="excluded-badge" style="background: #fef3c7; color: #92400e;">Only in ${sideName}</span>
          ${isExcluded ? '<span class="excluded-badge">Excluded</span>' : ''}
        </div>

        <div class="mechanism-scores">
          <div>
            <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Operational</div>
            <div class="score-box diff-neutral" style="font-size: 12px;">
              ${side === 'baseline' ? `${Math.round(mech.operationalScore)}% → N/A` : `N/A → ${Math.round(mech.operationalScore)}%`}
            </div>
          </div>

          <div>
            <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Design</div>
            <div class="score-box diff-neutral" style="font-size: 12px;">
              ${side === 'baseline' ? `${Math.round(mech.designScore)}% → N/A` : `N/A → ${Math.round(mech.designScore)}%`}
            </div>
          </div>

          <div>
            <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Changes</div>
            <div style="font-size: 10px; color: #6b7280;">
              Not comparable
            </div>
          </div>
        </div>

        <div style="background: #fafafa; padding: 10px; margin-top: 10px;">
          <div style="text-align: center; color: #6b7280; font-size: 10px; padding: 8px;">
            This mechanism only exists in the ${sideName.toLowerCase()} assessment
          </div>
        </div>
      </div>
    `;
  }

  private generateMechanismComparison(mech1: any, mech2: any, excludedMechanisms1: Set<string>, excludedMechanisms2: Set<string>): string {
    const opDiff = this.calculateDiff(mech1.operationalScore, mech2.operationalScore);
    const desDiff = this.calculateDiff(mech1.designScore, mech2.designScore);

    const isExcluded1 = excludedMechanisms1.has(mech1.id);
    const isExcluded2 = excludedMechanisms2.has(mech2.id);

    // Generate metric comparisons (only show if there's a change)
    const metricComparisons: string[] = [];

    // First, process all metrics from mech1
    mech1.metrics.forEach((metric1: any) => {
      // Find the corresponding metric in mech2 by ID
      const metric2 = mech2.metrics.find((m: any) => m.id === metric1.id);

      // If metric doesn't exist in second assessment, show N/A
      if (!metric2) {
        metricComparisons.push(`
          <div class="metric-comparison">
            <div class="metric-name">
              ${metric1.name}
              <span style="color: #6b7280; font-size: 9px;">(${metric1.type})</span>
            </div>

            <div class="metric-score" style="background: #f3f4f6;">
              ${Math.round(metric1.score)}%
            </div>

            <div class="metric-score" style="background: #f3f4f6; color: #6b7280;">
              N/A
            </div>

            <div class="metric-score" style="background: #f3f4f6;">
              —
            </div>
          </div>
        `);
        return;
      }

      const metricDiff = this.calculateDiff(metric1.score, metric2.score);

      // Only show metrics with changes >= 1%
      if (Math.abs(metricDiff.delta) < 1) return;

      metricComparisons.push(`
        <div class="metric-comparison">
          <div class="metric-name">
            ${metric1.name}
            <span style="color: #6b7280; font-size: 9px;">(${metric1.type})</span>
          </div>

          <div class="metric-score" style="background: #f3f4f6;">
            ${Math.round(metric1.score)}%
          </div>

          <div class="metric-score" style="background: #f3f4f6;">
            ${Math.round(metric2.score)}%
          </div>

          <div class="metric-score" style="background-color: ${metricDiff.bgColor}; font-weight: bold;">
            ${this.formatDelta(metricDiff.delta)}
          </div>
        </div>
      `);
    });

    // Then, process metrics that exist in mech2 but not in mech1
    mech2.metrics.forEach((metric2: any) => {
      const metric1 = mech1.metrics.find((m: any) => m.id === metric2.id);

      // Only show if metric doesn't exist in mech1
      if (!metric1) {
        metricComparisons.push(`
          <div class="metric-comparison">
            <div class="metric-name">
              ${metric2.name}
              <span style="color: #6b7280; font-size: 9px;">(${metric2.type})</span>
            </div>

            <div class="metric-score" style="background: #f3f4f6; color: #6b7280;">
              N/A
            </div>

            <div class="metric-score" style="background: #f3f4f6;">
              ${Math.round(metric2.score)}%
            </div>

            <div class="metric-score" style="background: #f3f4f6;">
              —
            </div>
          </div>
        `);
      }
    });

    const metricRows = metricComparisons.join('');

    const noChangesMessage = metricRows === '' ? '<div style="text-align: center; color: #6b7280; font-size: 10px; padding: 8px;">No significant metric changes</div>' : '';

    return `
      <div class="mechanism-comparison avoid-break">
        <div class="mechanism-header">
          ${mech1.name}
          ${isExcluded1 ? '<span class="excluded-badge">Excluded in Baseline</span>' : ''}
          ${isExcluded2 ? '<span class="excluded-badge">Excluded in Comparison</span>' : ''}
        </div>

        <div class="mechanism-scores">
          <div>
            <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Operational</div>
            <div class="score-box ${this.getDiffClass(mech1.operationalScore, mech2.operationalScore)}"
                 style="font-size: 12px; ${this.getDiffStyle(mech1.operationalScore, mech2.operationalScore)}">
              ${Math.round(mech1.operationalScore)}% → ${Math.round(mech2.operationalScore)}%
            </div>
          </div>

          <div>
            <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Design</div>
            <div class="score-box ${this.getDiffClass(mech1.designScore, mech2.designScore)}"
                 style="font-size: 12px; ${this.getDiffStyle(mech1.designScore, mech2.designScore)}">
              ${Math.round(mech1.designScore)}% → ${Math.round(mech2.designScore)}%
            </div>
          </div>

          <div>
            <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Changes</div>
            <div style="font-size: 10px;">
              <div style="font-weight: bold; color: ${opDiff.color};">
                Op: ${this.formatDelta(opDiff.delta)}
              </div>
              <div style="font-weight: bold; color: ${desDiff.color};">
                Des: ${this.formatDelta(desDiff.delta)}
              </div>
            </div>
          </div>
        </div>

        <div style="background: #fafafa; padding: 10px; margin-top: 10px;">
          <div style="font-weight: 600; font-size: 10px; margin-bottom: 8px; color: #475569;">
            Metric-Level Changes
          </div>

          ${metricRows}
          ${noChangesMessage}
        </div>
      </div>
    `;
  }

  private generateComparisonFooter(): string {
    return `
      <div class="footer" style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 10px;">
        <p>Trustworthiness Framework Assessment Tool - Comparison Report</p>
      </div>
    `;
  }
}

export const pdfService = new PDFService();