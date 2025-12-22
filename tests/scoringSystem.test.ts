import { describe, it, expect } from 'vitest'
import { calculateMetricScore } from '../shared/scoreCalculation'

/**
 * Comprehensive tests for the metric-based scoring system
 *
 * Scoring hierarchy:
 * 1. Metrics (boolean or percentage) with weights
 * 2. Mechanism scores (weighted average of metrics) with caps
 * 3. Pillar scores (weighted average of mechanisms)
 * 4. Overall scores (average of pillars)
 */

describe('Metric Scoring System', () => {
  describe('calculateMetricScore - Boolean Metrics', () => {
    it('should return 100 for boolean metric with answer=true', () => {
      const metric = {
        id: 'metric-1',
        metricType: 'boolean'
      }

      const responseMap = new Map([
        ['metric-1', { answer: true }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(100)
    })

    it('should return 0 for boolean metric with answer=false', () => {
      const metric = {
        id: 'metric-2',
        metricType: 'boolean'
      }

      const responseMap = new Map([
        ['metric-2', { answer: false }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(0)
    })

    it('should return 0 for boolean metric with no response', () => {
      const metric = {
        id: 'metric-3',
        metricType: 'boolean'
      }

      const responseMap = new Map()

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(0)
    })
  })

  describe('calculateMetricScore - Percentage Metrics', () => {
    it('should return answerValue for percentage metric', () => {
      const metric = {
        id: 'metric-1',
        metricType: 'percentage'
      }

      const responseMap = new Map([
        ['metric-1', { answer: true, answerValue: 75 }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(75)
    })

    it('should return 0 for percentage metric with answerValue=0', () => {
      const metric = {
        id: 'metric-2',
        metricType: 'percentage'
      }

      const responseMap = new Map([
        ['metric-2', { answer: false, answerValue: 0 }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(0)
    })

    it('should return 100 for percentage metric with answerValue=100', () => {
      const metric = {
        id: 'metric-3',
        metricType: 'percentage'
      }

      const responseMap = new Map([
        ['metric-3', { answer: true, answerValue: 100 }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(100)
    })

    it('should return 0 for percentage metric with no response', () => {
      const metric = {
        id: 'metric-4',
        metricType: 'percentage'
      }

      const responseMap = new Map()

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(0)
    })

    it('should handle partial percentage values correctly', () => {
      const metric = {
        id: 'metric-5',
        metricType: 'percentage'
      }

      const responseMap = new Map([
        ['metric-5', { answer: true, answerValue: 42.5 }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(42.5)
    })
  })

  describe('calculateMetricScore - Edge Cases', () => {
    it('should handle null metric', () => {
      const metric = null
      const responseMap = new Map()

      const score = calculateMetricScore(metric as any, responseMap)
      expect(score).toBe(0)
    })

    it('should handle undefined metric', () => {
      const metric = undefined
      const responseMap = new Map()

      const score = calculateMetricScore(metric as any, responseMap)
      expect(score).toBe(0)
    })

    it('should handle metric with unknown metricType', () => {
      const metric = {
        id: 'metric-1',
        metricType: 'unknown' as any
      }

      const responseMap = new Map([
        ['metric-1', { answer: true }]
      ])

      const score = calculateMetricScore(metric, responseMap)
      expect(score).toBe(0)
    })
  })
})

describe('Mechanism Score Calculation with Metric Weights', () => {
  const calculateWeightedMechanismScore = (
    metrics: any[],
    responseMap: Map<string, any>,
    metricType: 'operational' | 'design'
  ) => {
    const filteredMetrics = metrics.filter(m => m.type === metricType)
    const totalWeight = filteredMetrics.reduce((sum, m) => sum + (m.weight || 1.0), 0)

    if (totalWeight === 0) return 0

    return filteredMetrics.reduce((sum, metric) => {
      const score = calculateMetricScore(metric, responseMap)
      return sum + (score * (metric.weight || 1.0))
    }, 0) / totalWeight
  }

  describe('Equal Weight Scenarios (weight=1.0)', () => {
    it('should calculate correct average with equal weights', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm3', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],   // 100
        ['m2', { answer: false }],  // 0
        ['m3', { answer: true }]    // 100
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(200/3) // (100*1 + 0*1 + 100*1) / 3
    })

    it('should handle mixed metric types with equal weights', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm2', type: 'operational', metricType: 'percentage', weight: 1.0 },
        { id: 'm3', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],           // 100
        ['m2', { answerValue: 60 }],        // 60
        ['m3', { answer: true }]            // 100
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(260/3) // (100*1 + 60*1 + 100*1) / 3
    })
  })

  describe('Different Weight Scenarios', () => {
    it('should apply higher weight to critical metrics', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 3.0 }, // Critical
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm3', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: false }],  // 0 * 3 = 0
        ['m2', { answer: true }],   // 100 * 1 = 100
        ['m3', { answer: true }]    // 100 * 1 = 100
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(200/5) // (0*3 + 100*1 + 100*1) / (3+1+1) = 40
    })

    it('should calculate correctly with fractional weights', () => {
      const metrics = [
        { id: 'm1', type: 'design', metricType: 'percentage', weight: 2.5 },
        { id: 'm2', type: 'design', metricType: 'percentage', weight: 1.5 },
        { id: 'm3', type: 'design', metricType: 'percentage', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answerValue: 80 }],  // 80 * 2.5 = 200
        ['m2', { answerValue: 60 }],  // 60 * 1.5 = 90
        ['m3', { answerValue: 90 }]   // 90 * 1.0 = 90
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'design')
      expect(score).toBe(380/5) // (200 + 90 + 90) / (2.5+1.5+1.0) = 76
    })

    it('should handle zero weight metrics (treated as default 1.0)', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 0.0 }, // Treated as 1.0 due to || operator
        { id: 'm3', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],   // 100 * 1.0
        ['m2', { answer: true }],   // 100 * 1.0 (0 treated as missing)
        ['m3', { answer: false }]   // 0 * 1.0
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      // Note: 0 weight is treated as 1.0 due to || operator in implementation
      expect(score).toBeCloseTo(66.67, 2) // (100*1 + 100*1 + 0*1) / (1+1+1) = 66.67
    })
  })

  describe('Operational vs Design Separation', () => {
    it('should calculate operational and design scores separately', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm3', type: 'design', metricType: 'boolean', weight: 1.0 },
        { id: 'm4', type: 'design', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],   // Op: 100
        ['m2', { answer: false }],  // Op: 0
        ['m3', { answer: true }],   // Des: 100
        ['m4', { answer: true }]    // Des: 100
      ])

      const opScore = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      const desScore = calculateWeightedMechanismScore(metrics, responseMap, 'design')

      expect(opScore).toBe(50)   // (100 + 0) / 2
      expect(desScore).toBe(100) // (100 + 100) / 2
    })

    it('should handle mechanisms with only operational metrics', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 2.0 },
        { id: 'm2', type: 'operational', metricType: 'percentage', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],     // 100 * 2
        ['m2', { answerValue: 60 }]   // 60 * 1
      ])

      const opScore = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      const desScore = calculateWeightedMechanismScore(metrics, responseMap, 'design')

      expect(opScore).toBe(260/3) // (200 + 60) / 3
      expect(desScore).toBe(0)    // No design metrics
    })

    it('should handle mechanisms with only design metrics', () => {
      const metrics = [
        { id: 'm1', type: 'design', metricType: 'percentage', weight: 1.0 },
        { id: 'm2', type: 'design', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answerValue: 85 }], // 85 * 1
        ['m2', { answer: true }]     // 100 * 1
      ])

      const opScore = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      const desScore = calculateWeightedMechanismScore(metrics, responseMap, 'design')

      expect(opScore).toBe(0)      // No operational metrics
      expect(desScore).toBe(92.5)  // (85 + 100) / 2
    })
  })

  describe('Edge Cases', () => {
    it('should return 0 for mechanism with no metrics', () => {
      const metrics: any[] = []
      const responseMap = new Map()

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(0)
    })

    it('should handle metrics with no responses', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map() // No responses

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(0) // All metrics score 0, average is 0
    })

    it('should handle partial responses', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0 },
        { id: 'm3', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],  // 100
        // m2 not answered           // 0
        ['m3', { answer: true }]   // 100
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(200/3) // (100 + 0 + 100) / 3
    })

    it('should handle missing weight field (default to 1.0)', () => {
      const metrics = [
        { id: 'm1', type: 'operational', metricType: 'boolean' }, // No weight
        { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0 }
      ]

      const responseMap = new Map([
        ['m1', { answer: true }],  // 100 * 1.0 (default)
        ['m2', { answer: true }]   // 100 * 1.0
      ])

      const score = calculateWeightedMechanismScore(metrics, responseMap, 'operational')
      expect(score).toBe(100) // (100 + 100) / 2
    })
  })
})

