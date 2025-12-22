import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import NavigationHeader from "@/components/NavigationHeader";
import { useParams } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ArrowLeft, Award, AlertCircle } from "lucide-react";
import type { Assessment, AssessmentStandardsCompliance } from "@shared/schema";

export default function StandardsCompliance() {
  const params = useParams<{ id: string }>();
  const id = params.id!;
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  // Fetch assessment
  const { data: assessment } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
    enabled: !!id,
  });

  // Fetch available standards
  const { data: availableStandards = [], isLoading: standardsLoading } = useQuery<string[]>({
    queryKey: ["/api/standards"],
  });

  // Fetch current compliance
  const { data: currentCompliance = [], refetch: refetchCompliance } = useQuery<AssessmentStandardsCompliance[]>({
    queryKey: [`/api/assessments/${id}/standards-compliance`],
    enabled: !!id,
  });

  // Set compliance mutation
  const setComplianceMutation = useMutation({
    mutationFn: async ({ standard, isCompliant }: { standard: string; isCompliant: boolean }) => {
      const result = await apiRequest("POST", `/api/assessments/${id}/standards-compliance`, {
        standard,
        isCompliant,
      });
      return { standard, isCompliant, result };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/assessments/${id}/responses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/assessments/${id}/standards-compliance`] });
      queryClient.invalidateQueries({ queryKey: [`/api/assessments/${id}/metric-notes`] });
      refetchCompliance();
      toast({
        title: "Success",
        description: `Standards compliance updated successfully. ${variables.isCompliant ? 'All related metrics have been set to "Yes" (100% score).' : 'Compliance removed.'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update standards compliance",
        variant: "destructive",
      });
    },
    onSettled: (_, __, variables) => {
      setPendingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.standard);
        return newSet;
      });
    }
  });

  const handleComplianceChange = (standard: string, isCompliant: boolean) => {
    setPendingChanges(prev => new Set(prev).add(standard));
    setComplianceMutation.mutate({ standard, isCompliant });
  };

  const getComplianceStatus = (standard: string) => {
    const compliance = currentCompliance.find(c => c.standard === standard);
    return compliance?.isCompliant || false;
  };

  const calculateOverallCompliance = () => {
    if (availableStandards.length === 0) return 0;
    const compliantCount = availableStandards.filter(standard => getComplianceStatus(standard)).length;
    return Math.round((compliantCount / availableStandards.length) * 100);
  };

  if (isLoading || standardsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Assessment not found</h1>
          </div>
        </div>
      </div>
    );
  }

  const overallCompliance = calculateOverallCompliance();
  const compliantStandards = availableStandards.filter(standard => getComplianceStatus(standard));

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center space-x-2">
                <Award className="w-6 h-6 text-blue-600" />
                <span>Standards Compliance</span>
              </h1>
              <p className="text-text-secondary">{assessment.systemName}</p>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Compliance Progress</span>
              <Badge 
                variant={overallCompliance === 100 ? "default" : overallCompliance > 50 ? "secondary" : "destructive"}
                className="text-sm"
              >
                {compliantStandards.length} of {availableStandards.length} Standards
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Progress value={overallCompliance} className="flex-1" />
              <span className="text-lg font-medium text-text-primary">
                {overallCompliance}%
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-2">
              Checking a standard will automatically set all related metrics to "Yes" (100% score)
            </p>
          </CardContent>
        </Card>

        {/* Standards List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Standards</CardTitle>
            <p className="text-sm text-text-secondary">
              Select the standards your system complies with. This will automatically mark all associated metrics as implemented.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableStandards.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No standards available in the current framework</p>
              </div>
            ) : (
              availableStandards.map((standard) => {
                const isCompliant = getComplianceStatus(standard);
                const isPending = pendingChanges.has(standard);
                
                return (
                  <div
                    key={standard}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isCompliant 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    } ${isPending ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        id={`standard-${standard}`}
                        checked={isCompliant}
                        disabled={isPending}
                        onCheckedChange={(checked) => {
                          if (!isPending) {
                            handleComplianceChange(standard, checked as boolean);
                          }
                        }}
                      />
                      <div>
                        <label 
                          htmlFor={`standard-${standard}`} 
                          className="text-sm font-medium text-text-primary cursor-pointer"
                        >
                          {standard}
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isPending ? (
                        <Badge variant="outline">Updating...</Badge>
                      ) : isCompliant ? (
                        <div className="flex items-center space-x-2 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Compliant
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-500">
                          <XCircle className="w-4 h-4" />
                          <Badge variant="outline">Not Compliant</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important Notice</p>
                <p>
                  When you check a standard as compliant, all metrics associated with that standard 
                  will be automatically set to "Yes" (100% score). This action will override any existing 
                  responses for those metrics. Use this feature carefully and review your assessment 
                  results afterward.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}