import { describe, it, expect, vi } from 'vitest'
import { calculateMetricScore, applyMetricCaps } from '../shared/scoreCalculation'

describe('Score Calculation Functions', () => {
  describe('applyMetricCaps', () => {
    it('should apply operational caps when operational metrics score below 50%', () => {
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

      const mockCalculateScore = vi.fn((metric: any) => {
        return metric.type === 'operational' ? 40 : 70
      })

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.operationalScore).toBe(80) // Capped to mechanism cap
      expect(mechanism.isCapped).toBe(true)
      expect(mechanism.cappingMetrics).toHaveLength(1)
      expect(result.operationalMechanismCap).toBe(80)
      expect(result.operationalPillarCap).toBe(85)
    })

    it('should apply design caps when design metrics score below 50%', () => {
      const mechanism: any = {
        operationalScore: 90,
        designScore: 95,
        metrics: [
          {
            type: 'design',
            mechanismCap: '75',
            pillarCap: '80',
            questions: [{ id: '1' }]
          }
        ]
      }

      const mockCalculateScore = vi.fn((metric: any) => {
        return metric.type === 'design' ? 30 : 70
      })

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.designScore).toBe(75) // Capped to mechanism cap
      expect(mechanism.isCapped).toBe(true)
      expect(result.designMechanismCap).toBe(75)
      expect(result.designPillarCap).toBe(80)
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

      const mockCalculateScore = vi.fn(() => 70) // Above 50% threshold

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

      const mockCalculateScore = vi.fn(() => 50)

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

      const mockCalculateScore = vi.fn(() => 40) // Below threshold but no caps

      const result = applyMetricCaps(mechanism, {}, mockCalculateScore)

      expect(mechanism.operationalScore).toBe(90) // No capping with missing values
      expect(result.operationalMechanismCap).toBe(100)
      expect(result.operationalPillarCap).toBe(100)
    })
  })
})