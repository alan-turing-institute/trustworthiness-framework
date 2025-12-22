import { describe, it, expect } from 'vitest'

// Helper functions for capping alerts
const getOperationalCappingMetrics = (item: any) => {
  if (!item.cappingMetrics) return [];
  return item.cappingMetrics.filter((metric: any) => metric.type === "operational");
};

const getDesignCappingMetrics = (item: any) => {
  if (!item.cappingMetrics) return [];
  return item.cappingMetrics.filter((metric: any) => metric.type === "design");
};

const isOperationalCapped = (item: any) => {
  return getOperationalCappingMetrics(item).length > 0;
};

const isDesignCapped = (item: any) => {
  return getDesignCappingMetrics(item).length > 0;
};

const formatCappingTooltip = (metrics: any[], scoreType: string) => {
  if (metrics.length === 0) return "";
  const metricList = metrics.map(m => `• ${m.name} (${Math.round(m.score)}%)`).join("\n");
  return `${scoreType} score capped by:\n${metricList}`;
};

describe('Capping Helper Functions', () => {
  describe('getOperationalCappingMetrics', () => {
    it('should return operational metrics only', () => {
      const item = {
        cappingMetrics: [
          { type: 'operational', name: 'Op Metric 1' },
          { type: 'design', name: 'Design Metric 1' },
          { type: 'operational', name: 'Op Metric 2' }
        ]
      }

      const result = getOperationalCappingMetrics(item)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Op Metric 1')
      expect(result[1].name).toBe('Op Metric 2')
    })

    it('should return empty array when no capping metrics', () => {
      expect(getOperationalCappingMetrics({})).toEqual([])
      expect(getOperationalCappingMetrics({ cappingMetrics: null })).toEqual([])
      expect(getOperationalCappingMetrics({ cappingMetrics: undefined })).toEqual([])
    })

    it('should return empty array when no operational metrics', () => {
      const item = {
        cappingMetrics: [
          { type: 'design', name: 'Design Metric 1' },
          { type: 'design', name: 'Design Metric 2' }
        ]
      }

      expect(getOperationalCappingMetrics(item)).toEqual([])
    })
  })

  describe('getDesignCappingMetrics', () => {
    it('should return design metrics only', () => {
      const item = {
        cappingMetrics: [
          { type: 'operational', name: 'Op Metric 1' },
          { type: 'design', name: 'Design Metric 1' },
          { type: 'design', name: 'Design Metric 2' }
        ]
      }

      const result = getDesignCappingMetrics(item)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Design Metric 1')
      expect(result[1].name).toBe('Design Metric 2')
    })

    it('should return empty array when no design metrics', () => {
      const item = {
        cappingMetrics: [
          { type: 'operational', name: 'Op Metric 1' }
        ]
      }

      expect(getDesignCappingMetrics(item)).toEqual([])
    })
  })

  describe('isOperationalCapped', () => {
    it('should return true when operational capping metrics exist', () => {
      const item = {
        cappingMetrics: [
          { type: 'operational', name: 'Op Metric 1' },
          { type: 'design', name: 'Design Metric 1' }
        ]
      }

      expect(isOperationalCapped(item)).toBe(true)
    })

    it('should return false when no operational capping metrics exist', () => {
      const item = {
        cappingMetrics: [
          { type: 'design', name: 'Design Metric 1' }
        ]
      }

      expect(isOperationalCapped(item)).toBe(false)
    })

    it('should return false when no capping metrics exist', () => {
      expect(isOperationalCapped({})).toBe(false)
      expect(isOperationalCapped({ cappingMetrics: [] })).toBe(false)
    })
  })

  describe('isDesignCapped', () => {
    it('should return true when design capping metrics exist', () => {
      const item = {
        cappingMetrics: [
          { type: 'design', name: 'Design Metric 1' },
          { type: 'operational', name: 'Op Metric 1' }
        ]
      }

      expect(isDesignCapped(item)).toBe(true)
    })

    it('should return false when no design capping metrics exist', () => {
      const item = {
        cappingMetrics: [
          { type: 'operational', name: 'Op Metric 1' }
        ]
      }

      expect(isDesignCapped(item)).toBe(false)
    })
  })

  describe('formatCappingTooltip', () => {
    it('should format single metric correctly', () => {
      const metrics = [
        { name: 'Test Metric', score: 42.7 }
      ]

      const result = formatCappingTooltip(metrics, 'Operational')
      expect(result).toBe('Operational score capped by:\n• Test Metric (43%)')
    })

    it('should format multiple metrics correctly', () => {
      const metrics = [
        { name: 'Metric 1', score: 35.2 },
        { name: 'Metric 2', score: 48.9 }
      ]

      const result = formatCappingTooltip(metrics, 'Design')
      expect(result).toBe('Design score capped by:\n• Metric 1 (35%)\n• Metric 2 (49%)')
    })

    it('should return empty string for no metrics', () => {
      expect(formatCappingTooltip([], 'Operational')).toBe('')
    })

    it('should round scores correctly', () => {
      const metrics = [
        { name: 'Low Score', score: 12.4 },
        { name: 'High Score', score: 87.6 }
      ]

      const result = formatCappingTooltip(metrics, 'Test')
      expect(result).toBe('Test score capped by:\n• Low Score (12%)\n• High Score (88%)')
    })
  })
})