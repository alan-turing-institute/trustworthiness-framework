import { useEffect, useRef } from "react";
import { 
  Chart as ChartJS, 
  RadialLinearScale, 
  PointElement, 
  LineElement, 
  Filler, 
  Tooltip, 
  Legend,
  RadarController
} from 'chart.js';

ChartJS.register(
  RadialLinearScale, 
  PointElement, 
  LineElement, 
  Filler, 
  Tooltip, 
  Legend, 
  RadarController
);

interface ResultsData {
  pillars: Array<{
    id: string;
    name: string;
    operationalScore: number;
    designScore: number;
    mechanisms: Array<{
      id: string;
      code: string;
      name: string;
      description?: string;
      operationalScore: number;
      designScore: number;
    }>;
  }>;
  overallOperationalScore: number;
  overallDesignScore: number;
}

interface PolarChartProps {
  data: ResultsData;
  perspective: "both" | "operational" | "design";
  selectedPillar?: string | null;
  onPillarClick?: (pillarId: string | null) => void;
}

export default function PolarChart({ data, perspective, selectedPillar, onPillarClick }: PolarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  console.log('PolarChart received data:', {
    data: data ? {
      pillarsCount: data.pillars?.length || 0,
      firstPillar: data.pillars?.[0]?.name || 'none',
      overallScores: { op: data.overallOperationalScore, design: data.overallDesignScore }
    } : 'NO DATA',
    perspective
  });

  useEffect(() => {
    if (!canvasRef.current) {
      console.log('PolarChart: Canvas ref not ready');
      return;
    }
    
    if (!data || !data.pillars || data.pillars.length === 0) {
      console.log('PolarChart: No data available', { data: !!data, pillars: data?.pillars?.length });
      return;
    }

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // Determine if we're showing pillar overview or mechanism drill-down
    const isdrillDown = selectedPillar !== null && selectedPillar !== undefined;
    const pillarData = isdrillDown ? data.pillars.find(p => p.id === selectedPillar) : null;

    // Use mechanism codes for labels when drilling down, full names for pillars
    const labels = isdrillDown && pillarData
      ? pillarData.mechanisms.map(mechanism => mechanism.code)
      : data.pillars.map(pillar => pillar.name);

    // Store full mechanism data for tooltips when in drill-down mode
    const fullMechanismData = isdrillDown && pillarData
      ? pillarData.mechanisms
      : null;
    
    const datasets = [];

    if (perspective === "both" || perspective === "operational") {
      const operationalData = isdrillDown && pillarData 
        ? pillarData.mechanisms.map(mechanism => mechanism.operationalScore)
        : data.pillars.map(pillar => pillar.operationalScore);
        
      datasets.push({
        label: 'Operational',
        data: operationalData,
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        borderColor: '#1976D2',
        borderWidth: 2,
        pointBackgroundColor: '#1976D2',
        pointBorderColor: '#1976D2',
        pointHoverBackgroundColor: '#1565C0',
        pointHoverBorderColor: '#1565C0',
      });
    }

    if (perspective === "both" || perspective === "design") {
      const designData = isdrillDown && pillarData 
        ? pillarData.mechanisms.map(mechanism => mechanism.designScore)
        : data.pillars.map(pillar => pillar.designScore);
        
      datasets.push({
        label: 'Design',
        data: designData,
        backgroundColor: 'rgba(56, 142, 60, 0.2)',
        borderColor: '#388E3C',
        borderWidth: 2,
        pointBackgroundColor: '#388E3C',
        pointBorderColor: '#388E3C',
        pointHoverBackgroundColor: '#2E7D32',
        pointHoverBorderColor: '#2E7D32',
      });
    }

    console.log('Creating radar chart with', labels.length, 'pillars and', datasets.length, 'datasets');
    console.log('Chart data:', { labels, datasets });

    try {
      chartRef.current = new ChartJS(ctx, {
        type: 'radar',
        data: {
          labels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              min: 0,
              ticks: {
                stepSize: 20,
                callback: function(value) {
                  return value + '%';
                },
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
              angleLines: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
              pointLabels: {
                font: {
                  size: 12,
                  weight: 500,
                },
                color: '#212121',
              },
            },
          },
          plugins: {
            legend: {
              position: 'bottom' as const,
              labels: {
                padding: 20,
                usePointStyle: true,
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              callbacks: {
                title: function(context) {
                  // Show full mechanism name when in drill-down mode, otherwise use label
                  if (isdrillDown && fullMechanismData && context[0]) {
                    const mechanism = fullMechanismData[context[0].dataIndex];
                    return mechanism.name;
                  }
                  return context[0]?.label || '';
                },
                label: function(context) {
                  return `${context.dataset.label}: ${Math.round(context.parsed.r)}%`;
                },
              },
            },
          },
          elements: {
            line: {
              borderWidth: 2,
            },
            point: {
              radius: 4,
              hoverRadius: 6,
            },
          },
          onClick: (event, elements) => {
            if (!onPillarClick || isdrillDown) return;
            
            // Handle axis label clicks
            const canvas = event.native?.target as HTMLCanvasElement;
            if (canvas && event.native) {
              const rect = canvas.getBoundingClientRect();
              const mouseEvent = event.native as MouseEvent;
              const x = mouseEvent.clientX - rect.left;
              const y = mouseEvent.clientY - rect.top;
              
              // Check if click is near axis labels (approximate detection)
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const radius = Math.min(centerX, centerY) * 0.8;
              
              const angleStep = (2 * Math.PI) / data.pillars.length;
              for (let i = 0; i < data.pillars.length; i++) {
                const angle = -Math.PI / 2 + i * angleStep;
                const labelX = centerX + Math.cos(angle) * radius;
                const labelY = centerY + Math.sin(angle) * radius;
                
                const distance = Math.sqrt((x - labelX) ** 2 + (y - labelY) ** 2);
                if (distance < 40) { // 40px radius for click detection
                  onPillarClick(data.pillars[i].id);
                  return;
                }
              }
            }
            
            // Handle data point clicks
            if (elements && elements.length > 0) {
              const clickedIndex = elements[0].index;
              const clickedPillar = data.pillars[clickedIndex];
              if (clickedPillar) {
                onPillarClick(clickedPillar.id);
              }
            }
          },
        },
      });

      console.log('Chart created successfully');
    } catch (error) {
      console.error('Error creating chart:', error);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, perspective, selectedPillar]);

  if (!data || !data.pillars || data.pillars.length === 0) {
    return (
      <div className="relative w-full max-w-lg mx-auto p-8 text-center">
        <p className="text-text-secondary">No assessment data available for chart</p>
        <p className="text-xs text-gray-400 mt-2">
          Data: {data ? 'exists' : 'null'}, 
          Pillars: {data?.pillars?.length || 0}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-none">
      <div className="w-full h-[50vh] min-h-80 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full border border-gray-200"
        />
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        {data.pillars.length} pillars • {perspective} perspective
      </div>
    </div>
  );
}