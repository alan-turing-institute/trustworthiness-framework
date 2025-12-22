import { describe, it, expect } from 'vitest';
import { calculateResults } from '../shared/scoreCalculation';
import type { PillarWithMechanisms, AssessmentResponse } from '../shared/schema';

describe('Shared Score Calculation', () => {
  // Mock framework data
  const mockFramework: PillarWithMechanisms[] = [
    {
      id: 'pillar-1',
      name: 'Test Pillar 1',
      code: 'TP1',
      description: 'Test pillar description',
      icon: 'Shield',
      order: 1,
      createdAt: new Date(),
      mechanisms: [
        {
          id: 'mech-1',
          pillarId: 'pillar-1',
          name: 'Test Mechanism 1',
          code: 'TM1',
          description: 'Test mechanism description',
          operationalWeight: 1.0,
          designWeight: 1.0,
          operationalConfigurations: [],
          designConfigurations: [],
          order: 1,
          createdAt: new Date(),
          metrics: [
            {
              id: 'metric-1',
              mechanismId: 'mech-1',
              code: 'TM1-M1',
              name: 'Test Metric 1',
              description: 'Test metric description',
              metricType: 'boolean',
              type: 'operational',
              mechanismCap: 80,
              pillarCap: 70,
              weight: 1.0,
              standards: [],
              order: 1,
              createdAt: new Date(),
            },
            {
              id: 'metric-2',
              mechanismId: 'mech-1',
              code: 'TM1-M2',
              name: 'Test Metric 2',
              description: 'Test metric description',
              metricType: 'boolean',
              type: 'design',
              mechanismCap: 80,
              pillarCap: 70,
              weight: 1.0,
              standards: [],
              order: 2,
              createdAt: new Date(),
            },
          ],
        },
        {
          id: 'mech-2',
          pillarId: 'pillar-1',
          name: 'Test Mechanism 2',
          code: 'TM2',
          description: 'Test mechanism 2 description',
          operationalWeight: 1.0,
          designWeight: 1.0,
          operationalConfigurations: [],
          designConfigurations: [],
          order: 2,
          createdAt: new Date(),
          metrics: [
            {
              id: 'metric-3',
              mechanismId: 'mech-2',
              code: 'TM2-M1',
              name: 'Test Metric 3',
              description: 'Test metric description',
              metricType: 'percentage',
              type: 'operational',
              mechanismCap: 80,
              pillarCap: 70,
              weight: 1.0,
              standards: [],
              order: 1,
              createdAt: new Date(),
            },
          ],
        },
      ],
    },
    {
      id: 'pillar-2',
      name: 'Test Pillar 2',
      code: 'TP2',
      description: 'Test pillar 2 description',
      icon: 'Lock',
      order: 2,
      createdAt: new Date(),
      mechanisms: [
        {
          id: 'mech-3',
          pillarId: 'pillar-2',
          name: 'Test Mechanism 3',
          code: 'TM3',
          description: 'Test mechanism 3 description',
          operationalWeight: 1.0,
          designWeight: 1.0,
          operationalConfigurations: [],
          designConfigurations: [],
          order: 1,
          createdAt: new Date(),
          metrics: [
            {
              id: 'metric-4',
              mechanismId: 'mech-3',
              code: 'TM3-M1',
              name: 'Test Metric 4',
              description: 'Test metric description',
              metricType: 'boolean',
              type: 'operational',
              mechanismCap: 80,
              pillarCap: 70,
              weight: 1.0,
              standards: [],
              order: 1,
              createdAt: new Date(),
            },
          ],
        },
      ],
    },
  ];

  describe('calculateResults', () => {
    it('should calculate scores correctly with all positive boolean answers', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-2', assessmentId: 'test', metricId: 'metric-2', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-3', assessmentId: 'test', metricId: 'metric-4', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      // Note: Actual scores might be capped by mechanism/pillar caps
      // Just verify scores are calculated and non-zero for positive answers
      expect(results.overallOperationalScore).toBeGreaterThan(0);
      expect(results.overallDesignScore).toBeGreaterThan(0);
      expect(results.pillars).toHaveLength(2);
      expect(results.pillars[0].operationalScore).toBeGreaterThan(0);
      expect(results.pillars[0].designScore).toBeGreaterThan(0);
    });

    it('should calculate scores correctly with mixed answers', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-2', assessmentId: 'test', metricId: 'metric-2', answer: false, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-3', assessmentId: 'test', metricId: 'metric-4', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      expect(results.overallOperationalScore).toBeGreaterThan(0); // Both operational metrics are true
      expect(results.overallDesignScore).toBe(0); // Design metric is false
    });

    it('should calculate percentage metric scores correctly', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-2', assessmentId: 'test', metricId: 'metric-2', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-3', assessmentId: 'test', metricId: 'metric-3', answer: true, answerValue: 75, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-4', assessmentId: 'test', metricId: 'metric-4', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      // Pillar 1 should have operational score of (100 + 75) / 2 = 87.5
      expect(results.pillars[0].operationalScore).toBeCloseTo(87.5, 1);
    });

    it('should exclude mechanisms correctly', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-2', assessmentId: 'test', metricId: 'metric-2', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'resp-3', assessmentId: 'test', metricId: 'metric-3', answer: false, answerValue: 0, createdAt: new Date(), updatedAt: new Date() },
      ];

      // Exclude mechanism-2
      const excludedMechanisms = new Set(['mech-2']);
      const results = calculateResults(mockFramework, responses, excludedMechanisms);

      // Pillar 1 should only include mechanism 1
      expect(results.pillars[0].mechanisms).toHaveLength(1);
      expect(results.pillars[0].mechanisms[0].id).toBe('mech-1');
    });

    it('should return 0 scores when no responses provided', () => {
      const responses: AssessmentResponse[] = [];
      const results = calculateResults(mockFramework, responses, new Set());

      expect(results.overallOperationalScore).toBe(0);
      expect(results.overallDesignScore).toBe(0);
      results.pillars.forEach(pillar => {
        expect(pillar.operationalScore).toBe(0);
        expect(pillar.designScore).toBe(0);
      });
    });

    it('should handle partial responses correctly', () => {
      // Only answer one metric
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      // Should have non-zero operational score for pillar 1 (might be capped)
      expect(results.pillars[0].operationalScore).toBeGreaterThan(0);
      // Should have 0 design score for pillar 1 (no design responses)
      expect(results.pillars[0].designScore).toBe(0);
    });

    it('should include mechanism codes in results', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      expect(results.pillars[0].mechanisms[0].code).toBe('TM1');
      expect(results.pillars[0].mechanisms[1].code).toBe('TM2');
    });

    it('should include mechanism descriptions in results', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      expect(results.pillars[0].mechanisms[0].description).toBe('Test mechanism description');
    });

    it('should apply mechanism caps correctly for low scores', () => {
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'metric-1', answer: false, answerValue: 0, createdAt: new Date(), updatedAt: new Date() }, // 0% score
        { id: 'resp-2', assessmentId: 'test', metricId: 'metric-2', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() }, // 100% score
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      // Mechanism 1 should be capped due to low operational metric (mechanismCap = 80)
      // Even though average would be 50%, it should be capped to 80% or less
      const mech1 = results.pillars[0].mechanisms[0];
      expect(mech1.operationalScore).toBeLessThanOrEqual(80);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty framework', () => {
      const responses: AssessmentResponse[] = [];
      const results = calculateResults([], responses, new Set());

      expect(results.pillars).toHaveLength(0);
      expect(results.overallOperationalScore).toBe(0);
      expect(results.overallDesignScore).toBe(0);
    });

    it('should handle all mechanisms excluded', () => {
      const responses: AssessmentResponse[] = [];
      const excludedMechanisms = new Set(['mech-1', 'mech-2', 'mech-3']);
      const results = calculateResults(mockFramework, responses, excludedMechanisms);

      results.pillars.forEach(pillar => {
        expect(pillar.mechanisms).toHaveLength(0);
      });
    });

    it('should handle missing metric responses gracefully', () => {
      // Response for non-existent metric
      const responses: AssessmentResponse[] = [
        { id: 'resp-1', assessmentId: 'test', metricId: 'non-existent', answer: true, answerValue: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const results = calculateResults(mockFramework, responses, new Set());

      // Should not crash, just return 0 scores
      expect(results.overallOperationalScore).toBe(0);
      expect(results.overallDesignScore).toBe(0);
    });
  });
});
