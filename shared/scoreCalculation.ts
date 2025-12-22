import type { PillarWithMechanisms, AssessmentResponse } from "@shared/schema";

export interface ResultsData {
  pillars: Array<{
    id: string;
    name: string;
    code: string;
    icon?: string;
    operationalScore: number;
    designScore: number;
    isCapped?: boolean;
    cappingMechanisms?: any[];
    mechanisms: Array<{
      id: string;
      name: string;
      code: string;
      operationalScore: number;
      designScore: number;
      isCapped?: boolean;
      cappingMetrics?: any[];
      metrics: Array<{
        id: string;
        name: string;
        code: string;
        type: string;
        score: number;
        mechanismCap: number;
        pillarCap: number;
      }>;
    }>;
  }>;
}

/**
 * Calculate the score for a metric based on responses
 */
export const calculateMetricScore = (metric: any, responseMap: Map<string, any>): number => {
  if (!metric) return 0;

  const response = responseMap.get(metric.id);
  if (!response) return 0;

  if (metric.metricType === "boolean") {
    return response.answer ? 100 : 0;
  } else if (metric.metricType === "percentage") {
    return response.answerValue || 0;
  }

  return 0;
};

/**
 * Apply mechanism-level capping based on low-scoring metrics
 */
export function applyMetricCaps(mechanism: any, pillar: any, calculateScore: (metric: any) => number) {
  if (!mechanism.metrics || !Array.isArray(mechanism.metrics)) {
    mechanism.operationalScore = mechanism.operationalScore || 0;
    mechanism.designScore = mechanism.designScore || 0;
    mechanism.isCapped = false;
    mechanism.cappingMetrics = [];
    return {
      operationalMechanismCap: 100,
      operationalPillarCap: 100,
      designMechanismCap: 100,
      designPillarCap: 100
    };
  }

  // Find metrics with score < 50% separated by type
  const lowOperationalMetrics = mechanism.metrics.filter((metric: any) => 
    metric.type === "operational" && calculateScore(metric) < 50
  );
  const lowDesignMetrics = mechanism.metrics.filter((metric: any) => 
    metric.type === "design" && calculateScore(metric) < 50
  );

  const originalOperationalScore = mechanism.operationalScore || 0;
  const originalDesignScore = mechanism.designScore || 0;
  
  let operationalCapped = false;
  let designCapped = false;
  let operationalMechanismCap = 100;
  let operationalPillarCap = 100;
  let designMechanismCap = 100;
  let designPillarCap = 100;

  // Apply caps for operational score based on operational metrics
  if (lowOperationalMetrics.length > 0) {
    operationalMechanismCap = Math.min(...lowOperationalMetrics.map((m: any) => 
      parseFloat(m.mechanismCap) || 100
    ));
    operationalPillarCap = Math.min(...lowOperationalMetrics.map((m: any) => 
      parseFloat(m.pillarCap) || 100
    ));
    
    mechanism.operationalScore = Math.min(originalOperationalScore, operationalMechanismCap);
    operationalCapped = originalOperationalScore > operationalMechanismCap && operationalMechanismCap < 100;
  }

  // Apply caps for design score based on design metrics
  if (lowDesignMetrics.length > 0) {
    designMechanismCap = Math.min(...lowDesignMetrics.map((m: any) => 
      parseFloat(m.mechanismCap) || 100
    ));
    designPillarCap = Math.min(...lowDesignMetrics.map((m: any) => 
      parseFloat(m.pillarCap) || 100
    ));
    
    mechanism.designScore = Math.min(originalDesignScore, designMechanismCap);
    designCapped = originalDesignScore > designMechanismCap && designMechanismCap < 100;
  }

  // Store cap information for alerts
  mechanism.isCapped = operationalCapped || designCapped;
  mechanism.appliedOperationalMechanismCap = operationalMechanismCap;
  mechanism.appliedOperationalPillarCap = operationalPillarCap;
  mechanism.appliedDesignMechanismCap = designMechanismCap;
  mechanism.appliedDesignPillarCap = designPillarCap;
  
  // Combine capping metrics from both types
  const allLowMetrics = [...lowOperationalMetrics, ...lowDesignMetrics];
  mechanism.cappingMetrics = allLowMetrics
    .filter(m => (parseFloat(m.mechanismCap) || 100) < 100 || (parseFloat(m.pillarCap) || 100) < 100)
    .map(m => ({
      ...m,
      score: calculateScore(m)
    }));

  return {
    operationalMechanismCap,
    operationalPillarCap,
    designMechanismCap,
    designPillarCap
  };
}

/**
 * Calculate assessment results with scoring and capping
 */
