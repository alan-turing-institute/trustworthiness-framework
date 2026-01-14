import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import NavigationHeader from "@/components/NavigationHeader";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronLeft, ChevronRight, Save, ArrowLeft, Shield, Lock, Gavel, CheckCircle, Zap, Mountain, Circle, Loader2, Info, Download, Upload } from "lucide-react";
import type { PillarWithMechanisms, Assessment, AssessmentResponse, AssessmentMetricNote } from "@shared/schema";
import { PercentageSlider } from "@/components/PercentageSlider";

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

export default function AssessmentForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id || undefined;
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [systemName, setSystemName] = useState("");
  const [systemDescription, setSystemDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [status, setStatus] = useState<"draft" | "in_progress" | "completed">("draft");
  const [activePillar, setActivePillar] = useState(0);
  const [responses, setResponses] = useState<Record<string, { answer: boolean; answerValue?: number }>>({});
  const [openMechanisms, setOpenMechanisms] = useState<Record<string, boolean>>({});
  const [excludedMechanisms, setExcludedMechanisms] = useState<Record<string, boolean>>({});
  const [mechanismConfigurations, setMechanismConfigurations] = useState<
    Record<string, { operational: number | null; design: number | null }>
  >({});
  const [metricNotes, setMetricNotes] = useState<Record<string, string>>({});
  const [currentMetricIndex, setCurrentMetricIndex] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [metricInfoDialog, setMetricInfoDialog] = useState<{ open: boolean; metric: any | null }>({ open: false, metric: null });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [completionFilter, setCompletionFilter] = useState<"all" | "completed" | "not_completed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "design" | "operational">("all");

  // Refs for auto-save
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);
  const percentageSliderTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingPercentageResponse = useRef<{ metricId: string; answer: boolean; answerValue: number } | null>(null);
  const noteTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Refs to track current values without causing re-renders
  const systemNameRef = useRef(systemName);
  const systemDescriptionRef = useRef(systemDescription);
  const isPublicRef = useRef(isPublic);
  const statusRef = useRef(status);
  const excludedMechanismsRef = useRef(excludedMechanisms);
  const mechanismConfigurationsRef = useRef(mechanismConfigurations);

  // Serialize objects for stable comparison
  const excludedMechanismsJson = useMemo(() => {
    const json = JSON.stringify(excludedMechanisms);
    console.log('[AssessmentForm] excludedMechanismsJson computed:', json);
    return json;
  }, [excludedMechanisms]);

  const mechanismConfigurationsJson = useMemo(() => {
    const json = JSON.stringify(mechanismConfigurations);
    console.log('[AssessmentForm] mechanismConfigurationsJson computed:', json);
    return json;
  }, [mechanismConfigurations]);

  // Update refs when values change
  useEffect(() => {
    systemNameRef.current = systemName;
    systemDescriptionRef.current = systemDescription;
    isPublicRef.current = isPublic;
    statusRef.current = status;
    excludedMechanismsRef.current = excludedMechanisms;
    mechanismConfigurationsRef.current = mechanismConfigurations;
  }, [systemName, systemDescription, isPublic, status, excludedMechanisms, mechanismConfigurations]);

  // Fetch assessment if editing
  const { data: assessment } = useQuery<Assessment>({
    queryKey: ["/api/assessments", id],
    enabled: !!id,
    retry: false,
  });

  // Fetch assessment responses if editing
  const { data: assessmentResponses } = useQuery<AssessmentResponse[]>({
    queryKey: ["/api/assessments", id, "responses"],
    enabled: !!id,
    retry: false,
  });

  // Fetch assessment metric notes if editing
  const { data: assessmentMetricNotes } = useQuery<AssessmentMetricNote[]>({
    queryKey: ["/api/assessments", id, "metric-notes"],
    enabled: !!id,
    retry: false,
  });

  // Fetch framework structure
  const { data: framework, isLoading: frameworkLoading, error } = useQuery<PillarWithMechanisms[]>({
    queryKey: ["/api/framework"],
    retry: false,
  });

  useEffect(() => {
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
  }, [error, toast]);

  useEffect(() => {
    if (assessment) {
      setSystemName(assessment.systemName);
      setSystemDescription(assessment.systemDescription || "");
      setIsPublic(assessment.isPublic);
      setStatus(assessment.status as "draft" | "in_progress" | "completed");

      // Load excluded mechanisms
      if (assessment.excludedMechanisms && Array.isArray(assessment.excludedMechanisms)) {
        const excludedMap: Record<string, boolean> = {};
        assessment.excludedMechanisms.forEach((mechanismId: string) => {
          excludedMap[mechanismId] = true;
        });
        setExcludedMechanisms(excludedMap);
      }

      // Load mechanism configurations
      if (assessment.mechanismConfigurations) {
        setMechanismConfigurations(assessment.mechanismConfigurations);
      }
    }
  }, [assessment]);

  useEffect(() => {
    if (assessmentResponses) {
      const responseMap: Record<string, { answer: boolean; answerValue?: number }> = {};
      assessmentResponses.forEach((response: AssessmentResponse) => {
        responseMap[response.metricId] = {
          answer: response.answer,
          answerValue: response.answerValue !== null ? response.answerValue : undefined,
        };
      });
      setResponses(responseMap);
    }
  }, [assessmentResponses]);

  useEffect(() => {
    if (assessmentMetricNotes) {
      const notesMap: Record<string, string> = {};
      assessmentMetricNotes.forEach((note: AssessmentMetricNote) => {
        notesMap[note.metricId] = note.notes || "";
      });
      setMetricNotes(notesMap);
    }
  }, [assessmentMetricNotes]);

  // Mark component as initialized after initial data load
  useEffect(() => {
    if (id && assessment && !isInitialized.current) {
      // Set a delay to ensure all initial state updates are complete
      const timer = setTimeout(() => {
        isInitialized.current = true;
        console.log('[AssessmentForm] Auto-save initialized');
      }, 1500); // Increased delay to 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [id, assessment]);

  // Cleanup effect for percentage slider timeout
  useEffect(() => {
    return () => {
      // Save any pending percentage response on unmount
      if (pendingPercentageResponse.current) {
        saveResponseMutation.mutate(pendingPercentageResponse.current);
      }
      if (percentageSliderTimeoutRef.current) {
        clearTimeout(percentageSliderTimeoutRef.current);
      }
    };
  }, []);

  // Save pending percentage response when changing pillars
  useEffect(() => {
    // Save any pending percentage response when pillar changes
    if (pendingPercentageResponse.current) {
      if (percentageSliderTimeoutRef.current) {
        clearTimeout(percentageSliderTimeoutRef.current);
      }
      saveResponseMutation.mutate(pendingPercentageResponse.current);
      pendingPercentageResponse.current = null;
    }
  }, [activePillar]);


  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: {
      systemName: string;
      systemDescription: string;
      isPublic: boolean;
      status: string;
      excludedMechanisms: string[];
      mechanismConfigurations?: Record<string, { operational: number | null; design: number | null }>;
    }) => {
      const response = await apiRequest("POST", "/api/assessments", data);
      return await response.json();
    },
    onSuccess: (newAssessment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      console.log("Created assessment:", newAssessment);
      // Use window.location to force a hard navigation that properly updates the URL params
      window.location.href = `/assessment/${newAssessment.id}`;
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
      }
    },
  });

  // Save assessment mutation
  const saveAssessmentMutation = useMutation({
    mutationFn: async (data: {
      systemName: string;
      systemDescription: string;
      isPublic: boolean;
      status: string;
      excludedMechanisms: string[];
      mechanismConfigurations?: Record<string, { operational: number | null; design: number | null }>;
    }) => {
      setIsSaving(true);
      return await apiRequest("PATCH", `/api/assessments/${id}`, data);
    },
    onSuccess: (response, variables) => {
      // Update the cached assessment data without refetching
      queryClient.setQueryData<Assessment>(["/api/assessments", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          systemName: variables.systemName,
          systemDescription: variables.systemDescription,
          isPublic: variables.isPublic,
          status: variables.status,
          excludedMechanisms: variables.excludedMechanisms,
          mechanismConfigurations: variables.mechanismConfigurations
        };
      });

      // Invalidate the list to update the dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"], exact: true });
      setIsSaving(false);
      isSavingRef.current = false;
      // Silent success - no toast notification
    },
    onError: (error) => {
      setIsSaving(false);
      isSavingRef.current = false;
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to save assessment", variant: "destructive" });
      }
    },
  });

  // Save response mutation
  const saveResponseMutation = useMutation({
    mutationFn: async (data: { metricId: string; answer: boolean; answerValue: number | null }) => {
      console.log('[saveResponseMutation] Saving response:', data);
      setIsSaving(true);
      return await apiRequest("POST", `/api/assessments/${id}/responses`, data);
    },
    onSuccess: (response, variables) => {
      console.log('[saveResponseMutation] Response saved successfully for metric:', variables.metricId);
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id, "responses"] });
      setIsSaving(false);
    },
    onError: (error) => {
      setIsSaving(false);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to save response", variant: "destructive" });
      }
    },
  });

  // Save metric note mutation
  const saveMetricNoteMutation = useMutation({
    mutationFn: async (data: { metricId: string; notes: string }) => {
      console.log('[saveMetricNoteMutation] Saving note for metric:', data.metricId);
      setIsSaving(true);
      return await apiRequest("POST", `/api/assessments/${id}/metric-notes`, data);
    },
    onSuccess: (response, variables) => {
      console.log('[saveMetricNoteMutation] Note saved successfully for metric:', variables.metricId);
      // Don't invalidate queries to prevent refetch from overwriting local state
      setIsSaving(false);
    },
    onError: (error) => {
      setIsSaving(false);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to save metric note", variant: "destructive" });
      }
    },
  });

  // Apply mechanism configuration mutation
  const applyConfigurationMutation = useMutation({
    mutationFn: async (data: { mechanismId: string; metricType: 'operational' | 'design'; choiceIndex: number }) => {
      const response = await apiRequest("POST", `/api/assessments/${id}/apply-configuration`, data);
      return await response.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id, "responses"] });

      // Update local state
      setMechanismConfigurations(prev => ({
        ...prev,
        [variables.mechanismId]: {
          ...prev[variables.mechanismId],
          [variables.metricType]: variables.choiceIndex
        }
      }));

      toast({
        title: "Success",
        description: `Configuration applied to ${result.appliedCount} metrics`
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to apply configuration", variant: "destructive" });
      }
    },
  });

  // Auto-save function with debouncing for text inputs
  const autoSaveAssessment = useCallback((immediate = false) => {
    console.log('[autoSaveAssessment] Called with immediate:', immediate, 'isInitialized:', isInitialized.current, 'isSaving:', isSavingRef.current);

    if (!id || !isInitialized.current || isSavingRef.current) return;

    // Use ref to check system name
    if (!systemNameRef.current?.trim()) {
      return; // Don't save if system name is empty
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const saveData = () => {
      if (isSavingRef.current) return; // Prevent concurrent saves

      console.log('[autoSaveAssessment] Executing save with values:', {
        systemName: systemNameRef.current,
        systemDescription: systemDescriptionRef.current,
        isPublic: isPublicRef.current,
        status: statusRef.current
      });
      isSavingRef.current = true;
      // Use refs to get current values without causing re-renders
      const excludedMechanismsArray = Object.keys(excludedMechanismsRef.current).filter(key => excludedMechanismsRef.current[key]);

      saveAssessmentMutation.mutate({
        systemName: systemNameRef.current,
        systemDescription: systemDescriptionRef.current,
        isPublic: isPublicRef.current,
        status: statusRef.current,
        excludedMechanisms: excludedMechanismsArray,
        mechanismConfigurations: mechanismConfigurationsRef.current
      });
    };

    if (immediate) {
      saveData();
    } else {
      // Debounce text inputs by 1 second
      console.log('[autoSaveAssessment] Scheduling debounced save in 1s');
      saveTimeoutRef.current = setTimeout(saveData, 1000);
    }
  }, [id, saveAssessmentMutation]);

  // Auto-save when text fields change (debounced)
  useEffect(() => {
    if (isInitialized.current && id) {
      console.log('[AssessmentForm] Text fields changed, triggering debounced save');
      autoSaveAssessment(false); // Debounced save
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemName, systemDescription, id]);

  // Auto-save immediately when non-text fields change
  useEffect(() => {
    if (isInitialized.current && id) {
      console.log('[AssessmentForm] Non-text field changed (isPublic/status), triggering immediate save');
      autoSaveAssessment(true); // Immediate save
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublic, status, id]);

  // Auto-save when excluded mechanisms change (use JSON for value comparison)
  useEffect(() => {
    if (isInitialized.current && id) {
      console.log('[AssessmentForm] Excluded mechanisms changed, triggering immediate save');
      autoSaveAssessment(true); // Immediate save
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludedMechanismsJson, id]);

  // Auto-save when mechanism configurations change (use JSON for value comparison)
  useEffect(() => {
    if (isInitialized.current && id) {
      console.log('[AssessmentForm] Mechanism configurations changed, triggering immediate save');
      autoSaveAssessment(true); // Immediate save
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanismConfigurationsJson, id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle manual save (for creating new assessments)
  const handleSaveAssessment = () => {
    if (!systemName.trim()) {
      toast({ title: "Error", description: "System name is required", variant: "destructive" });
      return;
    }

    // Convert excluded mechanisms map to array
    const excludedMechanismsArray = Object.keys(excludedMechanisms).filter(key => excludedMechanisms[key]);

    const data = {
      systemName,
      systemDescription,
      isPublic,
      status,
      excludedMechanisms: excludedMechanismsArray,
      mechanismConfigurations
    };

    if (id) {
      saveAssessmentMutation.mutate(data);
    } else {
      createAssessmentMutation.mutate(data);
    }
  };

  const handleResponseChange = (metricId: string, metric: any, value: boolean | number) => {
    if (metric.metricType === "boolean") {
      const boolValue = value as boolean;
      setResponses(prev => ({
        ...prev,
        [metricId]: { answer: boolValue, answerValue: undefined }
      }));
      if (id) {
        saveResponseMutation.mutate({
          metricId,
          answer: boolValue,
          answerValue: null
        });
      }
    } else if (metric.metricType === "percentage") {
      const percentValue = value as number;
      // Update UI immediately
      setResponses(prev => ({
        ...prev,
        [metricId]: { answer: percentValue === 100, answerValue: percentValue }
      }));
      
      if (id) {
        // Store the pending response
        pendingPercentageResponse.current = {
          metricId,
          answer: percentValue === 100,
          answerValue: percentValue
        };
        
        // Clear any existing timeout
        if (percentageSliderTimeoutRef.current) {
          clearTimeout(percentageSliderTimeoutRef.current);
        }
        
        // Set new timeout for 5 seconds
        percentageSliderTimeoutRef.current = setTimeout(() => {
          if (pendingPercentageResponse.current) {
            saveResponseMutation.mutate(pendingPercentageResponse.current);
            pendingPercentageResponse.current = null;
          }
        }, 5000);
      }
    }
  };

  const handleMetricNoteChange = (metricId: string, notes: string) => {
    setMetricNotes(prev => ({ ...prev, [metricId]: notes }));
    if (id) {
      // Clear previous timeout for this metric
      if (noteTimeoutsRef.current[metricId]) {
        clearTimeout(noteTimeoutsRef.current[metricId]);
      }
      
      // Debounce the save operation
      noteTimeoutsRef.current[metricId] = setTimeout(() => {
        saveMetricNoteMutation.mutate({ metricId, notes });
        delete noteTimeoutsRef.current[metricId];
      }, 1000);
    }
  };

  const handleConfigurationChange = (
    mechanismId: string,
    metricType: 'operational' | 'design',
    choiceIndex: number | null
  ) => {
    if (!id) {
      toast({
        title: "Error",
        description: "Please save the assessment first",
        variant: "destructive"
      });
      return;
    }

    if (choiceIndex === null) {
      // Clear configuration
      setMechanismConfigurations(prev => ({
        ...prev,
        [mechanismId]: {
          ...prev[mechanismId],
          [metricType]: null
        }
      }));
      return;
    }

    // Apply configuration
    applyConfigurationMutation.mutate({
      mechanismId,
      metricType,
      choiceIndex
    });
  };

  const toggleMechanism = (mechanismId: string) => {
    setOpenMechanisms(prev => ({ ...prev, [mechanismId]: !prev[mechanismId] }));
  };

  const toggleMechanismExclusion = (mechanismId: string) => {
    setExcludedMechanisms(prev => ({ ...prev, [mechanismId]: !prev[mechanismId] }));
  };

  // Excel export handler
  const handleExportExcel = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/assessments/${id}/export-excel`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'assessment.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Assessment exported to Excel"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export assessment to Excel",
        variant: "destructive"
      });
    }
  };

  // Excel import handler
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setIsImporting(true);

    try {
      const response = await fetch(`/api/assessments/${id}/import-excel`, {
        method: 'POST',
        credentials: 'include',
        body: file
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to import');
      }

      // Refresh data after import
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id, "responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id, "metric-notes"] });

      toast({
        title: "Import Completed",
        description: result.message
      });

      if (result.errors && result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import Excel file",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const navigateMetric = (mechanismId: string, direction: 'prev' | 'next', maxIndex: number) => {
    // Save any pending percentage response immediately before navigating
    if (pendingPercentageResponse.current) {
      if (percentageSliderTimeoutRef.current) {
        clearTimeout(percentageSliderTimeoutRef.current);
      }
      saveResponseMutation.mutate(pendingPercentageResponse.current);
      pendingPercentageResponse.current = null;
    }
    
    setCurrentMetricIndex(prev => {
      const currentIndex = prev[mechanismId] || 0;
      let newIndex = currentIndex;

      if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'next' && currentIndex < maxIndex) {
        newIndex = currentIndex + 1;
      }

      return { ...prev, [mechanismId]: newIndex };
    });
  };

  const getCurrentMetricIndex = (mechanismId: string) => {
    return currentMetricIndex[mechanismId] || 0;
  };

  const calculateProgress = () => {
    if (!framework) return 0;

    let totalMetrics = 0;
    let answeredMetrics = 0;

    framework.forEach((pillar: PillarWithMechanisms) => {
      pillar.mechanisms.forEach(mechanism => {
        // Skip excluded mechanisms
        if (excludedMechanisms[mechanism.id]) return;

        mechanism.metrics.forEach(metric => {
          totalMetrics++;
          if (responses[metric.id] !== undefined) {
            answeredMetrics++;
          }
        });
      });
    });

    return totalMetrics > 0 ? (answeredMetrics / totalMetrics) * 100 : 0;
  };

  const calculateMechanismScore = (mechanism: any) => {
    let totalScore = 0;
    let metricCount = mechanism.metrics.length;

    mechanism.metrics.forEach((metric: any) => {
      totalScore += calculateMetricScore(metric);
    });

    let score = metricCount > 0 ? Math.round(totalScore / metricCount) : 0;

    // Apply mechanism caps based on low-performing metrics
    const hasLowMetric = mechanism.metrics.some((metric: any) => {
      const metricScore = calculateMetricScore(metric);
      return metricScore < 50;
    });

    if (hasLowMetric) {
      const lowMetrics = mechanism.metrics.filter((metric: any) => {
        const metricScore = calculateMetricScore(metric);
        return metricScore < 50;
      });

      const minMechanismCap = Math.min(...lowMetrics.map((m: any) =>
        parseFloat(m.mechanismCap) || 100
      ));

      score = Math.min(score, minMechanismCap);
    }

    return score;
  };

  const calculateMetricScore = (metric: any) => {
    const response = responses[metric.id];
    if (!response) return 0;

    if (metric.metricType === "boolean") {
      return response.answer ? 100 : 0;
    } else if (metric.metricType === "percentage") {
      return response.answerValue || 0;
    }
    return 0;
  };

  const calculateMechanismProgress = (mechanism: any) => {
    let totalMetrics = 0;
    let answeredMetrics = 0;

    mechanism.metrics.forEach((metric: any) => {
      totalMetrics++;
      if (responses[metric.id] !== undefined) {
        answeredMetrics++;
      }
    });

    return totalMetrics > 0 ? Math.round((answeredMetrics / totalMetrics) * 100) : 0;
  };

  if (isLoading || frameworkLoading) {
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

  if (user?.role === "external") {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-medium text-text-primary mb-4">Access Denied</h2>
              <p className="text-text-secondary">External users can only view public assessments.</p>
              <Button className="mt-4" onClick={() => setLocation("/")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-medium text-text-primary mb-4">Error</h2>
              <p className="text-text-secondary">Failed to load assessment framework.</p>
              <Button className="mt-4" onClick={() => setLocation("/")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const progress = calculateProgress();
  const currentPillar = framework[activePillar];

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card data-testid="assessment-form">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-text-primary">
                  {id ? `Assessment: ${systemName || 'Loading...'}` : 'New Assessment'}
                </CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  {systemDescription || 'System evaluation'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Show saving status for existing assessments */}
                {id && (
                  <div className="flex items-center text-sm text-text-secondary">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span className="text-green-600">Auto-save enabled</span>
                    )}
                  </div>
                )}

                {/* Excel Export/Import buttons for existing assessments */}
                {id && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleExportExcel}
                      title="Export assessment to Excel for offline editing"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      title="Import scores and notes from Excel file"
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Import Excel
                    </Button>

                    {/* Hidden file input for Excel import */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportExcel}
                      accept=".xlsx,.xls"
                      className="hidden"
                    />
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                {/* Only show Save button for new assessments */}
                {!id && (
                  <Button
                    className="bg-primary hover:bg-primary-dark text-white"
                    onClick={handleSaveAssessment}
                    disabled={createAssessmentMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Assessment
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Basic Info Section */}
          <CardContent className="border-b border-gray-200">
            <div className="space-y-4">
              {!id && (
                <>
                  <h3 className="text-lg font-medium text-text-primary">Assessment Information</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Getting Started:</strong> Fill in the basic information below and click "Create Assessment" to save.
                      After saving, you'll be able to evaluate the assessment metrics across different pillars and mechanisms.
                    </p>
                  </div>
                </>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="systemName">System Name *</Label>
                  <Input
                    id="systemName"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    placeholder="Enter system name"
                  />
                </div>
                <div>
                  <Label htmlFor="systemDescription">System Description</Label>
                  <Textarea
                    id="systemDescription"
                    value={systemDescription}
                    onChange={(e) => setSystemDescription(e.target.value)}
                    placeholder="Brief description of the system"
                    rows={3}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Assessment Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as "draft" | "in_progress" | "completed")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={isPublic ? "public" : "private"} onValueChange={(value) => setIsPublic(value === "public")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Progress Section */}
          {id && (
            <CardContent className="border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-text-primary">Assessment Progress</span>
                <span className="text-sm text-text-secondary">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full" data-testid="progress-bar" />
            </CardContent>
          )}

          {/* Pillar Navigation - Only show for existing assessments */}
          {id && (
            <CardContent className="border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {framework.map((pillar: PillarWithMechanisms, index: number) => {
                  const IconComponent = getPillarIcon(pillar.icon || undefined);
                  return (
                    <Button
                      key={pillar.id}
                      variant={index === activePillar ? "default" : "outline"}
                      onClick={() => setActivePillar(index)}
                      className={index === activePillar ? "bg-primary text-white" : ""}
                      data-testid="pillar-button"
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      {pillar.name}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          )}

          {/* Assessment Content - Only show for existing assessments */}
          {id && (
            <CardContent className="p-6">
            {currentPillar && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-medium text-text-primary">{currentPillar.name} Pillar</h4>
                    <p className="text-sm text-text-secondary mt-1">{currentPillar.description}</p>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h5 className="font-medium text-text-primary mb-3">Filter Metrics</h5>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label htmlFor="completion-filter" className="text-sm font-medium">Completion Status</Label>
                      <Select value={completionFilter} onValueChange={(value: "all" | "completed" | "not_completed") => setCompletionFilter(value)}>
                        <SelectTrigger className="w-40" id="completion-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="not_completed">Not Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type-filter" className="text-sm font-medium">Metric Type</Label>
                      <Select value={typeFilter} onValueChange={(value: "all" | "design" | "operational") => setTypeFilter(value)}>
                        <SelectTrigger className="w-40" id="type-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="operational">Operational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Mechanisms */}
                <div className="space-y-4">
                  {currentPillar.mechanisms.map((mechanism) => {
                    // Filter metrics based on selected filters
                    const filteredMetrics = mechanism.metrics.filter(metric => {
                      // Type filter
                      if (typeFilter !== "all" && metric.type !== typeFilter) {
                        return false;
                      }
                      
                      // Completion filter
                      if (completionFilter !== "all") {
                        const isAnswered = responses[metric.id] !== undefined;
                        const isCompleted = isAnswered;
                        
                        if (completionFilter === "completed" && !isCompleted) return false;
                        if (completionFilter === "not_completed" && isCompleted) return false;
                      }
                      
                      return true;
                    });

                    // Don't show mechanism if no metrics pass filters
                    if (filteredMetrics.length === 0) return null;

                    return (
                    <Collapsible
                      key={mechanism.id}
                      open={openMechanisms[mechanism.id]}
                      onOpenChange={() => toggleMechanism(mechanism.id)}
                    >
                      <div className="border border-gray-200 rounded-lg">
                        {/* Checkbox section - separate from button */}
                        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`exclude-${mechanism.id}`}
                              checked={excludedMechanisms[mechanism.id] || false}
                              onCheckedChange={() => toggleMechanismExclusion(mechanism.id)}
                            />
                            <Label
                              htmlFor={`exclude-${mechanism.id}`}
                              className="text-xs text-text-secondary cursor-pointer"
                            >
                              Exclude from assessment
                            </Label>
                            {excludedMechanisms[mechanism.id] && (
                              <Badge variant="secondary" className="text-xs">
                                Excluded
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Collapsible trigger button */}
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-4 h-auto text-left hover:bg-gray-50 rounded-none"
                            data-testid="mechanism-button"
                          >
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h5 className="font-medium text-text-primary">{mechanism.name}</h5>
                                  <p className="text-sm text-text-secondary mt-1">{mechanism.description}</p>
                                  {filteredMetrics.length !== mechanism.metrics.length && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      Showing {filteredMetrics.length} of {mechanism.metrics.length} metrics
                                    </p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-sm font-medium text-text-primary">
                                    {calculateMechanismScore(mechanism)}%
                                  </div>
                                  <div className="text-xs text-text-secondary">
                                    {calculateMechanismProgress(mechanism)}% complete
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                  <Progress
                                    value={calculateMechanismScore(mechanism)}
                                    className="h-2"
                                  />
                                </div>
                                <span className="text-xs text-text-secondary min-w-0">
                                  Score
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="flex-1">
                                  <Progress
                                    value={calculateMechanismProgress(mechanism)}
                                    className="h-1 opacity-60"
                                  />
                                </div>
                                <span className="text-xs text-text-secondary min-w-0">
                                  Progress
                                </span>
                              </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ml-2 ${openMechanisms[mechanism.id] ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      
                      <CollapsibleContent className="mt-2 border border-t-0 border-gray-200 rounded-b-lg p-4">
                        {/* Configuration Selectors */}
                        {((mechanism as any).operationalConfigurations?.length > 0 || (mechanism as any).designConfigurations?.length > 0) && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h6 className="text-sm font-medium text-text-primary mb-3">
                              Quick Configuration Presets
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Operational Configuration Selector */}
                              {(mechanism as any).operationalConfigurations?.length > 0 && (
                                <div>
                                  <Label htmlFor={`config-op-${mechanism.id}`} className="text-xs text-text-secondary mb-1 block">
                                    Operational Metrics Configuration
                                  </Label>
                                  <Select
                                    value={mechanismConfigurations[mechanism.id]?.operational?.toString() || "none"}
                                    onValueChange={(value) =>
                                      handleConfigurationChange(
                                        mechanism.id,
                                        'operational',
                                        value === "none" ? null : parseInt(value)
                                      )
                                    }
                                    disabled={!id}
                                  >
                                    <SelectTrigger id={`config-op-${mechanism.id}`} className="h-9 text-sm">
                                      <SelectValue placeholder="Select preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None (Manual)</SelectItem>
                                      {(mechanism as any).operationalConfigurations.map((config: any, idx: number) => (
                                        <SelectItem key={idx} value={idx.toString()}>
                                          {config.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {mechanismConfigurations[mechanism.id]?.operational !== undefined &&
                                   mechanismConfigurations[mechanism.id]?.operational !== null && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      {(mechanism as any).operationalConfigurations[mechanismConfigurations[mechanism.id].operational!].description}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Design Configuration Selector */}
                              {(mechanism as any).designConfigurations?.length > 0 && (
                                <div>
                                  <Label htmlFor={`config-design-${mechanism.id}`} className="text-xs text-text-secondary mb-1 block">
                                    Design Metrics Configuration
                                  </Label>
                                  <Select
                                    value={mechanismConfigurations[mechanism.id]?.design?.toString() || "none"}
                                    onValueChange={(value) =>
                                      handleConfigurationChange(
                                        mechanism.id,
                                        'design',
                                        value === "none" ? null : parseInt(value)
                                      )
                                    }
                                    disabled={!id}
                                  >
                                    <SelectTrigger id={`config-design-${mechanism.id}`} className="h-9 text-sm">
                                      <SelectValue placeholder="Select preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None (Manual)</SelectItem>
                                      {(mechanism as any).designConfigurations.map((config: any, idx: number) => (
                                        <SelectItem key={idx} value={idx.toString()}>
                                          {config.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {mechanismConfigurations[mechanism.id]?.design !== undefined &&
                                   mechanismConfigurations[mechanism.id]?.design !== null && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      {(mechanism as any).designConfigurations[mechanismConfigurations[mechanism.id].design!].description}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            {!id && (
                              <p className="text-xs text-text-secondary mt-2">
                                Save the assessment first to use configuration presets
                              </p>
                            )}
                          </div>
                        )}

                        {/* Metrics Navigation */}
                        {(() => {
                          const currentIndex = getCurrentMetricIndex(mechanism.id);
                          const metric = filteredMetrics[currentIndex];
                          const hasPrevious = currentIndex > 0;
                          const hasNext = currentIndex < filteredMetrics.length - 1;

                          if (!metric) return null;

                          return (
                            <div className="relative">
                              {/* Navigation Arrows */}
                              {filteredMetrics.length > 1 && (
                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigateMetric(mechanism.id, 'prev', filteredMetrics.length - 1)}
                                    disabled={!hasPrevious}
                                    className="flex items-center gap-2"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="text-xs">
                                      {hasPrevious ? `${currentIndex} previous` : 'No previous'}
                                    </span>
                                  </Button>

                                  <span className="text-sm text-text-secondary font-medium">
                                    Metric {currentIndex + 1} of {filteredMetrics.length}
                                  </span>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigateMetric(mechanism.id, 'next', filteredMetrics.length - 1)}
                                    disabled={!hasNext}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="text-xs">
                                      {hasNext ? `${filteredMetrics.length - currentIndex - 1} next` : 'No next'}
                                    </span>
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}

                              {/* Current Metric */}
                              <div className="border-l-4 border-blue-200 pl-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h6 className="font-medium text-text-primary">{metric.name}</h6>
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {metric.code}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => setMetricInfoDialog({ open: true, metric })}
                                        title="View metric details"
                                      >
                                        <Info className="h-4 w-4 text-blue-600" />
                                      </Button>
                                    </div>
                                    <p className="text-sm text-text-secondary mt-1">{metric.description}</p>
                                    <div className="flex items-center space-x-2 mt-1 flex-wrap">
                                      <Badge
                                        variant={metric.type === "design" ? "default" : "secondary"}
                                      >
                                        {metric.type === "design" ? "Design Metric" : "Operational Metric"}
                                      </Badge>
                                      {metric.standards && metric.standards.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {metric.standards.map((standard: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                              {standard}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right ml-2 flex-shrink-0">
                                    <div className="text-sm font-medium text-text-primary">
                                      {calculateMetricScore(metric).toFixed(0)}%
                                    </div>
                                    <div className="text-xs text-text-secondary">
                                      {responses[metric.id] !== undefined ? "Answered" : "Not answered"}
                                    </div>
                                  </div>
                                </div>

                                {/* Metric Assessment Input */}
                                <div className="bg-gray-50 rounded-md p-4 mt-3">
                                  <Label className="text-sm font-medium text-text-primary mb-3 block">
                                    Assessment Value
                                  </Label>

                                  {metric.metricType === "boolean" ? (
                                    <RadioGroup
                                      value={responses[metric.id]?.answer?.toString() || ""}
                                      onValueChange={(value) =>
                                        handleResponseChange(metric.id, metric, value === "true")
                                      }
                                    >
                                      <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="true" id={`${metric.id}-yes`} data-testid="yes-button" />
                                          <Label htmlFor={`${metric.id}-yes`} className="text-sm font-medium cursor-pointer">
                                            Yes / Implemented
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="false" id={`${metric.id}-no`} data-testid="no-button" />
                                          <Label htmlFor={`${metric.id}-no`} className="text-sm font-medium cursor-pointer">
                                            No / Not Implemented
                                          </Label>
                                        </div>
                                      </div>
                                    </RadioGroup>
                                  ) : (
                                    <PercentageSlider
                                      value={responses[metric.id]?.answerValue || 0}
                                      onChange={(value) => handleResponseChange(metric.id, metric, value)}
                                      disabled={!id}
                                    />
                                  )}

                                  {!id && (
                                    <p className="text-xs text-text-secondary mt-2">
                                      Save the assessment first to record responses
                                    </p>
                                  )}
                                </div>

                                {/* Metric Notes */}
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <Label htmlFor={`metric-notes-${metric.id}`} className="text-sm font-medium text-text-primary mb-2 block">
                                    Notes & Justification (Optional)
                                  </Label>
                                  <Textarea
                                    id={`metric-notes-${metric.id}`}
                                    placeholder="Add notes or justification for your answers to this metric..."
                                    value={metricNotes[metric.id] || ""}
                                    onChange={(e) => handleMetricNoteChange(metric.id, e.target.value)}
                                    className="min-h-[60px] text-sm"
                                    disabled={!id} // Only allow notes when editing existing assessment
                                  />
                                  {!id && (
                                    <p className="text-xs text-text-secondary mt-1">
                                      Save the assessment first to add notes
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CollapsibleContent>
                    </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}
            </CardContent>
          )}
        </Card>
      </main>

      {/* Metric Info Dialog */}
      <Dialog open={metricInfoDialog.open} onOpenChange={(open) => setMetricInfoDialog({ open, metric: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{metricInfoDialog.metric?.name}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {metricInfoDialog.metric?.code}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-text-secondary mb-2">Description</h4>
              <p className="text-text-primary">{metricInfoDialog.metric?.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-text-secondary mb-2">Type</h4>
                <Badge variant={metricInfoDialog.metric?.type === "design" ? "default" : "secondary"}>
                  {metricInfoDialog.metric?.type === "design" ? "Design Metric" : "Operational Metric"}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-text-secondary mb-2">Metric Type</h4>
                <Badge variant="outline">
                  {metricInfoDialog.metric?.metricType === "boolean" ? "Yes/No" : "Percentage"}
                </Badge>
              </div>
            </div>

            {metricInfoDialog.metric?.standards && metricInfoDialog.metric.standards.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-text-secondary mb-2">Related Standards</h4>
                <div className="flex flex-wrap gap-2">
                  {metricInfoDialog.metric.standards.map((standard: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700">
                      {standard}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm text-text-secondary mb-2">Scoring Impact</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-text-secondary">Pillar Cap:</span>
                  <span className="ml-2 font-medium">{metricInfoDialog.metric?.pillarCap}%</span>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-text-secondary">Mechanism Cap:</span>
                  <span className="ml-2 font-medium">{metricInfoDialog.metric?.mechanismCap}%</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
