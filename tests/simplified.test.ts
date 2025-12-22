import { describe, it, expect } from 'vitest'
import { calculateMetricScore, applyMetricCaps } from '../shared/scoreCalculation'

describe('Core Score Calculation Tests', () => {
  describe('applyMetricCaps', () => {
    it('should apply caps when metrics score below 50%', () => {
      const mechanism: any = {
        operationalScore: 90,
        designScore: 95,
        metrics: [
          {
            type: 'operational',
            mechanismCap: '80',
            pillarCap: '85',
            questions: [{ id: '1' }, { id: '2' }]
          }
        ]
      }

      const mockCalculateScore = (metric: any) => {
        return 40 // Below 50% threshold
      }

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.operationalScore).toBe(80) // Capped to mechanism cap
      expect(mechanism.isCapped).toBe(true)
      expect(mechanism.cappingMetrics).toHaveLength(1)
      expect(result.operationalMechanismCap).toBe(80)
    })

    it('should not apply caps when metrics score above 50%', () => {
      const mechanism: any = {
        operationalScore: 90,
        designScore: 95,
        metrics: [
          {
            type: 'operational',
            mechanismCap: '80',
            pillarCap: '85',
            questions: [{ id: '1' }, { id: '2' }]
          }
        ]
      }

      const mockCalculateScore = (metric: any) => {
        return 70 // Above 50% threshold
      }

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.operationalScore).toBe(90) // No capping
      expect(mechanism.isCapped).toBe(false)
      expect(mechanism.cappingMetrics).toHaveLength(0)
    })

    it('should handle mechanisms with no metrics', () => {
      const mechanism: any = {
        operationalScore: 90,
        designScore: 95,
        metrics: []
      }

      const mockCalculateScore = (metric: any) => 50

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.operationalScore).toBe(90)
      expect(mechanism.isCapped).toBe(false)
      expect(result.operationalMechanismCap).toBe(100)
    })

    it('should handle missing cap values gracefully', () => {
      const mechanism: any = {
        operationalScore: 90,
        designScore: 95,
        metrics: [
          {
            type: 'operational',
            // No mechanismCap or pillarCap
            questions: [{ id: '1' }]
          }
        ]
      }

      const mockCalculateScore = (metric: any) => 40

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.operationalScore).toBe(90) // No capping with missing values
      expect(result.operationalMechanismCap).toBe(100)
      expect(result.operationalPillarCap).toBe(100)
    })
  })
})