export function calculateResults(
  framework: PillarWithMechanisms[],
  responses: AssessmentResponse[],
  excludedMechanismIds: Set<string> = new Set()
): ResultsData {
  const responseMap = new Map<string, any>();
  responses.forEach((response: AssessmentResponse) => {
    responseMap.set(response.metricId, response);
  });

  const pillars = framework.map((pillar: PillarWithMechanisms) => {
    const mechanisms = pillar.mechanisms
      .filter(mechanism => !excludedMechanismIds.has(mechanism.id)) // Skip excluded mechanisms
      .map(mechanism => {
        const operationalMetrics = mechanism.metrics.filter(m => m.type === "operational");
        const designMetrics = mechanism.metrics.filter(m => m.type === "design");

        const calculateScore = (metric: any) => calculateMetricScore(metric, responseMap);

        // Calculate weighted average scores using metric weights
        const totalOperationalWeight = operationalMetrics.reduce((sum, m) => sum + (m.weight || 1.0), 0);
        const totalDesignWeight = designMetrics.reduce((sum, m) => sum + (m.weight || 1.0), 0);

        const operationalScore = totalOperationalWeight > 0
          ? operationalMetrics.reduce((sum, metric) => sum + (calculateScore(metric) * (metric.weight || 1.0)), 0) / totalOperationalWeight
          : 0;

        const designScore = totalDesignWeight > 0
          ? designMetrics.reduce((sum, metric) => sum + (calculateScore(metric) * (metric.weight || 1.0)), 0) / totalDesignWeight
          : 0;

        const metrics = mechanism.metrics.map(metric => {
          const mechanismCap = typeof metric.mechanismCap === 'number' ? metric.mechanismCap : (parseFloat(String(metric.mechanismCap)) ?? 100);
          const pillarCap = typeof metric.pillarCap === 'number' ? metric.pillarCap : (parseFloat(String(metric.pillarCap)) ?? 100);
          const score = calculateScore(metric);

          return {
            ...metric,
            mechanismCap,
            pillarCap,
            score,
          };
        });

        const mechanismData = {
          id: mechanism.id,
          name: mechanism.name,
          code: mechanism.code,
          description: mechanism.description,
          operationalScore,
          designScore,
          operationalWeight: mechanism.operationalWeight || 1.0,
          designWeight: mechanism.designWeight || 1.0,
          metrics,
        };

        // Apply mechanism caps based on low-performing metrics
        applyMetricCaps(mechanismData, pillar, calculateScore);

        return mechanismData;
      });

    // Calculate weighted average scores using mechanism weights
    const totalOperationalWeight = mechanisms.reduce((sum, m) => sum + (m.operationalWeight || 1.0), 0);
    const totalDesignWeight = mechanisms.reduce((sum, m) => sum + (m.designWeight || 1.0), 0);

    let operationalScore = totalOperationalWeight > 0
      ? mechanisms.reduce((sum, m) => sum + (m.operationalScore * (m.operationalWeight || 1.0)), 0) / totalOperationalWeight
      : 0;

    let designScore = totalDesignWeight > 0
      ? mechanisms.reduce((sum, m) => sum + (m.designScore * (m.designWeight || 1.0)), 0) / totalDesignWeight
      : 0;

    // Apply pillar caps from mechanisms with applied caps
    let pillarOperationalCapped = false;
    let pillarDesignCapped = false;
    let pillarCappingMechanisms: any[] = [];

    mechanisms.forEach(m => {
      const hasCappingMetrics = m.metrics.some(metric =>
        metric.score < 50 && (metric.mechanismCap < 100 || metric.pillarCap < 100)
      );

      if (hasCappingMetrics) {
        pillarCappingMechanisms.push(m);
        operationalScore = Math.min(operationalScore, 85);
        designScore = Math.min(designScore, 85);
        pillarOperationalCapped = true;
        pillarDesignCapped = true;
      }
    });

    return {
      id: pillar.id,
      name: pillar.name,
      code: pillar.code,
      icon: pillar.icon || undefined,
      operationalScore,
      designScore,
      isCapped: pillarOperationalCapped || pillarDesignCapped,
      cappingMechanisms: pillarCappingMechanisms,
      mechanisms,
    };
  });

  const overallOperationalScore = pillars.length > 0
    ? pillars.reduce((sum, p) => sum + p.operationalScore, 0) / pillars.length
    : 0;

  const overallDesignScore = pillars.length > 0
    ? pillars.reduce((sum, p) => sum + p.designScore, 0) / pillars.length
    : 0;

  return {
    pillars,
    overallOperationalScore,
    overallDesignScore,
  };
}