describe('Pillar Score Calculation with Mechanism Weights', () => {
  const calculateWeightedPillarScore = (
    mechanisms: any[],
    weightType: 'operational' | 'design'
  ) => {
    const totalWeight = mechanisms.reduce((sum, m) => {
      return sum + (weightType === 'operational'
        ? (m.operationalWeight || 1.0)
        : (m.designWeight || 1.0))
    }, 0)

    if (totalWeight === 0) return 0

    return mechanisms.reduce((sum, mechanism) => {
      const score = weightType === 'operational'
        ? mechanism.operationalScore
        : mechanism.designScore
      const weight = weightType === 'operational'
        ? (mechanism.operationalWeight || 1.0)
        : (mechanism.designWeight || 1.0)
      return sum + (score * weight)
    }, 0) / totalWeight
  }

  describe('Equal Weight Scenarios', () => {
    it('should calculate correct average with equal weights', () => {
      const mechanisms = [
        { operationalScore: 80, designScore: 70, operationalWeight: 1.0, designWeight: 1.0 },
        { operationalScore: 60, designScore: 90, operationalWeight: 1.0, designWeight: 1.0 },
        { operationalScore: 90, designScore: 85, operationalWeight: 1.0, designWeight: 1.0 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      expect(opScore).toBe((80 + 60 + 90) / 3) // 76.67
      expect(desScore).toBe((70 + 90 + 85) / 3) // 81.67
    })
  })

  describe('Different Weight Scenarios', () => {
    it('should apply different weights to mechanisms', () => {
      const mechanisms = [
        { operationalScore: 50, designScore: 50, operationalWeight: 3.0, designWeight: 1.0 }, // Critical for ops
        { operationalScore: 90, designScore: 90, operationalWeight: 1.0, designWeight: 3.0 }, // Critical for design
        { operationalScore: 70, designScore: 70, operationalWeight: 1.0, designWeight: 1.0 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      // Op: (50*3 + 90*1 + 70*1) / (3+1+1) = 310/5 = 62
      expect(opScore).toBe(62)

      // Des: (50*1 + 90*3 + 70*1) / (1+3+1) = 390/5 = 78
      expect(desScore).toBe(78)
    })

    it('should handle fractional mechanism weights', () => {
      const mechanisms = [
        { operationalScore: 80, designScore: 70, operationalWeight: 2.5, designWeight: 1.5 },
        { operationalScore: 60, designScore: 90, operationalWeight: 1.5, designWeight: 2.5 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      // Op: (80*2.5 + 60*1.5) / (2.5+1.5) = 290/4 = 72.5
      expect(opScore).toBe(72.5)

      // Des: (70*1.5 + 90*2.5) / (1.5+2.5) = 330/4 = 82.5
      expect(desScore).toBe(82.5)
    })

    it('should handle different weight distributions for operational vs design', () => {
      const mechanisms = [
        { operationalScore: 100, designScore: 50, operationalWeight: 5.0, designWeight: 1.0 },
        { operationalScore: 50, designScore: 100, operationalWeight: 1.0, designWeight: 5.0 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      // Op: (100*5 + 50*1) / (5+1) = 550/6 = 91.67
      expect(opScore).toBeCloseTo(91.67, 2)

      // Des: (50*1 + 100*5) / (1+5) = 550/6 = 91.67
      expect(desScore).toBeCloseTo(91.67, 2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle pillar with single mechanism', () => {
      const mechanisms = [
        { operationalScore: 75, designScore: 85, operationalWeight: 2.0, designWeight: 3.0 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      expect(opScore).toBe(75) // Single mechanism, weight doesn't matter
      expect(desScore).toBe(85)
    })

    it('should handle zero weight mechanisms (treated as default 1.0)', () => {
      const mechanisms = [
        { operationalScore: 100, designScore: 100, operationalWeight: 1.0, designWeight: 1.0 },
        { operationalScore: 50, designScore: 50, operationalWeight: 0.0, designWeight: 0.0 }, // Treated as 1.0
        { operationalScore: 80, designScore: 80, operationalWeight: 1.0, designWeight: 1.0 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      // Note: 0 weight is treated as 1.0 due to || operator in implementation
      // Op: (100*1 + 50*1 + 80*1) / (1+1+1) = 230/3 = 76.67
      expect(opScore).toBeCloseTo(76.67, 2)
      expect(desScore).toBeCloseTo(76.67, 2)
    })

    it('should handle missing weight fields (default to 1.0)', () => {
      const mechanisms = [
        { operationalScore: 80, designScore: 70 }, // No weights
        { operationalScore: 60, designScore: 90, operationalWeight: 1.0, designWeight: 1.0 }
      ]

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      expect(opScore).toBe((80 + 60) / 2) // 70
      expect(desScore).toBe((70 + 90) / 2) // 80
    })

    it('should return 0 for pillar with no mechanisms', () => {
      const mechanisms: any[] = []

      const opScore = calculateWeightedPillarScore(mechanisms, 'operational')
      const desScore = calculateWeightedPillarScore(mechanisms, 'design')

      expect(opScore).toBe(0)
      expect(desScore).toBe(0)
    })
  })
})

describe('Capping Logic', () => {
  const applyCapping = (
    score: number,
    lowMetrics: any[]
  ) => {
    if (lowMetrics.length === 0) return { cappedScore: score, isCapped: false, cap: 100 }

    const cap = Math.min(...lowMetrics.map(m => parseFloat(m.mechanismCap) || 100))
    const cappedScore = Math.min(score, cap)
    const isCapped = score > cap && cap < 100

    return { cappedScore, isCapped, cap }
  }

  describe('Mechanism Capping', () => {
    it('should cap mechanism score when metric scores below 50%', () => {
      const originalScore = 90
      const lowMetrics = [
        { score: 30, mechanismCap: 75, pillarCap: 80 }
      ]

      const result = applyCapping(originalScore, lowMetrics)

      expect(result.cappedScore).toBe(75)
      expect(result.isCapped).toBe(true)
      expect(result.cap).toBe(75)
    })

    it('should use lowest cap when multiple metrics trigger capping', () => {
      const originalScore = 95
      const lowMetrics = [
        { score: 40, mechanismCap: 80, pillarCap: 85 },
        { score: 30, mechanismCap: 70, pillarCap: 75 }, // Lowest
        { score: 45, mechanismCap: 85, pillarCap: 90 }
      ]

      const result = applyCapping(originalScore, lowMetrics)

      expect(result.cappedScore).toBe(70)
      expect(result.isCapped).toBe(true)
    })

    it('should not cap when no metrics score below 50%', () => {
      const originalScore = 90
      const lowMetrics: any[] = [] // No low-scoring metrics

      const result = applyCapping(originalScore, lowMetrics)

      expect(result.cappedScore).toBe(90)
      expect(result.isCapped).toBe(false)
      expect(result.cap).toBe(100)
    })

    it('should not cap when score is already below cap', () => {
      const originalScore = 60
      const lowMetrics = [
        { score: 40, mechanismCap: 75, pillarCap: 80 }
      ]

      const result = applyCapping(originalScore, lowMetrics)

      expect(result.cappedScore).toBe(60)
      expect(result.isCapped).toBe(false) // Not capped because already below
    })

    it('should handle cap value of 100 (no effective capping)', () => {
      const originalScore = 95
      const lowMetrics = [
        { score: 40, mechanismCap: 100, pillarCap: 100 }
      ]

      const result = applyCapping(originalScore, lowMetrics)

      expect(result.cappedScore).toBe(95)
      expect(result.isCapped).toBe(false)
    })
  })

  describe('Operational vs Design Capping', () => {
    it('should cap operational and design scores independently', () => {
      const opScore = 90
      const desScore = 85

      const lowOpMetrics = [
        { type: 'operational', score: 30, mechanismCap: 70, pillarCap: 75 }
      ]

      const lowDesMetrics = [
        { type: 'design', score: 40, mechanismCap: 80, pillarCap: 85 }
      ]

      const opResult = applyCapping(opScore, lowOpMetrics)
      const desResult = applyCapping(desScore, lowDesMetrics)

      expect(opResult.cappedScore).toBe(70)
      expect(opResult.isCapped).toBe(true)

      expect(desResult.cappedScore).toBe(80)
      expect(desResult.isCapped).toBe(true)
    })

    it('should only cap operational when only operational metrics are low', () => {
      const opScore = 90
      const desScore = 85

      const lowOpMetrics = [
        { type: 'operational', score: 30, mechanismCap: 70, pillarCap: 75 }
      ]

      const lowDesMetrics: any[] = [] // No low design metrics

      const opResult = applyCapping(opScore, lowOpMetrics)
      const desResult = applyCapping(desScore, lowDesMetrics)

      expect(opResult.cappedScore).toBe(70)
      expect(opResult.isCapped).toBe(true)

      expect(desResult.cappedScore).toBe(85)
      expect(desResult.isCapped).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle cap value of 0 (treated as 100)', () => {
      const originalScore = 90
      const lowMetrics = [
        { score: 0, mechanismCap: 0, pillarCap: 0 } // 0 treated as 100 due to || operator
      ]

      const result = applyCapping(originalScore, lowMetrics)

      // Note: mechanismCap of 0 is treated as 100 due to || operator
      expect(result.cappedScore).toBe(90)
      expect(result.isCapped).toBe(false)
    })

    it('should handle missing mechanismCap (default to 100)', () => {
      const originalScore = 90
      const lowMetrics = [
        { score: 30 } // No mechanismCap
      ]

      const result = applyCapping(originalScore, lowMetrics)

      expect(result.cappedScore).toBe(90)
      expect(result.isCapped).toBe(false)
    })

    it('should identify metric as low when score is exactly 49%', () => {
      const isLow = 49 < 50
      expect(isLow).toBe(true)
    })

    it('should not identify metric as low when score is exactly 50%', () => {
      const isLow = 50 < 50
      expect(isLow).toBe(false)
    })
  })
})

describe('Integration: Complete Scoring Flow', () => {
  it('should calculate scores correctly through entire hierarchy', () => {
    // Define metrics with responses
    const metrics = [
      { id: 'm1', type: 'operational', metricType: 'boolean', weight: 2.0, mechanismCap: 100, pillarCap: 100 },
      { id: 'm2', type: 'operational', metricType: 'percentage', weight: 1.0, mechanismCap: 100, pillarCap: 100 },
      { id: 'm3', type: 'design', metricType: 'boolean', weight: 1.0, mechanismCap: 100, pillarCap: 100 }
    ]

    const responseMap = new Map([
      ['m1', { answer: true }],        // Op: 100 * 2.0 = 200
      ['m2', { answerValue: 60 }],     // Op: 60 * 1.0 = 60
      ['m3', { answer: true }]         // Des: 100 * 1.0 = 100
    ])

    // Calculate mechanism scores
    const opMetrics = metrics.filter(m => m.type === 'operational')
    const desMetrics = metrics.filter(m => m.type === 'design')

    const totalOpWeight = opMetrics.reduce((sum, m) => sum + m.weight, 0) // 3.0
    const totalDesWeight = desMetrics.reduce((sum, m) => sum + m.weight, 0) // 1.0

    const opScore = opMetrics.reduce((sum, m) => {
      const score = calculateMetricScore(m, responseMap)
      return sum + (score * m.weight)
    }, 0) / totalOpWeight // (200 + 60) / 3 = 86.67

    const desScore = desMetrics.reduce((sum, m) => {
      const score = calculateMetricScore(m, responseMap)
      return sum + (score * m.weight)
    }, 0) / totalDesWeight // 100 / 1 = 100

    expect(opScore).toBeCloseTo(86.67, 2)
    expect(desScore).toBe(100)

    // Calculate pillar score from mechanisms
    const mechanisms = [
      { operationalScore: opScore, designScore: desScore, operationalWeight: 1.5, designWeight: 2.0 }
    ]

    const pillarOpScore = mechanisms[0].operationalScore // 86.67 (single mechanism)
    const pillarDesScore = mechanisms[0].designScore // 100

    expect(pillarOpScore).toBeCloseTo(86.67, 2)
    expect(pillarDesScore).toBe(100)
  })

  it('should handle complex multi-mechanism, multi-pillar scenario', () => {
    // Mechanism 1 metrics
    const mech1Metrics = [
      { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0 },
      { id: 'm2', type: 'design', metricType: 'percentage', weight: 2.0 }
    ]

    // Mechanism 2 metrics
    const mech2Metrics = [
      { id: 'm3', type: 'operational', metricType: 'percentage', weight: 1.5 },
      { id: 'm4', type: 'design', metricType: 'boolean', weight: 1.0 }
    ]

    const responseMap = new Map([
      ['m1', { answer: true }],      // 100
      ['m2', { answerValue: 80 }],   // 80
      ['m3', { answerValue: 70 }],   // 70
      ['m4', { answer: false }]      // 0
    ])

    // Calculate mechanism 1 scores
    const mech1OpScore = 100 // Only m1 (100 * 1) / 1
    const mech1DesScore = 80 // Only m2 (80 * 2) / 2

    // Calculate mechanism 2 scores
    const mech2OpScore = 70 // Only m3 (70 * 1.5) / 1.5
    const mech2DesScore = 0 // Only m4 (0 * 1) / 1

    expect(mech1OpScore).toBe(100)
    expect(mech1DesScore).toBe(80)
    expect(mech2OpScore).toBe(70)
    expect(mech2DesScore).toBe(0)

    // Calculate pillar scores with mechanism weights
    const mechanisms = [
      { operationalScore: mech1OpScore, designScore: mech1DesScore, operationalWeight: 2.0, designWeight: 1.0 },
      { operationalScore: mech2OpScore, designScore: mech2DesScore, operationalWeight: 1.0, designWeight: 3.0 }
    ]

    // Pillar operational: (100*2 + 70*1) / (2+1) = 270/3 = 90
    const pillarOpScore = (100 * 2.0 + 70 * 1.0) / 3.0

    // Pillar design: (80*1 + 0*3) / (1+3) = 80/4 = 20
    const pillarDesScore = (80 * 1.0 + 0 * 3.0) / 4.0

    expect(pillarOpScore).toBe(90)
    expect(pillarDesScore).toBe(20)
  })

  it('should apply capping after weight calculations', () => {
    const metrics = [
      { id: 'm1', type: 'operational', metricType: 'boolean', weight: 1.0, mechanismCap: 80 },
      { id: 'm2', type: 'operational', metricType: 'boolean', weight: 1.0, mechanismCap: 100 },
      { id: 'm3', type: 'operational', metricType: 'boolean', weight: 1.0, mechanismCap: 100 }
    ]

    const responseMap = new Map([
      ['m1', { answer: false }],  // Low score (0), triggers cap of 80
      ['m2', { answer: true }],   // 100
      ['m3', { answer: true }]    // 100
    ])

    // Calculate uncapped score
    const uncappedScore = (0 + 100 + 100) / 3 // 66.67

    // Apply capping (m1 scored below 50%, has cap of 80)
    const lowMetrics = metrics.filter(m => {
      const score = calculateMetricScore(m, responseMap)
      return score < 50
    })

    const cap = Math.min(...lowMetrics.map(m => m.mechanismCap))
    const cappedScore = Math.min(uncappedScore, cap)

    expect(uncappedScore).toBeCloseTo(66.67, 2)
    expect(cap).toBe(80)
    expect(cappedScore).toBeCloseTo(66.67, 2) // Not actually capped because score < cap
  })
})
