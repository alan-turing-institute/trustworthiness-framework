import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import NavigationHeader from "@/components/NavigationHeader";
import PolarChart from "@/components/PolarChart";
import { useParams, useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Download, Share, BarChart3, Shield, Lock, Gavel, CheckCircle, Zap, Mountain, Circle, AlertTriangle } from "lucide-react";
import type { PillarWithMechanisms, Assessment, AssessmentResponse } from "@shared/schema";
import { calculateResults } from "@shared/scoreCalculation";

// Icon mapping function
const getPillarIcon = (iconName?: string) => {
  const icons = {
    Shield,
    Lock, 
    Gavel,
    CheckCircle,
    Zap,
    Mountain,
    Circle
  };
  return icons[iconName as keyof typeof icons] || Circle;
};

// Helper functions to get capping information
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

interface ResultsData {
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
      code: string;
      name: string;
      description?: string;
      operationalScore: number;
      designScore: number;
      isCapped?: boolean;
      cappingMetrics?: any[];
      metrics: Array<{
        id: string;
        name: string;
        type: "operational" | "design";
        score: number;
        mechanismCap: number;
        pillarCap: number;
      }>;
    }>;
  }>;
  overallOperationalScore: number;
  overallDesignScore: number;
}

export default function Results() {
  const { id } = useParams();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [perspective, setPerspective] = useState<"both" | "operational" | "design">("both");
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch assessment
  const { data: assessment, error: assessmentError } = useQuery({
    queryKey: ["/api/assessments", id],
    enabled: !!id,
    retry: false,
  });

  // Fetch assessment responses
  const { data: assessmentResponses, error: responsesError } = useQuery({
    queryKey: ["/api/assessments", id, "responses"],
    enabled: !!id,
    retry: false,
  });

  // Fetch framework structure
  const { data: framework, error: frameworkError } = useQuery({
    queryKey: ["/api/framework"],
    retry: false,
  });

  useEffect(() => {
    const errors = [assessmentError, responsesError, frameworkError].filter(Boolean);
    errors.forEach(error => {
      if (error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    });
  }, [assessmentError, responsesError, frameworkError, toast]);

  const handleGenerateReport = async () => {
    if (!id || !assessment) return;

    setIsGeneratingReport(true);
    try {
      const response = await fetch(`/api/assessments/${id}/report`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Create a blob from the PDF data
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `assessment-report-${(assessment as any)?.systemName?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "PDF report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Use shared calculateResults function
  const getCalculatedResults = (): ReturnType<typeof calculateResults> | null => {
    if (!framework || !assessmentResponses) return null;

    const excludedMechanismIds = new Set((assessment as any)?.excludedMechanisms || []);
    return calculateResults(
      framework as PillarWithMechanisms[],
      assessmentResponses as AssessmentResponse[],
      excludedMechanismIds
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="bg-surface rounded-lg h-32"></div>
            <div className="bg-surface rounded-lg h-96"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-medium text-text-primary mb-4">Assessment Not Found</h2>
              <p className="text-text-secondary">The requested assessment could not be found.</p>
              <Button className="mt-4" onClick={() => setLocation("/")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Debug the raw data first
  console.log('Raw data check:', {
    framework: Array.isArray(framework) ? framework.length : 0,
    responses: Array.isArray(assessmentResponses) ? assessmentResponses.length : 0,
    assessment: !!assessment
  });

  const results = getCalculatedResults();
  
  // Temporary debug logging to verify data flow
  console.log('Results calculated:', results ? {
    pillars: results.pillars.map(p => ({ name: p.name, op: p.operationalScore, design: p.designScore })),
    overall: { op: results.overallOperationalScore, design: results.overallDesignScore }
  } : 'NULL - no results');

  if (!results) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-medium text-text-primary mb-4">Loading Results</h2>
              <p className="text-text-secondary">Calculating assessment scores...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const canAccess = 
    user?.role === "admin" ||
    user?.role === "assessor" ||
    (assessment as any)?.userId === user?.id ||
    ((assessment as any)?.isPublic && user?.role !== undefined);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-medium text-text-primary mb-4">Access Denied</h2>
              <p className="text-text-secondary">You don't have permission to view this assessment.</p>
              <Button className="mt-4" onClick={() => setLocation("/")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="results-container">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-text-primary">
                  Assessment Results: {(assessment as any)?.systemName}
                </CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  {(assessment as any)?.systemDescription}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => setLocation("/")} data-testid="back-button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  data-testid="export-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingReport ? "Generating..." : "Export PDF"}
                </Button>
                <Button variant="outline" data-testid="share-button">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Controls */}
          <CardContent className="border-b border-gray-200">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-text-secondary">Perspective:</label>
                <Select value={perspective} onValueChange={(value: any) => setPerspective(value)}>
                  <SelectTrigger className="w-48" data-testid="perspective-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Operational & Design)</SelectItem>
                    <SelectItem value="operational">Operational Only</SelectItem>
                    <SelectItem value="design">Design Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>

          {/* Visual Results */}
          <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Polar Chart */}
                <div className="lg:col-span-2">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-medium text-text-primary mb-2">
                      {selectedPillar 
                        ? `${results?.pillars.find(p => p.id === selectedPillar)?.name} Pillar - Mechanisms`
                        : "Trustworthiness Assessment"}
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {selectedPillar 
                        ? `${perspective === "both" ? "Operational vs Design perspectives" : 
                           perspective === "operational" ? "Operational perspective" : 
                           "Design perspective"} for mechanisms in this pillar`
                        : `${perspective === "both" ? "Operational vs Design perspectives across all pillars" :
                           perspective === "operational" ? "Operational perspective across all pillars" :
                           "Design perspective across all pillars"} (click pillars or axis labels to drill down)`}
                    </p>
                  </div>
                  
                  {/* Debug info visible on page */}
                  <div className="text-xs text-gray-500 mb-4 text-center">
                    Framework: {Array.isArray(framework) ? framework.length : 0} pillars, 
                    Responses: {Array.isArray(assessmentResponses) ? assessmentResponses.length : 0}, 
                    Results: {results ? `calculated (${results.pillars.length} pillars)` : 'null'}
                  </div>
                  
                  <div data-testid="polar-chart">
                    <PolarChart
                      data={results}
                      perspective={perspective}
                      selectedPillar={selectedPillar}
                      onPillarClick={setSelectedPillar}
                    />
                  </div>
                </div>

                {/* Legend & Scores */}
                <div className="space-y-6">
                  {!selectedPillar ? (
                    // Overview: Show overall scores and pillar breakdown
                    <>
                      <div>
                        <h5 className="font-medium text-text-primary mb-3">Overall Scores</h5>
                        <div className="space-y-3">
                          {(perspective === "both" || perspective === "operational") && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
                                <span className="text-sm text-text-secondary">Operational</span>
                              </div>
                              <span className="text-sm font-medium text-text-primary">
                                {Math.round(results.overallOperationalScore)}%
                              </span>
                            </div>
                          )}
                          {(perspective === "both" || perspective === "design") && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-secondary rounded-full mr-2"></div>
                                <span className="text-sm text-text-secondary">Design</span>
                              </div>
                              <span className="text-sm font-medium text-text-primary">
                                {Math.round(results.overallDesignScore)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-text-primary mb-3">Pillar Breakdown</h5>
                        <div className="space-y-2" data-testid="pillar-breakdown">
                          {results.pillars.map(pillar => (
                            <div 
                              key={pillar.id} 
                              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => setSelectedPillar(pillar.id)}
                            >
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const IconComponent = getPillarIcon(pillar.icon);
                                  return <IconComponent className="w-4 h-4 text-blue-600" />;
                                })()}
                                <span className="text-sm text-text-primary">{pillar.name}</span>
                                
                                {/* Operational capping alert */}
                                {isOperationalCapped(pillar) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-orange-500" data-testid="capping-alert" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="whitespace-pre-line text-sm">
                                        {formatCappingTooltip(getOperationalCappingMetrics(pillar), "Operational")}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {/* Design capping alert */}
                                {isDesignCapped(pillar) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-blue-500" data-testid="capping-alert" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="whitespace-pre-line text-sm">
                                        {formatCappingTooltip(getDesignCappingMetrics(pillar), "Design")}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {(perspective === "both" || perspective === "operational") && (
                                  <span className="text-xs text-text-secondary">
                                    Op: {Math.round(pillar.operationalScore)}%
                                  </span>
                                )}
                                {(perspective === "both" || perspective === "design") && (
                                  <span className="text-xs text-text-secondary">
                                    Des: {Math.round(pillar.designScore)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Drill-down: Show mechanism details for selected pillar
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-text-primary">Mechanism Details</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedPillar(null)}
                          className="text-xs"
                        >
                          ← Back to Overview
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {results.pillars
                          .find(p => p.id === selectedPillar)
                          ?.mechanisms.map(mechanism => (
                          <div key={mechanism.id} className="border border-gray-200 rounded-lg p-3" data-testid="mechanism-card">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <h6 className="font-medium text-text-primary text-sm">{mechanism.name}</h6>
                                
                                {/* Operational capping alert */}
                                {isOperationalCapped(mechanism) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-orange-500" data-testid="capping-alert" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="whitespace-pre-line text-sm">
                                        {formatCappingTooltip(getOperationalCappingMetrics(mechanism), "Operational")}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {/* Design capping alert */}
                                {isDesignCapped(mechanism) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-blue-500" data-testid="capping-alert" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="whitespace-pre-line text-sm">
                                        {formatCappingTooltip(getDesignCappingMetrics(mechanism), "Design")}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-right">
                                {(perspective === "both" || perspective === "operational") && (
                                  <div className="text-xs text-text-secondary">
                                    Op: {Math.round(mechanism.operationalScore)}%
                                  </div>
                                )}
                                {(perspective === "both" || perspective === "design") && (
                                  <div className="text-xs text-text-secondary">
                                    Des: {Math.round(mechanism.designScore)}%
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {(perspective === "both" || perspective === "operational") && (
                                <div className="flex items-center space-x-2">
                                  <Progress value={mechanism.operationalScore} className="flex-1 h-1" />
                                  <span className="text-xs text-text-secondary min-w-0">Op</span>
                                </div>
                              )}
                              {(perspective === "both" || perspective === "design") && (
                                <div className="flex items-center space-x-2">
                                  <Progress value={mechanism.designScore} className="flex-1 h-1" />
                                  <span className="text-xs text-text-secondary min-w-0">Des</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
        </Card>
      </main>
    </div>
    </TooltipProvider>
  );
}
